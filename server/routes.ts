import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, csrfProtection, hashPassword, generateCsrfToken } from "./auth";
import { 
  sendPasswordResetEmail, 
  sendQuoteSignedNotification, 
  sendQuoteSignedConfirmation,
  sendEmail
} from "./email";
import { syncAllCollaboratorAssignments } from "./utils/sync-collaboratori";
import { syncAllEventData } from "./utils/migrate-eventi-data";
import { runMigration } from "./utils/run-migration";
import { createItalianTables } from "./utils/create-italian-tables";
import { updateEventCollaboratorsTable } from "./utils/update-event-collaborators";
import { setupUploadRoutes } from "./upload";
import bundleLeadsRouter from "./routes/bundle-leads";
import settingsRouter from "./routes/settings";
import financeRouter from "./routes/finance";
import galleryRouter from "./routes/gallery";
import searchRouter from "./routes/search";
import selectionRouter from "./routes/selection";
import clausesRouter from "./routes/clauses";
import notificationsRouter from "./routes/notifications";
import collaboratorsRouter from "./routes/collaborators-routes";
import collaboratoriRouter from "./routes/collaboratori-routes"; // Manteniamo temporaneamente fino alla migrazione completa
import eventiRouter from "./routes/eventi-routes";
import eventsRouter from "./routes/events-routes"; // English standardized version
import dashboardPublicRouter from "./routes/dashboard-public-routes";
import { handleFileUpload, importClients, importDirectClients, exportClientsCSV } from "./import-export";
import { checkExistingClient, searchClients } from "./controllers/client-validation-controller";
import multer from "multer";
import { tmpdir } from "os";
import { join } from "path";
import {
  connectGoogleCalendar,
  googleAuthCallback,
  syncEventToGoogle,
  deleteEventFromGoogle,
  syncAllEvents,
  importGoogleEvents,
  getGoogleAuthStatus,
  toggleGoogleSync
} from './controllers/google-calendar-controller';

import { 
  insertClientSchema, 
  insertEventSchema,
  partialEventSchema, 
  insertTaskSchema, 
  insertCollaboratorSchema,
  insertEventCollaboratorSchema,
  insertContractSchema,
  insertServiceSchema,
  insertQuoteSchema,
  insertQuoteItemSchema,
  insertSettingsSchema,
  insertServiceCategorySchema,
  insertLeadSourceSchema,
  insertServiceBundleSchema,
  insertServiceBundleItemSchema,
  insertServiceItemSchema
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Crea le tabelle italiane temporanee necessarie per la migrazione
  try {
    await createItalianTables();
    console.log("✅ Tabelle italiane create o verificate con successo");
  } catch (error) {
    console.error("❌ Errore nella creazione delle tabelle italiane:", error);
  }
  
  // Aggiorna la tabella event_collaborators con le colonne mancanti
  try {
    await updateEventCollaboratorsTable();
    console.log("✅ Tabella event_collaborators aggiornata con successo");
  } catch (error) {
    console.error("❌ Errore nell'aggiornamento della tabella event_collaborators:", error);
  }

  // Setup API routes
  const apiRouter = express.Router();
  
  // Endpoint per generare un token CSRF - non richiede autenticazione
  apiRouter.get('/csrf-token', (req, res) => {
    try {
      const token = generateCsrfToken();
      
      // Salviamo il token nella sessione per verifica
      // Nota: questo step non è strettamente necessario poiché 
      // la verifica CSRF avviene usando il segreto lato server
      // come un salt - ma può essere utile per debugging
      res.json({ token });
    } catch (error) {
      console.error('Errore nella generazione del token CSRF:', error);
      res.status(500).json({ message: 'Errore nella generazione del token di sicurezza' });
    }
  });

  // Aggiungi il middleware di protezione CSRF a tutte le rotte POST, PUT, DELETE
  // Solo per le rotte di modifica dati in modo da prevenire attacchi CSRF
  apiRouter.use(csrfProtection);

  // Client routes
  apiRouter.get("/clients", async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  apiRouter.get("/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Prima proviamo con il metodo standard
      let client = await storage.getClient(id);
      
      // Se non abbiamo trovato il cliente, proviamo con una query SQL diretta
      if (!client) {
        console.log(`Cliente con ID ${id} non trovato con metodo standard, provo con SQL diretto`);
        
        // Usa pgClient per query diretta
        const directResult = await pgClient`
          SELECT * FROM clients WHERE id = ${id}
        `;
        
        console.log(`Risultato ricerca diretta per cliente ID ${id}:`, directResult);
        
        if (directResult && directResult.length > 0) {
          // Converti da snake_case a camelCase
          client = {
            id: directResult[0].id,
            firstName: directResult[0].first_name,
            lastName: directResult[0].last_name,
            email: directResult[0].email,
            phone: directResult[0].phone || "",
            address: directResult[0].address || "",
            company: directResult[0].company || "",
            postalCode: directResult[0].postal_code || "",
            city: directResult[0].city || "",
            province: directResult[0].province || "",
            state: directResult[0].state || "",
            taxCode: directResult[0].tax_code || "",
            notes: directResult[0].notes || "",
            createdAt: directResult[0].created_at,
            updatedAt: directResult[0].updated_at,
          };
        }
      }

      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json(client);
    } catch (err) {
      console.error(`Errore nel recupero del cliente:`, err);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  apiRouter.post("/clients", async (req, res) => {
    try {
      const parseResult = insertClientSchema.safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const client = await storage.createClient(parseResult.data);
      res.status(201).json(client);
    } catch (err) {
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  apiRouter.put("/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parseResult = insertClientSchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const updatedClient = await storage.updateClient(id, parseResult.data);

      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json(updatedClient);
    } catch (err) {
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  apiRouter.delete("/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteClient(id);

      if (!success) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Event routes
  apiRouter.get("/events", async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (err) {
      console.error("Error fetching events:", err);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  apiRouter.get("/events/upcoming", async (req, res) => {
    try {
      const events = await storage.getUpcomingEvents();
      res.json(events);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });

apiRouter.get("/events/client/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const events = await storage.getEventsByClient(clientId);
      res.json(events);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch client events" });
    }
  });

  apiRouter.get("/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json(event);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  apiRouter.post("/events", async (req, res) => {
    try {
      // Estrai collaborators dalla richiesta e rimuovilo prima della validazione
      const { collaborators, ...eventData } = req.body;

      console.log("Ricevuti dati evento:", eventData);

      // Converti manualmente le date in oggetti Date
      const processedData = {
        ...eventData,
        date: eventData.date ? new Date(eventData.date) : undefined,
        endDate: eventData.endDate ? new Date(eventData.endDate) : undefined
      };

      const parseResult = insertEventSchema.safeParse(processedData);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        console.error("Error parsing event data:", errorMessage);
        return res.status(400).json({ message: errorMessage });
      }

      // Verifica che il cliente esista solo se l'ID del cliente è maggiore di 0
      if (parseResult.data.clientId > 0) {
        const client = await storage.getClient(parseResult.data.clientId);
        if (!client) {
          console.error("Client not found with ID:", parseResult.data.clientId);
          return res.status(400).json({ message: "Client not found" });
        }
      }

      // Crea l'evento
      const event = await storage.createEvent(parseResult.data);
      console.log("Evento creato:", event);

      // Se ci sono collaboratori, assegnali all'evento
      if (collaborators && Array.isArray(collaborators) && collaborators.length > 0) {
        for (const collaborator of collaborators) {
          // Verifica che il collaboratore esista
          const collaboratorExists = await storage.getCollaborator(collaborator.id);
          if (collaboratorExists) {
            await storage.assignCollaboratorToEvent({
              eventId: event.id,
              collaboratorId: collaborator.id,
              role: collaborator.role
            });
          }
        }
      }

      res.status(201).json(event);
    } catch (err) {
      console.error("Error creating event:", err);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  apiRouter.put("/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parseResult = partialEventSchema.safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // If clientId is provided, verify client exists
      if (parseResult.data.clientId) {
        const client = await storage.getClient(parseResult.data.clientId);
        if (!client) {
          return res.status(400).json({ message: "Client not found" });
        }
      }

      const updatedEvent = await storage.updateEvent(id, parseResult.data);

      if (!updatedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json(updatedEvent);
    } catch (err) {
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  apiRouter.delete("/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Delete all related tasks
      const tasks = await storage.getTasksByEvent(id);
      for (const task of tasks) {
        await storage.deleteTask(task.id);
      }

      // Delete all collaborator assignments
      const collaborators = await storage.getCollaboratorsByEvent(id);
      for (const collab of collaborators) {
        await storage.removeCollaboratorFromEvent(id, collab.id);
      }

      // Delete the event itself
      const success = await storage.deleteEvent(id);

      if (!success) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Task routes
  apiRouter.get("/tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  apiRouter.get("/tasks/uncompleted", async (req, res) => {
    try {
      const tasks = await storage.getUncompletedTasks();
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch uncompleted tasks" });
    }
  });

  apiRouter.get("/tasks/event/:eventId", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const tasks = await storage.getTasksByEvent(eventId);
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch event tasks" });
    }
  });

  apiRouter.get("/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  apiRouter.post("/tasks", async (req, res) => {
    try {
      const parseResult = insertTaskSchema.safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // If eventId is provided, verify event exists
      if (parseResult.data.eventId) {
        const event = await storage.getEvent(parseResult.data.eventId);
        if (!event) {
          return res.status(400).json({ message: "Event not found" });
        }
      }

      const task = await storage.createTask(parseResult.data);
      res.status(201).json(task);
    } catch (err) {
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  apiRouter.put("/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parseResult = insertTaskSchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // If eventId is provided, verify event exists
      if (parseResult.data.eventId) {
        const event = await storage.getEvent(parseResult.data.eventId);
        if (!event) {
          return res.status(400).json({ message: "Event not found" });
        }
      }

      const updatedTask = await storage.updateTask(id, parseResult.data);

      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(updatedTask);
    } catch (err) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  apiRouter.put("/tasks/:id/toggle", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedTask = await storage.toggleTaskCompletion(id);

      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(updatedTask);
    } catch (err) {
      res.status(500).json({ message: "Failed to toggle task completion" });
    }
  });

  apiRouter.delete("/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTask(id);

      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Collaborator routes
  apiRouter.get("/collaborators", async (req, res) => {
    try {
      const collaborators = await storage.getAllCollaborators();
      res.json(collaborators);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch collaborators" });
    }
  });

  apiRouter.get("/collaborators/available", async (req, res) => {
    try {
      const collaborators = await storage.getAvailableCollaborators();
      res.json(collaborators);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch available collaborators" });
    }
  });

  apiRouter.get("/collaborators/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const collaborator = await storage.getCollaborator(id);

      if (!collaborator) {
        return res.status(404).json({ message: "Collaborator not found" });
      }

      res.json(collaborator);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch collaborator" });
    }
  });

  apiRouter.post("/collaborators", async (req, res) => {
    try {
      const parseResult = insertCollaboratorSchema.safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const collaborator = await storage.createCollaborator(parseResult.data);
      res.status(201).json(collaborator);
    } catch (err) {
      res.status(500).json({ message: "Failed to create collaborator" });
    }
  });

  apiRouter.put("/collaborators/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parseResult = insertCollaboratorSchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const updatedCollaborator = await storage.updateCollaborator(id, parseResult.data);

      if (!updatedCollaborator) {
        return res.status(404).json({ message: "Collaborator not found" });
      }

      res.json(updatedCollaborator);
    } catch (err) {
      res.status(500).json({ message: "Failed to update collaborator" });
    }
  });

  apiRouter.delete("/collaborators/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCollaborator(id);

      if (!success) {
        return res.status(404).json({ message: "Collaborator not found" });
      }

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete collaborator" });
    }
  });

  // Event Collaborator routes
  apiRouter.get("/events/:eventId/collaborators", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const collaborators = await storage.getCollaboratorsByEvent(eventId);
      res.json(collaborators);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch event collaborators" });
    }
  });

  // Get events associated with a collaborator
  apiRouter.get("/collaborators/:collaboratorId/events", async (req, res) => {
    try {
      const collaboratorId = parseInt(req.params.collaboratorId);

      // Verifica che il collaboratore esista
      const collaborator = await storage.getCollaborator(collaboratorId);
      if (!collaborator) {
        return res.status(404).json({ message: "Collaborator not found" });
      }

      // Ottieni tutti gli eventi che hanno questo collaboratore
      const events = await storage.getEventsByCollaborator(collaboratorId);
      res.json(events);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch collaborator events" });
    }
  });

  apiRouter.post("/events/:eventId/collaborators", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const parseResult = insertEventCollaboratorSchema.safeParse({
        ...req.body,
        eventId
      });

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Verify event and collaborator exist
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(400).json({ message: "Event not found" });
      }

      const collaborator = await storage.getCollaborator(parseResult.data.collaboratorId);
      if (!collaborator) {
        return res.status(400).json({ message: "Collaborator not found" });
      }

      const eventCollaborator = await storage.assignCollaboratorToEvent(parseResult.data);
      res.status(201).json(eventCollaborator);
    } catch (err) {
      res.status(500).json({ message: "Failed to assign collaborator to event" });
    }
  });

  apiRouter.delete("/events/:eventId/collaborators/:collaboratorId", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const collaboratorId = parseInt(req.params.collaboratorId);

      const success = await storage.removeCollaboratorFromEvent(eventId, collaboratorId);

      if (!success) {
        return res.status(404).json({ message: "Event collaborator not found" });
      }

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to remove collaborator from event" });
    }
  });

  // Contract routes
  apiRouter.get("/contracts", async (req, res) => {
    try {
      const contracts = await storage.getAllContracts();
      res.json(contracts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  apiRouter.get("/contracts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contract = await storage.getContract(id);

      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      res.json(contract);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  apiRouter.get("/contracts/client/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const contracts = await storage.getContractsByClient(clientId);
      res.json(contracts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch client contracts" });
    }
  });

  apiRouter.get("/contracts/event/:eventId", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const contracts = await storage.getContractsByEvent(eventId);
      res.json(contracts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch event contracts" });
    }
  });

  apiRouter.post("/contracts", async (req, res) => {
    try {
      const parseResult = insertContractSchema.safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Verify client and event exist
      const client = await storage.getClient(parseResult.data.clientId);
      if (!client) {
        return res.status(400).json({ message: "Client not found" });
      }

      const event = await storage.getEvent(parseResult.data.eventId);
      if (!event) {
        return res.status(400).json({ message: "Event not found" });
      }

      const contract = await storage.createContract(parseResult.data);
      res.status(201).json(contract);
    } catch (err) {
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  apiRouter.put("/contracts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parseResult = insertContractSchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // If clientId is provided, verify client exists
      if (parseResult.data.clientId) {
        const client = await storage.getClient(parseResult.data.clientId);
        if (!client) {
          return res.status(400).json({ message: "Client not found" });
        }
      }

      // If eventId is provided, verify event exists
      if (parseResult.data.eventId) {
        const event = await storage.getEvent(parseResult.data.eventId);
        if (!event) {
          return res.status(400).json({ message: "Event not found" });
        }
      }

      const updatedContract = await storage.updateContract(id, parseResult.data);

      if (!updatedContract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      res.json(updatedContract);
    } catch (err) {
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  apiRouter.delete("/contracts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteContract(id);

      if (!success) {
        return res.status(404).json({ message: "Contract not found" });
      }

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Service routes
  apiRouter.get("/services", async (req, res) => {
    try {
      console.log("Fetching all services...");
      const services = await storage.getAllServices();
      console.log("Services fetched:", services);
      res.json(services);
    } catch (err) {
      console.error("Error fetching services:", err);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  // Products route - Recupera solo servizi di tipo "product"
  apiRouter.get("/products", async (req, res) => {
    try {
      console.log("Fetching only products...");
      const services = await storage.getAllServices();
      const products = services.filter(service => service.type === 'product');
      console.log(`Filtered ${products.length} products from ${services.length} services`);
      res.json(products);
    } catch (err) {
      console.error("Error fetching products:", err);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  apiRouter.get("/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const service = await storage.getService(id);

      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      res.json(service);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  apiRouter.post("/services", async (req, res) => {
    try {
      console.log("Creating new service with data:", req.body);

      const parseResult = insertServiceSchema.safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        console.error("Validation error:", parseResult.error);
        return res.status(400).json({ message: errorMessage });
      }

      console.log("Validated data:", parseResult.data);

      const service = await storage.createService(parseResult.data);
      console.log("Service created successfully:", service);

      res.status(201).json(service);
    } catch (err) {
      console.error("Error creating service:", err);
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  apiRouter.put("/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Updating service ${id} with data:`, req.body);

      const parseResult = insertServiceSchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        console.error("Validation error:", parseResult.error);
        return res.status(400).json({ message: errorMessage });
      }

      console.log("Validated data:", parseResult.data);

      // Get the current service to check for image path
      const currentService = await storage.getService(id);
      if (!currentService) {
        return res.status(404).json({ message: "Service not found" });
      }

      // Ensure imagePath is preserved if not explicitly updated
      const dataToUpdate = { ...parseResult.data };
      if (!dataToUpdate.imagePath && currentService.imagePath) {
        console.log("Preserving existing image path:", currentService.imagePath);
        dataToUpdate.imagePath = currentService.imagePath;
      }

      const updatedService = await storage.updateService(id, dataToUpdate);

      if (!updatedService) {
        return res.status(404).json({ message: "Service not found" });
      }

      console.log("Service updated successfully:", updatedService);
      res.json(updatedService);
    } catch (err) {
      console.error("Error updating service:", err);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  apiRouter.delete("/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteService(id);

      if (!success) {
        return res.status(404).json({ message: "Service not found" });
      }

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // Service Items routes - per servizi compositi
  apiRouter.get("/service-items/:serviceId", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const items = await storage.getServiceItems(serviceId);
      res.json(items);
    } catch (err) {
      console.error("Error fetching service items:", err);
      res.status(500).json({ message: "Failed to fetch service items" });
    }
  });

  apiRouter.post("/service-items", async (req, res) => {
    try {
      const parseResult = insertServiceItemSchema.safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Verifica che esistano sia il servizio che il prodotto
      const service = await storage.getService(parseResult.data.serviceId);
      if (!service) {
        return res.status(400).json({ message: "Service not found" });
      }

      const product = await storage.getService(parseResult.data.productId);
      if (!product) {
        return res.status(400).json({ message: "Product not found" });
      }

      // Verifica che il prodotto sia di tipo 'product'
      if (product.type !== 'product') {
        return res.status(400).json({ message: "Selected item is not a product" });
      }

      // Imposta il servizio come composito se non lo è già
      if (!service.isComposite) {
        await storage.updateService(service.id, { isComposite: true });
      }

      const item = await storage.createServiceItem(parseResult.data);
      res.status(201).json(item);
    } catch (err) {
      console.error("Error creating service item:", err);
      res.status(500).json({ message: "Failed to create service item" });
    }
  });

  apiRouter.put("/service-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parseResult = insertServiceItemSchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Se viene aggiornato productId, verifica che il prodotto esista
      if (parseResult.data.productId) {
        const product = await storage.getService(parseResult.data.productId);
        if (!product) {
          return res.status(400).json({ message: "Product not found" });
        }

        // Verifica che il prodotto sia di tipo 'product'
        if (product.type !== 'product') {
          return res.status(400).json({ message: "Selected item is not a product" });
        }
      }

      const updatedItem = await storage.updateServiceItem(id, parseResult.data);

      if (!updatedItem) {
        return res.status(404).json({ message: "Service item not found" });
      }

      res.json(updatedItem);
    } catch (err) {
      console.error("Error updating service item:", err);
      res.status(500).json({ message: "Failed to update service item" });
    }
  });

  apiRouter.delete("/service-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getServiceItem(id);

      if (!item) {
        return res.status(404).json({ message: "Service item not found" });
      }

      const success = await storage.deleteServiceItem(id);

      if (!success) {
        return res.status(500).json({ message: "Failed to delete service item" });
      }

      // Controlla se il servizio ha ancora elementi, se no, imposta isComposite a false
      const remainingItems = await storage.getServiceItems(item.serviceId);
      if (remainingItems.length === 0) {
        await storage.updateService(item.serviceId, { isComposite: false });
      }

      res.status(204).send();
    } catch (err) {
      console.error("Error deleting service item:", err);
      res.status(500).json({ message: "Failed to delete service item" });
    }
  });

  // Service Bundle routes
  apiRouter.get("/service-bundles", async (req, res) => {
    try {
      const bundles = await storage.getAllServiceBundles();
      res.json(bundles);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch service bundles" });
    }
  });

  apiRouter.get("/service-bundles/category/:categoryId", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const bundles = await storage.getServiceBundlesByCategory(categoryId);
      res.json(bundles);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch service bundles by category" });
    }
  });

  apiRouter.get("/service-bundles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bundle = await storage.getServiceBundle(id);

      if (!bundle) {
        return res.status(404).json({ message: "Service bundle not found" });
      }

      res.json(bundle);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch service bundle" });
    }
  });

  apiRouter.post("/service-bundles", async (req, res) => {
    try {
      console.log("Creating new service bundle with data:", req.body);

      const parseResult = insertServiceBundleSchema.safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        console.error("Validation error:", parseResult.error);
        return res.status(400).json({ message: errorMessage });
      }

      console.log("Validated data:", parseResult.data);

      const bundle = await storage.createServiceBundle(parseResult.data);
      console.log("Service bundle created successfully:", bundle);

      res.status(201).json(bundle);
    } catch (err) {
      console.error("Error creating service bundle:", err);
      res.status(500).json({ message: "Failed to create service bundle" });
    }
  });

  apiRouter.put("/service-bundles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Updating service bundle ${id} with data:`, req.body);

      const parseResult = insertServiceBundleSchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        console.error("Validation error:", parseResult.error);
        return res.status(400).json({ message: errorMessage });
      }

      console.log("Validated data:", parseResult.data);

      // Get the current bundle to check for image path and template style
      const currentBundle = await storage.getServiceBundle(id);
      if (!currentBundle) {
        return res.status(404).json({ message: "Service bundle not found" });
      }

      // Ensure imagePath and templateStyle are preserved if not explicitly updated
      const dataToUpdate = { ...parseResult.data };

      if (!dataToUpdate.imagePath && currentBundle.imagePath) {
        console.log("Preserving existing image path:", currentBundle.imagePath);
        dataToUpdate.imagePath = currentBundle.imagePath;
      }

      // Assicurati che templateStyle sia preservato se non esplicitamente aggiornato
      if (!dataToUpdate.templateStyle && currentBundle.templateStyle) {
        console.log("Preserving existing template style:", currentBundle.templateStyle);
        dataToUpdate.templateStyle = currentBundle.templateStyle;
      }

      const updatedBundle = await storage.updateServiceBundle(id, dataToUpdate);

      if (!updatedBundle) {
        return res.status(404).json({ message: "Service bundle not found" });
      }

      console.log("Service bundle updated successfully:", updatedBundle);
      res.json(updatedBundle);
    } catch (err) {
      console.error("Error updating service bundle:", err);
      res.status(500).json({ message: "Failed to update service bundle" });
    }
  });

  apiRouter.delete("/service-bundles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteServiceBundle(id);

      if (!success) {
        return res.status(404).json({ message: "Service bundle not found" });
      }

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete service bundle" });
    }
  });

  // Service Bundle Items routes
  apiRouter.get("/service-bundles/:bundleId/items", async (req, res) => {
    try {
      const bundleId = parseInt(req.params.bundleId);
      const items = await storage.getServiceBundleItems(bundleId);
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch service bundle items" });
    }
  });

  apiRouter.post("/service-bundle-items", async (req, res) => {
    try {
      const parseResult = insertServiceBundleItemSchema.safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const item = await storage.createServiceBundleItem(parseResult.data);
      res.status(201).json(item);
    } catch (err) {
      res.status(500).json({ message: "Failed to create service bundle item" });
    }
  });

  apiRouter.put("/service-bundle-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parseResult = insertServiceBundleItemSchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const updatedItem = await storage.updateServiceBundleItem(id, parseResult.data);

      if (!updatedItem) {
        return res.status(404).json({ message: "Service bundle item not found" });
      }

      res.json(updatedItem);
    } catch (err) {
      res.status(500).json({ message: "Failed to update service bundle item" });
    }
  });

  apiRouter.delete("/service-bundle-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteServiceBundleItem(id);

      if (!success) {
        return res.status(404).json({ message: "Service bundle item not found" });
      }

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete service bundle item" });
    }
  });

  // Quote routes
  apiRouter.get("/quotes", async (req, res) => {
    try {
      const quotes = await storage.getAllQuotes();
      res.json(quotes);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  // API per recuperare un preventivo in base all'ID dell'evento associato
  // Nota: questa rotta deve venire PRIMA della rotta parametrica /:id
  apiRouter.get("/quotes/by-event/:eventId", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);

      // Trova l'evento per verificare se esiste
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento non trovato" });
      }

      // Se l'evento ha un quoteId, recupera il preventivo
      if (event.quoteId) {
        const quote = await storage.getQuote(event.quoteId);
        if (!quote) {
          return res.status(404).json({ message: "Preventivo non trovato" });
        }
        return res.json(quote);
      }

      // Verifica se c'è un preventivo che ha questo eventId
      const quotes = await storage.getAllQuotes();
      const associatedQuote = quotes.find(q => q.eventId === eventId);

      if (associatedQuote) {
        return res.json(associatedQuote);
      }

      // Nessun preventivo associato
      return res.status(404).json({ message: "Nessun preventivo associato a questo evento" });
    } catch (err) {
      console.error("Errore nel recuperare preventivo per evento:", err);
      res.status(500).json({ message: "Errore nel recuperare il preventivo" });
    }
  });

  apiRouter.get("/quotes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quote = await storage.getQuote(id);

      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Recupera il client
      const client = quote.clientId ? await storage.getClient(quote.clientId) : null;
      
      // Recupera il secondo client se presente
      const secondClient = quote.secondClientId ? await storage.getClient(quote.secondClientId) : null;
      
      // Per la categoria, la recupereremo in un secondo momento se necessario
      const category = null; // Non abbiamo una funzione getQuoteCategory
      
      // Recupera gli item del preventivo
      const quoteItems = await storage.getQuoteItemsByQuote(id);
      
      // Arricchisci gli item con i dettagli dei servizi
      const enrichedQuoteItems = await Promise.all(
        quoteItems.map(async (item) => {
          let enrichedItem = { ...item };
          
          if (item.serviceId) {
            const service = await storage.getService(item.serviceId);
            if (service) {
              enrichedItem = {
                ...enrichedItem,
                serviceName: service.name,
                serviceDescription: service.description,
                serviceImagePath: service.imagePath
              };
            }
          }
          
          if (item.bundleId) {
            const bundle = await storage.getServiceBundle(item.bundleId);
            if (bundle) {
              enrichedItem = {
                ...enrichedItem,
                bundleName: bundle.name,
                bundleDescription: bundle.description,
                bundleImagePath: bundle.imagePath
              };
            }
          }
          
          return enrichedItem;
        })
      );
      
      // Recupera i moduli del preventivo
      const modules = await storage.getModulesByQuote(id);
      
      // Arricchisci i moduli con i loro elementi
      const enrichedModules = await Promise.all(
        modules.map(async (module) => {
          const items = await storage.getQuoteModuleItemsByModule(module.id);
          
          // Arricchisci ogni elemento del modulo con dettagli aggiuntivi
          const enrichedItems = await Promise.all(
            items.map(async (item) => {
              let enrichedItem = { ...item };
              
              // Se l'item ha un serviceId, aggiungi i dettagli del servizio
              if (item.serviceId) {
                const service = await storage.getService(item.serviceId);
                if (service) {
                  enrichedItem = {
                    ...enrichedItem,
                    serviceName: service.name,
                    serviceDescription: service.description,
                    serviceImagePath: service.imagePath
                  };
                }
              }
              
              // Se l'item ha un bundleId, aggiungi i dettagli del bundle
              if (item.bundleId) {
                const bundle = await storage.getServiceBundle(item.bundleId);
                if (bundle) {
                  enrichedItem = {
                    ...enrichedItem,
                    bundleName: bundle.name,
                    bundleDescription: bundle.description,
                    bundleImagePath: bundle.imagePath
                  };
                }
              }
              
              return enrichedItem;
            })
          );
          
          // Restituisci il modulo con i suoi elementi
          return {
            ...module,
            items: enrichedItems,
            minSelectCount: module.minSelectCount !== undefined ? module.minSelectCount : 0,
            maxSelectCount: module.maxSelectCount !== undefined ? module.maxSelectCount : null
          };
        })
      );
      
      // --- inizio patch totale server ---
      // Calcola la somma di quoteItems (servizi fissi)
      const itemsSum = enrichedQuoteItems.reduce(
        (s, item) => s + (item.unitPrice || item.total || 0) * (item.quantity || 1),
        0
      );
      // Calcola la somma di tutti gli items in tutti i moduli
      const modulesSum = enrichedModules
        .flatMap(m => m.items)
        .reduce(
          (s, it) => s + (it.unitPrice || it.total || 0) * (it.selectedQuantity || 1),
          0
        );
      // --- fine patch totale server ---
      
      // Prepara l'oggetto completo del preventivo con tutte le informazioni
      const completeQuote = {
        ...quote,
        quoteItems: enrichedQuoteItems,
        client: client || undefined,
        secondClient: secondClient || undefined,
        category: category || undefined,
        modules: enrichedModules,
        modulesSum: modulesSum,
        itemsSum: itemsSum,
        total: itemsSum + modulesSum
      };
      
      res.json(completeQuote);
    } catch (err) {
      console.error("Errore nel recupero del preventivo:", err);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  apiRouter.get("/quotes/client/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const quotes = await storage.getQuotesByClient(clientId);
      res.json(quotes);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch client quotes" });
    }
  });

  apiRouter.get("/quotes/:quoteId/items", async (req, res) => {
    try {
      const quoteId = parseInt(req.params.quoteId);
      const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
      res.json(quoteItems);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch quote items" });
    }
  });

  apiRouter.post("/quotes", async (req, res) => {
    try {
      // Estrai campi speciali per la gestione della conversione evento -> preventivo e moduli
      const { eventDate, _convertAndDelete, _originalEventId, modules = [], ...rest } = req.body;

      // Filtra solo i campi validi per lo schema del preventivo
      const parseResult = insertQuoteSchema.safeParse({
        ...rest,
        eventDate: eventDate ? new Date(eventDate) : undefined
      });

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Verify client exists
      const client = await storage.getClient(parseResult.data.clientId);
      if (!client) {
        return res.status(400).json({ message: "Client not found" });
      }

      // If eventId is provided, verify event exists
      if (parseResult.data.eventId) {
        const event = await storage.getEvent(parseResult.data.eventId);
        if (!event) {
          return res.status(400).json({ message: "Event not found" });
        }
      }

      // Utilizziamo la nuova funzione createQuoteWithModules per garantire l'atomicità dell'operazione
      const { quote, modules: createdModules } = await storage.createQuoteWithModules(
        parseResult.data,
        Array.isArray(modules) ? modules : []
      );

      // Se c'è un evento associato al preventivo, gestisci la relazione
      if (quote && parseResult.data.eventId) {
        console.log(`Aggiornamento evento ID ${parseResult.data.eventId} con preventivo ID ${quote.id}`);
        // Aggiorna l'evento con il preventivo appena creato
        await storage.updateEvent(parseResult.data.eventId, {
          quoteId: quote.id
        });
      }

      // Se richiesto, elimina l'evento originale (conversione)
      if (_convertAndDelete && _originalEventId) {
        try {
          console.log(`Richiesta conversione: eliminazione evento ID ${_originalEventId}`);

          // Verifica se l'evento esiste
          const event = await storage.getEvent(parseInt(_originalEventId));
          if (event) {
            // Prima elimina tutti gli elementi correlati (collaboratori, attività, ecc.)
            // Questo dipende da come è strutturato lo storage

            // Elimina le attività associate all'evento
            const tasks = await storage.getTasksByEvent(parseInt(_originalEventId));
            for (const task of tasks) {
              await storage.deleteTask(task.id);
            }

            // Logica per la gestione dei collaboratori dell'evento
            // Questo passaggio viene ignorato dato che non abbiamo un metodo getEventCollaborators
            console.log("Gestione collaboratori evento saltata - metodo non supportato");

            // Infine elimina l'evento
            await storage.deleteEvent(parseInt(_originalEventId));

            console.log(`Evento ID ${_originalEventId} eliminato con successo (convertito in preventivo ID ${quote.id})`);
          }
        } catch (error) {
          console.error(`Errore durante l'eliminazione dell'evento convertito:`, error);
          // Non blocchiamo la creazione del preventivo se fallisce l'eliminazione dell'evento
        }
      }

      res.status(201).json(quote);
    } catch (err) {
      console.error("Errore nella creazione del preventivo:", err);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  apiRouter.post("/quotes/:quoteId/items", async (req, res) => {
    try {
      const quoteId = parseInt(req.params.quoteId);
      const parseResult = insertQuoteItemSchema.safeParse({
        ...req.body,
        quoteId
      });

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Verify quote and service exist
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      const service = await storage.getService(parseResult.data.serviceId);
      if (!service) {
        return res.status(400).json({ message: "Service not found" });
      }

      const quoteItem = await storage.createQuoteItem(parseResult.data);
      res.status(201).json(quoteItem);
    } catch (err) {
      res.status(500).json({ message: "Failed to add item to quote" });
    }
  });

  apiRouter.put("/quotes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parseResult = insertQuoteSchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // If clientId is provided, verify client exists
      if (parseResult.data.clientId) {
        const client = await storage.getClient(parseResult.data.clientId);
        if (!client) {
          return res.status(400).json({ message: "Client not found" });
        }
      }

      // If eventId is provided, verify event exists
      if (parseResult.data.eventId) {
        const event = await storage.getEvent(parseResult.data.eventId);
        if (!event) {
          return res.status(400).json({ message: "Event not found" });
        }
      }

      // Conserva la firma se è fornita
      const dataToUpdate = { ...parseResult.data };

      const updatedQuote = await storage.updateQuote(id, dataToUpdate);

      if (!updatedQuote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      res.json(updatedQuote);
    } catch (err) {
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  // API per aggiungere un secondo cliente al preventivo
  apiRouter.post("/quotes/:id/second-client", async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      const parseResult = insertClientSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: fromZodError(parseResult.error).message });
      }
      
      // Verifica che il preventivo esista
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: "Preventivo non trovato" });
      }
      
      // Crea il nuovo cliente
      const newClient = await storage.createClient(parseResult.data);
      
      // Aggiorna il preventivo con il secondClientId
      await storage.updateQuote(quoteId, { secondClientId: newClient.id });
      
      res.status(201).json({ secondClient: newClient });
    } catch (err) {
      console.error("Errore nell'aggiunta del secondo cliente:", err);
      res.status(500).json({ message: "Impossibile aggiungere il secondo cliente" });
    }
  });

  // API per inviare il preventivo via email
  apiRouter.post("/quotes/:id/send", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { emailTo, message } = req.body;

      if (!emailTo) {
        return res.status(400).json({ message: "Email required" });
      }

      // Recupera il preventivo
      const quote = await storage.getQuote(id);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Recupera il cliente associato
      const client = await storage.getClient(quote.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Recupera gli elementi del preventivo
      const quoteItems = await storage.getQuoteItemsByQuote(id);

      // Invia l'email utilizzando SendGrid
      const emailParams = {
        to: emailTo,
        subject: `Preventivo: ${quote.title}`,
        text: message || `Gentile ${client.firstName},\n\nIn allegato trovi il preventivo richiesto.\n\nCordiali saluti`,
        html: `
          <h2>Preventivo: ${quote.title}</h2>
          <p>${message || `Gentile ${client.firstName},<br><br>In allegato trovi il preventivo richiesto.<br><br>Cordiali saluti`}</p>
          <hr>
          <h3>Dettagli Preventivo</h3>
          <p><strong>Totale:</strong> €${(quote.total / 100).toFixed(2)}</p>
          <p>Per visualizzare il preventivo completo e firmarlo, clicca <a href="${process.env.BASE_URL || 'http://localhost:3000'}/quotes/public/${id}">qui</a>.</p>
        `
      };

      // Importa la funzione sendEmail
      // Usa l'importazione di sendEmail già presente all'inizio del file
      const emailSent = await sendEmail(emailParams);

      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send email" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Email error:", err);
      res.status(500).json({ message: "Failed to send quote" });
    }
  });

  apiRouter.put("/quotes/:quoteId/items/:itemId", async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const parseResult = insertQuoteItemSchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // If serviceId is provided, verify service exists
      if (parseResult.data.serviceId) {
        const service = await storage.getService(parseResult.data.serviceId);
        if (!service) {
          return res.status(400).json({ message: "Service not found" });
        }
      }

      const updatedQuoteItem = await storage.updateQuoteItem(itemId, parseResult.data);

      if (!updatedQuoteItem) {
        return res.status(404).json({ message: "Quote item not found" });
      }

      res.json(updatedQuoteItem);
    } catch (err) {
      res.status(500).json({ message: "Failed to update quote item" });
    }
  });

  apiRouter.delete("/quotes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid quote ID" });
      }

      // Aggiorna gli eventi prima di eliminare il preventivo
      try {
        // Utilizziamo una query diretta sull'oggetto Event per trovare gli eventi associati
        // al preventivo corrente utilizzando il campo quoteId
        const eventsQuery = await storage.getAllEvents();
        const eventsLinkedToQuote = eventsQuery.filter(event => event.quoteId === id);

        if (eventsLinkedToQuote.length > 0) {
          // Elimina gli eventi collegati a questo preventivo
          for (const event of eventsLinkedToQuote) {
            await storage.deleteEvent(event.id);
          }
          console.log(`Eliminati ${eventsLinkedToQuote.length} eventi associati al preventivo ${id}`);
        }
      } catch (error) {
        console.error("Errore durante l'eliminazione degli eventi associati:", error);
        // Continua comunque con l'eliminazione del preventivo
      }

      // Utilizziamo la nuova funzione per eliminare il preventivo in un'unica transazione atomica
      const success = await storage.deleteQuoteWithModulesAndItems(id);
      
      if (!success) {
        return res.status(404).json({ message: "Quote not found" });
      }

      res.status(204).send();
    } catch (err) {
      console.error("Error deleting quote:", err);
      res.status(500).json({ 
        message: "Failed to delete quote",
        error: err instanceof Error ? err.message : "Unknown error"
      });
    }
  });

  // API per la condivisione del preventivo
  // Ottieni un token di condivisione esistente per un preventivo
  apiRouter.get("/quotes/:id/share-token", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Verifica se il preventivo esiste
      const quote = await storage.getQuote(id);
      if (!quote) {
        return res.status(404).json({ message: "Preventivo non trovato" });
      }

      // Se il preventivo ha già un token valido, lo restituiamo
      if (quote.isShared && quote.shareToken) {
        return res.json({
          token: quote.shareToken,
          hasExpiry: !!quote.shareTokenExpiry,
          shareTokenExpiry: quote.shareTokenExpiry
        });
      }

      // Se non ha un token, o se non è condiviso, restituisci un errore
      return res.status(404).json({ message: "Nessun token di condivisione trovato per questo preventivo" });
    } catch (err) {
      console.error("Errore nel recupero del token:", err);
      res.status(500).json({ message: "Errore nel recupero del token di condivisione" });
    }
  });

  // Genera token di condivisione con scadenza
  apiRouter.post("/quotes/:id/share", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Verifica se il preventivo esiste
      const quote = await storage.getQuote(id);
      if (!quote) {
        return res.status(404).json({ message: "Preventivo non trovato" });
      }

      // Ottieni il numero di giorni di validità dal body o usa il default (30 giorni)
      const expiryDays = req.body.expiryDays || 30;

      // Genera un token di condivisione con scadenza
      const token = await storage.generateShareToken(id, expiryDays);
      if (!token) {
        return res.status(500).json({ message: "Impossibile generare il link di condivisione" });
      }

      res.json({ 
        success: true, 
        token,
        shareUrl: `/quotes/public/${token}`,
        expiryDays
      });
    } catch (err) {
      console.error("Errore nella condivisione del preventivo:", err);
      res.status(500).json({ message: "Errore nella condivisione del preventivo" });
    }
  });
  
  // Genera token permanente senza scadenza per preventivi firmati
  apiRouter.post("/quotes/:id/share/permanent", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Verifica se il preventivo esiste
      const quote = await storage.getQuote(id);
      if (!quote) {
        return res.status(404).json({ message: "Preventivo non trovato" });
      }
      
      // Verifica che il preventivo sia firmato
      if (quote.status !== "approved" && quote.status !== "confermato") {
        return res.status(400).json({ 
          message: "Solo i preventivi firmati possono avere link permanenti senza scadenza" 
        });
      }

      // Se il preventivo ha già un token, lo rendiamo permanente
      if (quote.isShared && quote.shareToken) {
        // Rimuoviamo la scadenza
        await storage.updateQuote(id, {
          shareTokenExpiry: null
        });
        
        return res.json({
          token: quote.shareToken,
          permanent: true
        });
      }
      
      // Altrimenti generiamo un nuovo token senza scadenza
      // Genera un token univoco
      const token = crypto.randomUUID();
      
      // Aggiorna il preventivo con il token di condivisione permanente
      await storage.updateQuote(id, {
        isShared: true,
        shareToken: token,
        shareTokenExpiry: null // Nessuna scadenza
      });
      
      res.json({ 
        success: true, 
        token,
        permanent: true
      });
    } catch (err) {
      console.error("Errore nella generazione del link permanente:", err);
      res.status(500).json({ message: "Errore nella generazione del link permanente" });
    }
  });
  
  // API per aggiornare la scadenza di un token di condivisione
  apiRouter.patch("/quotes/:id/share-expiry", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Verifica se il preventivo esiste
      const quote = await storage.getQuote(id);
      if (!quote) {
        return res.status(404).json({ message: "Preventivo non trovato" });
      }
      
      // Verifica se il preventivo è condiviso
      if (!quote.isShared || !quote.shareToken) {
        return res.status(400).json({ message: "Il preventivo non è attualmente condiviso" });
      }

      // Ottieni il numero di giorni di validità dal body o usa il default (30 giorni)
      const expiryDays = req.body.expiryDays || 30;
      
      // Aggiorna la data di scadenza
      const success = await storage.updateShareTokenExpiry(id, expiryDays);
      if (!success) {
        return res.status(500).json({ message: "Impossibile aggiornare la scadenza del link" });
      }

      res.json({ 
        success: true,
        message: `Scadenza del link aggiornata a ${expiryDays} giorni`,
        expiryDays
      });
    } catch (err) {
      console.error("Errore nell'aggiornamento della scadenza del link:", err);
      res.status(500).json({ message: "Errore nell'aggiornamento della scadenza del link" });
    }
  });

  // API per disattivare la condivisione
  apiRouter.delete("/quotes/:id/share", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Verifica se il preventivo esiste
      const quote = await storage.getQuote(id);
      if (!quote) {
        return res.status(404).json({ message: "Preventivo non trovato" });
      }

      const success = await storage.disableSharing(id);
      if (!success) {
        return res.status(500).json({ message: "Impossibile disattivare la condivisione" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Errore nella disattivazione della condivisione:", err);
      res.status(500).json({ message: "Errore nella disattivazione della condivisione" });
    }
  });

  // Endpoint per la firma del preventivo
  apiRouter.post("/quotes/share/:token/sign", async (req, res) => {
    try {
      const { token } = req.params;
      const { signature, status, signedAt, selectedModuleItems } = req.body;

      if (!token || !signature || !status) {
        return res.status(400).json({ message: "Dati mancanti" });
      }

      // Recupera il preventivo dal token
      const quote = await storage.getQuoteByShareToken(token);
      if (!quote) {
        return res.status(404).json({ message: "Preventivo non trovato" });
      }

      // Verifica se il preventivo è già stato firmato
      if (quote.status === "approved" || quote.status === "confermato") {
        return res.status(400).json({ message: "Il preventivo è già stato firmato" });
      }

      // Recupera tutti i moduli variabili del preventivo
      const modules = await storage.getModulesByQuote(quote.id);
      const variableModules = modules.filter(m => m.type === 'variable');

      // Verifica i vincoli di selezione per tutti i moduli variabili
      for (const module of variableModules) {
        const moduleItems = await storage.getQuoteModuleItemsByModule(module.id);
        const selectedItems = selectedModuleItems?.[module.id] || [];

        // Verifica se ci sono elementi obbligatori non selezionati
        const requiredItems = moduleItems.filter(item => item.isRequired);
        for (const requiredItem of requiredItems) {
          if (!selectedItems.includes(requiredItem.id)) {
            // Ottieni solo le informazioni del servizio, poiché gli elementi dei moduli sono solo servizi
            const service = requiredItem.serviceId ? await storage.getService(requiredItem.serviceId) : null;

            // Usa il nome del servizio o un nome generico
            const itemName = service?.name || 'Opzione';

            return res.status(400).json({ 
              message: `È necessario selezionare l'opzione obbligatoria: ${itemName} nel modulo "${module.name}"`
            });
          }
        }

        // Verifica numero minimo di selezioni
        if (module.minSelectCount !== undefined && module.minSelectCount !== null && module.minSelectCount > 0) {
          if (selectedItems.length < module.minSelectCount) {
            return res.status(400).json({ 
              message: `È necessario selezionare almeno ${module.minSelectCount} opzioni nel modulo "${module.name}"`
            });
          }
        }

        // Verifica numero massimo di selezioni
        if (module.maxSelectCount !== undefined && module.maxSelectCount !== null) {
          if (selectedItems.length > module.maxSelectCount) {
            return res.status(400).json({ 
              message: `È possibile selezionare al massimo ${module.maxSelectCount} opzioni nel modulo "${module.name}"`
            });
          }
        }
      }

      // Recupera i dati del cliente principale
      const client = await storage.getClient(quote.clientId);
      if (!client) {
        console.error("Cliente non trovato per il preventivo:", quote.id);
      }

      // Recupera i dati del cliente secondario, se presente
      let secondClient = null;
      if (quote.secondClientId) {
        secondClient = await storage.getClient(quote.secondClientId);
      }

      // Aggiorna lo stato del preventivo
      await storage.updateQuote(quote.id, {
        status,
        signature,
        signedAt: signedAt || new Date().toISOString()
      });

      // Funzione per aggiornare i totali del preventivo
      const updateQuoteTotals = async (quoteId: number) => {
        try {
          // Recupera tutti gli elementi base del preventivo
          const quoteItems = await storage.getQuoteItemsByQuote(quoteId);
          let itemsSum = 0;
          
          // Calcola il totale degli elementi base
          if (quoteItems && quoteItems.length > 0) {
            itemsSum = quoteItems.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 1), 0);
          }
          
          // Recupera tutti i moduli del preventivo
          const modules = await storage.getModulesByQuote(quoteId);
          let modulesSum = 0;
          
          // Calcola il totale di tutti i moduli
          for (const module of modules) {
            const moduleItems = await storage.getQuoteModuleItemsByModule(module.id);
            
            // Per i moduli variabili, considera solo gli elementi selezionati
            if (module.type === 'variable') {
              const selectedItems = moduleItems.filter(item => item.isSelected === true);
              const moduleTotal = selectedItems.reduce((sum, item) => 
                sum + (item.unitPrice || 0) * (item.selectedQuantity || item.quantity || 1), 0);
              modulesSum += moduleTotal;
            } else {
              // Per i moduli fissi, considera tutti gli elementi
              const moduleTotal = moduleItems.reduce((sum, item) => 
                sum + (item.unitPrice || 0) * (item.quantity || 1), 0);
              modulesSum += moduleTotal;
            }
          }
          
          // Calcola il totale complessivo
          const subtotal = itemsSum + modulesSum;
          
          // Recupera il preventivo per applicare eventuali sconti
          const quote = await storage.getQuote(quoteId);
          let total = subtotal;
          
          // Applica eventuali sconti
          if (quote.discountType === 'percentage' && quote.discountValue) {
            total = subtotal * (1 - (quote.discountValue / 100));
          } else if (quote.discountType === 'fixed' && quote.discountValue) {
            total = subtotal - quote.discountValue;
          }
          
          // Aggiorna il preventivo con i nuovi totali
          await storage.updateQuote(quoteId, {
            subtotal,
            total,
            // Registra quando è stato aggiornato il totale
            updatedAt: new Date().toISOString()
          });
          
          console.log(`[INFO] Totali aggiornati per il preventivo ${quoteId}: subtotal=${subtotal}, total=${total}`);
          return true;
        } catch (error) {
          console.error(`[ERROR] Errore nell'aggiornamento dei totali per il preventivo ${quoteId}:`, error);
          return false;
        }
      };
      
      // Salva le selezioni degli elementi dei moduli variabili
      if (selectedModuleItems) {
        console.log("[INFO] Salvataggio selezioni moduli per preventivo ID:", quote.id);
        for (const moduleId in selectedModuleItems) {
          const moduleItems = await storage.getQuoteModuleItemsByModule(parseInt(moduleId));
          
          // Prima resettiamo tutte le selezioni per questo modulo
          for (const item of moduleItems) {
            await storage.updateQuoteModuleItem(item.id, { 
              isSelected: false,
              selectedQuantity: null
            });
          }
          
          // Ora aggiorniamo le selezioni in base alla scelta dell'utente
          for (const item of moduleItems) {
            const isSelected = selectedModuleItems[moduleId].includes(item.id);
            console.log(`[INFO] Modulo ${moduleId}, Item ${item.id}, Selezionato: ${isSelected}`);
            
            if (isSelected) {
              // Recupera i dettagli dell'item, in caso abbia una selectedQuantity personalizzata
              const itemDetails = await storage.getQuoteModuleItem(item.id);
              
              await storage.updateQuoteModuleItem(item.id, { 
                isSelected: true,
                // Mantiene la selectedQuantity se esistente oppure usa quantity come default
                selectedQuantity: itemDetails.selectedQuantity || item.quantity || 1
              });
            }
          }
          
          // Segna il modulo come attivo (non più in attesa di selezione)
          await storage.updateQuoteModule(parseInt(moduleId), { 
            status: 'active',
            selectedAt: new Date().toISOString() // registriamo quando è stata fatta la selezione
          });
        }
        
        // Aggiorniamo i totali del preventivo dopo aver salvato tutte le selezioni
        await updateQuoteTotals(quote.id);
      }

      // Crea un nuovo evento
      // Gestione sicura della data dell'evento
      const eventDate = quote.eventDate ? new Date(quote.eventDate) : new Date();

      // Crea un nuovo evento basato sul preventivo firmato
      const event = await storage.createEvent({
        title: quote.title,
        description: quote.notes || '',
        date: eventDate,
        endDate: null, // Richiesto dallo schema
        location: quote.location || "",
        clientId: quote.clientId,
        secondClientId: quote.secondClientId || undefined,
        quoteId: quote.id,
        // fromSignedQuote non è nel modello, usiamo il campo notes per annotare l'origine
        notes: "Creato automaticamente dalla firma del preventivo",
        status: "confirmed",
        eventType: quote.eventType || "wedding",
        categoryId: quote.categoryId
      });

      // Otteniamo il preventivo aggiornato con i totali corretti dopo l'aggiornamento
      const updatedQuote = await storage.getQuote(quote.id);
      
      // Invia email di notifica all'amministratore
      // Usa le importazioni già disponibili all'inizio del file
      const clientName = client ? `${client.firstName} ${client.lastName}`.trim() : "Cliente";

      try {
        // Invia notifica all'amministratore
        await sendQuoteSignedNotification(updatedQuote, clientName, signature);

        // Invia conferma al cliente principale se è disponibile l'email
        if (client && client.email) {
          await sendQuoteSignedConfirmation(client.email, client.firstName, updatedQuote);
          console.log(`Email di conferma inviata al cliente principale: ${client.email}`);
        }

        // Invia conferma anche al cliente secondario, se presente
        if (secondClient && secondClient.email) {
          await sendQuoteSignedConfirmation(secondClient.email, secondClient.firstName, updatedQuote);
          console.log(`Email di conferma inviata al secondo cliente: ${secondClient.email}`);
        }
      } catch (emailError) {
        console.error("Errore nell'invio delle email di notifica:", emailError);
        // Non blocchiamo il flusso in caso di errore nell'invio email
      }

      res.json({ success: true, event });
    } catch (err) {
      console.error("Error signing quote:", err);
      res.status(500).json({ message: "Errore durante la firma del preventivo" });
    }
  });

  // Rotte per la gestione delle quote
  apiRouter.get("/quotes/share/:token", async (req, res) => {
    try {
      const token = req.params.token;

      // Recupera il preventivo tramite token
      const quote = await storage.getQuoteByShareToken(token);
      if (!quote) {
        return res.status(404).json({ message: "Preventivo non trovato o link non più valido" });
      }

      // Se il preventivo non è condivisibile, restituisci un errore
      if (!quote.isShared) {
        return res.status(403).json({ message: "Questo preventivo non è più condivisibile" });
      }

      // Recupera gli elementi del preventivo (per mostrare servizi, prodotti, ecc.)
      const quoteItems = await storage.getQuoteItemsByQuote(quote.id);

      // Recupera i clienti associati al preventivo
      const client = await storage.getClient(quote.clientId);

      // Recupera il secondo cliente se presente
      let secondClient = undefined;
      if (quote.secondClientId) {
        secondClient = await storage.getClient(quote.secondClientId);
      }

      // Recupera la categoria del preventivo (tipo evento)
      let category = undefined;
      if (quote.categoryId) {
        category = await storage.getServiceCategory(quote.categoryId);
      }

      // Recupera i dettagli dei servizi per ogni elemento del preventivo
      const enrichedQuoteItems = await Promise.all(
        quoteItems.map(async (item) => {
          const service = await storage.getService(item.serviceId);
          return { ...item, service };
        })
      );

      // Carica dinamicamente tutti i moduli associati al preventivo
      console.log(`Caricamento dinamico dei moduli per il preventivo ${quote.id} (token: ${token})`);
      const modules = await storage.getModulesByQuote(quote.id);

      // Per ogni modulo, carica e arricchisci gli elementi associati
      const enrichedModules = await Promise.all(
        modules.map(async (module) => {
          // Carica gli elementi del modulo
          const moduleItems = await storage.getQuoteModuleItemsByModule(module.id);

          // Arricchisci gli elementi con i dettagli di servizi, prodotti e pacchetti
          const enrichedItems = await Promise.all(
            moduleItems.map(async (item) => {
              let enrichedItem = { ...item };

              // Se l'item ha un serviceId, aggiungi i dettagli del servizio
              if (item.serviceId) {
                const service = await storage.getService(item.serviceId);
                if (service) {
                  enrichedItem = {
                    ...enrichedItem,
                    serviceName: service.name,
                    serviceDescription: service.description,
                    serviceImagePath: service.imagePath
                  };
                }
              }

              // Se l'item ha un bundleId, aggiungi i dettagli del bundle
              if (item.bundleId) {
                const bundle = await storage.getServiceBundle(item.bundleId);
                if (bundle) {
                  enrichedItem = {
                    ...enrichedItem,
                    bundleName: bundle.name,
                    bundleDescription: bundle.description,
                    bundleImagePath: bundle.imagePath
                  };
                }
              }

              return enrichedItem;
            })
          );

          // Restituisci il modulo arricchito con i suoi elementi
          return {
            ...module,
            items: enrichedItems,
            // Assicuriamoci che i vincoli di selezione siano esplicitamente definiti
            minSelectCount: module.minSelectCount !== undefined ? module.minSelectCount : 0,
            maxSelectCount: module.maxSelectCount !== undefined ? module.maxSelectCount : null
          };
        })
      );

      // --- inizio patch totale server ---
      // Calcola la somma di quoteItems (servizi fissi)
      const itemsSum = enrichedQuoteItems.reduce(
        (s, item) => s + (item.unitPrice || item.total || 0) * (item.quantity || 1),
        0
      );
      // Calcola la somma di tutti gli items in tutti i moduli
      const modulesSum = enrichedModules
        .flatMap(m => m.items)
        .reduce(
          (s, it) => s + (it.unitPrice || it.total || 0) * (it.selectedQuantity || 1),
          0
        );
      // --- fine patch totale server ---
      
      // Prepara l'oggetto completo del preventivo con tutte le informazioni
      const completeQuote = {
        ...quote,
        quoteItems: enrichedQuoteItems,
        client: client || undefined,
        secondClient: secondClient || undefined,
        category: category || undefined,
        // Aggiungi i moduli arricchiti
        modules: enrichedModules,
        // Aggiungiamo i totali calcolati
        modulesSum: modulesSum,
        itemsSum: itemsSum,
        // Assegna il totale complessivo al preventivo condiviso
        total: itemsSum + modulesSum,
        // Aggiungi i campi di firma
        signature: quote.signature,
        signedAt: quote.signedAt
      };

      console.log(`Preventivo completato con ${enrichedModules.length} moduli caricati dinamicamente`);
      res.json(completeQuote);
    } catch (err) {
      console.error("Errore nel recupero del preventivo condiviso:", err);
      res.status(500).json({ message: "Errore nel recupero del preventivo" });
    }
  });

  apiRouter.delete("/quotes/:quoteId/items/:itemId", async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const quoteId = parseInt(req.params.quoteId);
      
      if (isNaN(itemId) || isNaN(quoteId)) {
        return res.status(400).json({ message: "ID non valido" });
      }
      
      console.log(`Eliminazione elemento ${itemId} dal preventivo ${quoteId} richiesta`);
      
      // Prima verifichiamo se si tratta di un elemento di modulo
      let success = false;
      
      try {
        // Proviamo prima a eliminare come elemento di modulo
        success = await storage.deleteQuoteModuleItem(itemId);
        if (success) {
          console.log(`Elemento di modulo ${itemId} eliminato con successo`);
        }
      } catch (moduleItemError) {
        console.log(`Elemento ${itemId} non è un elemento di modulo:`, moduleItemError);
        // Se fallisce, proviamo a eliminare come elemento diretto del preventivo
        success = await storage.deleteQuoteItem(itemId);
        if (success) {
          console.log(`Elemento di preventivo ${itemId} eliminato con successo`);
        }
      }

      if (!success) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.status(204).send();
    } catch (err) {
      console.error(`Errore nell'eliminazione dell'elemento ${req.params.itemId}:`, err);
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // Service Category routes
  apiRouter.get("/service-categories", async (req, res) => {
    try {
      const categories = await storage.getAllServiceCategories();
      res.json(categories);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch service categories" });
    }
  });

  apiRouter.get("/service-categories/active", async (req, res) => {
    try {
      const categories = await storage.getActiveServiceCategories();
      res.json(categories);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch active service categories" });
    }
  });

  apiRouter.get("/service-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getServiceCategory(id);

      if (!category) {
        return res.status(404).json({ message: "Service category not found" });
      }

      res.json(category);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch service category" });
    }
  });

  apiRouter.post("/service-categories", async (req, res) => {
    try {
      const parseResult = insertServiceCategorySchema.safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const category = await storage.createServiceCategory(parseResult.data);
      res.status(201).json(category);
    } catch (err) {
      res.status(500).json({ message: "Failed to create service category" });
    }
  });

  apiRouter.put("/service-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parseResult = insertServiceCategorySchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const updatedCategory = await storage.updateServiceCategory(id, parseResult.data);

      if (!updatedCategory) {
        return res.status(404).json({ message: "Service category not found" });
      }

      res.json(updatedCategory);
    } catch (err) {
      res.status(500).json({ message: "Failed to update service category" });
    }
  });

  apiRouter.delete("/service-categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteServiceCategory(id);

      if (!success) {
        return res.status(404).json({ message: "Service category not found" });
      }

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete service category" });
    }
  });

  // Lead Source routes
  apiRouter.get("/lead-sources", async (req, res) => {
    try {
      const sources = await storage.getAllLeadSources();
      res.json(sources);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch lead sources" });
    }
  });

  apiRouter.get("/lead-sources/active", async (req, res) => {
    try {
      const sources = await storage.getActiveLeadSources();
      res.json(sources);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch active lead sources" });
    }
  });

  apiRouter.get("/lead-sources/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const source = await storage.getLeadSource(id);

      if (!source) {
        return res.status(404).json({ message: "Lead source not found" });
      }

      res.json(source);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch lead source" });
    }
  });

  apiRouter.post("/lead-sources", async (req, res) => {
    try {
      const parseResult = insertLeadSourceSchema.safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const source = await storage.createLeadSource(parseResult.data);
      res.status(201).json(source);
    } catch (err) {
      res.status(500).json({ message: "Failed to create lead source" });
    }
  });

  apiRouter.put("/lead-sources/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parseResult = insertLeadSourceSchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const updatedSource = await storage.updateLeadSource(id, parseResult.data);

      if (!updatedSource) {
        return res.status(404).json({ message: "Lead source not found" });
      }

      res.json(updatedSource);
    } catch (err) {
      res.status(500).json({ message: "Failed to update lead source" });
    }
  });

  apiRouter.delete("/lead-sources/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteLeadSource(id);

      if (!success) {
        return res.status(404).json({ message: "Lead source not found" });
      }

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete lead source" });
    }
  });

  // Settings routes
  apiRouter.get("/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings || {});
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  apiRouter.put("/settings", async (req, res) => {
    try {
      const parseResult = insertSettingsSchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const updatedSettings = await storage.updateSettings(parseResult.data);
      res.json(updatedSettings);
    } catch (err) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });// Reset Password routes
  apiRouter.post("/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email richiesta" });
      }

      // Cerca l'utente per email
      const user = await storage.getUserByEmail(email);

      // Non rivelare se l'email esiste o meno per motivi di sicurezza
      if (!user) {
        // Simuliamo una risposta positiva anche se l'utente non esiste
        return res.status(200).json({ message: "Se l'indirizzo email è valido, riceverai istruzioni per reimpostare la password" });
      }

      // Genera un token e imposta la scadenza (4 ore)
      // Utilizziamo randomBytes da Node.js crypto invece di require
      const crypto = await import('crypto');
      const token = crypto.randomBytes(20).toString('hex');
      const expires = new Date();
      expires.setHours(expires.getHours() + 4);

      // Aggiorna l'utente con il token di reset
      await storage.updateUser(user.id, {
        resetPasswordToken: token,
        resetPasswordExpires: expires
      });

      // Invia l'email con il token di reset
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
      const emailSent = await sendPasswordResetEmail(user, resetUrl);

      if (!emailSent) {
        return res.status(500).json({ message: "Impossibile inviare l'email di reset" });
      }

      res.status(200).json({ message: "Email di reset inviata" });
    } catch (err) {
      res.status(500).json({ message: "Errore durante l'invio dell'email di reset" });
    }
  });

  apiRouter.post("/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token e password richiesti" });
      }

      // Trova l'utente con questo token
      const user = await storage.getUserByResetToken(token);

      if (!user) {
        return res.status(400).json({ message: "Token non valido o scaduto" });
      }

      // Verifica che il token non sia scaduto
      if (user.resetPasswordExpires && new Date(user.resetPasswordExpires) < new Date()) {
        return res.status(400).json({ message: "Token scaduto" });
      }

      // Hash della nuova password
      const hashedPassword = await hashPassword(password);

      // Aggiorna l'utente con la nuova password e cancella il token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      });

      res.status(200).json({ message: "Password aggiornata con successo" });
    } catch (err) {
      res.status(500).json({ message: "Errore durante il reset della password" });
    }
  });

  // Add new routes for service items
  apiRouter.get("/service-items/:serviceId", async (req,res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const items = await storage.getServiceItems(serviceId);
      res.json(items);
    } catch (err) {
      console.error("Error fetching service items:", err);
      res.status(500).json({ message: "Failed to fetch service items" });
    }
  });

  apiRouter.post("/service-items", async (req, res) => {
    try {
      const parseResult = insertServiceItemSchema.safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Verifica che il servizio esista
      const service = await storage.getService(parseResult.data.serviceId);
      if (!service) {
        return res.status(400).json({ message: "Service not found" });
      }

      // Verifica che il prodotto esista
      const product = await storage.getService(parseResult.data.productId);
      if (!product) {
        return res.status(400).json({ message: "Product not found" });
      }

      const item = await storage.createServiceItem(parseResult.data);
      res.status(201).json(item);
    } catch (err) {
      console.error("Error creating service item:", err);
      res.status(500).json({ message: "Failed to create service item" });
    }
  });

  apiRouter.put("/service-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parseResult = insertServiceItemSchema.partial().safeParse(req.body);

      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const updatedItem = await storage.updateServiceItem(id, parseResult.data);

      if (!updatedItem) {
        return res.status(404).json({ message: "Service item not found" });
      }

      res.json(updatedItem);
    } catch (err) {
      res.status(500).json({ message: "Failed to update service item" });
    }
  });

  apiRouter.delete("/service-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteServiceItem(id);

      if (!success) {
        return res.status(404).json({ message: "Service item not found" });
      }

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete service item" });
    }
  });

  // API per gestione moduli nei preventivi
  apiRouter.get("/quotes/:quoteId/modules", async (req, res) => {
    try {
      const quoteId = parseInt(req.params.quoteId);
      if (isNaN(quoteId)) {
        return res.status(400).json({ message: "ID preventivo non valido" });
      }

      // Ottieni tutti i moduli del preventivo
      const modules = await storage.getModulesByQuote(quoteId);

      // Per ogni modulo, recupera i suoi elementi con dettagli di servizi/prodotti
      const modulesWithItems = await Promise.all(
        modules.map(async (module) => {
          const items = await storage.getQuoteModuleItemsByModule(module.id);

          // Arricchisci ogni item con i dettagli del servizio, prodotto o bundle associato
          const enrichedItems = await Promise.all(
            items.map(async (item) => {
              let enrichedItem = { ...item };

              // Se l'item ha un serviceId, aggiungi i dettagli del servizio
              if (item.serviceId) {
                const service = await storage.getService(item.serviceId);
                if (service) {
                  enrichedItem = {
                    ...enrichedItem,
                    serviceName: service.name,
                    serviceDescription: service.description,
                    serviceImagePath: service.imagePath
                  };
                }
              }

              // Se l'item ha un bundleId, aggiungi i dettagli del bundle
              if (item.bundleId) {
                const bundle = await storage.getServiceBundle(item.bundleId);
                if (bundle) {
                  enrichedItem = {
                    ...enrichedItem,
                    bundleName: bundle.name,
                    bundleDescription: bundle.description,
                    bundleImagePath: bundle.imagePath
                  };
                }
              }

              // Se l'item ha un productId, aggiungi i dettagli del prodotto
              if (item.productId) {
                const product = await storage.getService(item.productId);
                if (product) {
                  enrichedItem = {
                    ...enrichedItem,
                    productName: product.name,
                    productDescription: product.description,
                    productImagePath: product.imagePath
                  };
                }
              }

              return enrichedItem;
            })
          );

          // Assicuriamoci che i vincoli di selezione siano esplicitamente inclusi
          return { 
            ...module, 
            items: enrichedItems,
            // Includiamo esplicitamente i vincoli di selezione con valori di default se non presenti
            minSelectCount: module.minSelectCount !== undefined ? module.minSelectCount : 0,
            maxSelectCount: module.maxSelectCount !== undefined ? module.maxSelectCount : null
          };
        })
      );

      res.json(modulesWithItems);
    } catch (err) {
      console.error("Error fetching quote modules:", err);
      res.status(500).json({ message: "Errore nel recupero dei moduli" });
    }
  });

  apiRouter.get("/modules/:id", async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "ID modulo non valido" });
      }

      const module = await storage.getQuoteModule(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Modulo non trovato" });
      }

      // Recupera anche gli elementi del modulo
      const baseItems = await storage.getQuoteModuleItemsByModule(moduleId);

      // Arricchisci gli elementi con i dettagli di servizi, prodotti e pacchetti
      const items = await Promise.all(
        baseItems.map(async (item) => {
          let enrichedItem = { ...item };

          // Se l'item ha un serviceId, aggiungi i dettagli del servizio
          if (item.serviceId) {
            const service = await storage.getService(item.serviceId);
            if (service) {
              enrichedItem = {
                ...enrichedItem,
                serviceName: service.name,
                serviceDescription: service.description,
                serviceImagePath: service.imagePath
              };
            }
          }

          // Se l'item ha un bundleId, aggiungi i dettagli del bundle
          if (item.bundleId) {
            const bundle = await storage.getServiceBundle(item.bundleId);
            if (bundle) {
              enrichedItem = {
                ...enrichedItem,
                bundleName: bundle.name,
                bundleDescription: bundle.description,
                bundleImagePath: bundle.imagePath
              };
            }
          }

          // Se l'item ha un productId, aggiungi i dettagli del prodotto
          if (item.productId) {
            const product = await storage.getService(item.productId);
            if (product) {
              enrichedItem = {
                ...enrichedItem,
                productName: product.name,
                productDescription: product.description,
                productImagePath: product.imagePath
              };
            }
          }

          return enrichedItem;
        })
      );

      // Se è un modulo variabile, costruisci anche la struttura delle categorie di selezione
      if (module.type === 'variable') {
        // Aggruppiamo gli item per categoria (se disponibile)
        const selections = [];

        // Mappa per tracciare gli item già assegnati a una selezione
        const assignedItems = new Set();

        // Raggruppa gli item in base al campo notes che contiene le informazioni sulla categoria
        // nel formato "NomeCategoria: NomeItem"
        const categoryMap = new Map();

        items.forEach(item => {
          if (!item || !item.notes) return;

          // Estrai la categoria dalla nota (formato: "NomeCategoria: NomeItem")
          const noteParts = item.notes.split(':');
          if (noteParts.length < 2) return;

          const categoryName = noteParts[0].trim();

          // Aggiungi l'item alla categoria corrispondente
          if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, {
              id: `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name: categoryName,
              options: []
            });
          }

          const category = categoryMap.get(categoryName);

          // Aggiungi l'opzione alla categoria
          category.options.push({
            id: `opt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            selectionId: category.id,
            itemId: item.serviceId || item.productId || item.bundleId,
            itemType: item.serviceId ? 'service' : (item.productId ? 'product' : 'bundle'),
            name: item.serviceName || item.productName || item.bundleName,
            description: item.serviceDescription || item.productDescription || item.bundleDescription,
            price: item.unitPrice,
            isDefault: item.isSelected,
            isRequired: item.isRequired
          });

          // Segna questo item come già assegnato
          assignedItems.add(item.id);
        });

        // Converti la mappa in array di selezioni
        categoryMap.forEach((category) => {
          selections.push(category);
        });

        // Gli item non assegnati a categorie possono essere aggiunti a una categoria "Altro"
        const unassignedItems = items.filter(item => !assignedItems.has(item.id));
        if (unassignedItems.length > 0) {
          const defaultCategory = {
            id: `cat-default-${Date.now()}`,
            name: "Altro",
            options: unassignedItems.map(item => ({
              id: `opt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              selectionId: `cat-default-${Date.now()}`,
              itemId: item.serviceId || item.productId || item.bundleId,
              itemType: item.serviceId ? 'service' : (item.productId ? 'product' : 'bundle'),
              name: item.serviceName || item.productName || item.bundleName,
              description: item.serviceDescription || item.productDescription || item.bundleDescription,
              price: item.unitPrice,
              isDefault: item.isSelected,
              isRequired: item.isRequired
            }))
          };
          selections.push(defaultCategory);
        }

        // Restituisci il modulo con gli items e le selections
        res.json({ ...module, items, selections });
      } else {
        // Per i moduli fissi restituisci solo gli items
        res.json({ ...module, items });
      }
    } catch (err) {
      console.error("Error fetching module:", err);
      res.status(500).json({ message: "Errore nel recupero del modulo" });
    }
  });

  apiRouter.post("/quotes/:quoteId/modules", async (req, res) => {
    try {
      const quoteId = parseInt(req.params.quoteId);
      if (isNaN(quoteId)) {
        return res.status(400).json({ message: "ID preventivo non valido" });
      }

      // Verifica che il preventivo esista
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: "Preventivo non trovato" });
      }

      // Valida i dati del modulo
      if (!req.body.name || !req.body.type) {
        return res.status(400).json({ 
          message: "Dati del modulo incompleti",
          details: "Nome e tipo sono richiesti"
        });
      }

      // Estrai i campi selections dalle proprietà del modulo se ci sono
      const { selections, updatedAt, ...moduleBaseData } = req.body;

      // Crea il modulo con gestione corretta della data di scadenza
      const moduleData = {
        ...moduleBaseData,
        quoteId,
        updatedAt: new Date(),
        expiryDate: req.body.expiryDate 
          ? new Date(req.body.expiryDate) 
          : (req.body.type === 'variable' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined)
      };

      const newModule = await storage.createQuoteModule(moduleData);
      if (!newModule) {
        throw new Error("Errore nella creazione del modulo");
      }

      // Se ci sono elementi nel modulo fisso, li creiamo
      if (req.body.items && Array.isArray(req.body.items)) {
        await Promise.all(req.body.items.map(item => 
          storage.createQuoteModuleItem({
            ...item,
            moduleId: newModule.id
          })
        ));
      }

      // Se è un modulo variabile con selezioni, processiamo le selections e creiamo items appropriati
      if (moduleData.type === 'variable' && selections && Array.isArray(selections)) {
        console.log("Processando selections per modulo variabile", JSON.stringify(selections, null, 2));

        try {
          // Per ogni selezione, processiamo le opzioni come elementi del modulo
          for (const selection of selections) {
            console.log("Processando selezione:", JSON.stringify(selection, null, 2));

            if (selection.options && Array.isArray(selection.options)) {
              // Crea item per ogni opzione nella selezione
              for (const option of selection.options) {
                console.log("Processando opzione:", JSON.stringify(option, null, 2));

                // Conversione di itemId a numero se è una stringa
                const itemId = typeof option.itemId === 'string' ? parseInt(option.itemId) : option.itemId;

                // Aggiungiamo controllo per il tipo di elemento
                let serviceId = null;
                let bundleId = null;
                let productId = null;

                if (option.itemType === 'service') {
                  serviceId = itemId;
                } else if (option.itemType === 'bundle') {
                  bundleId = itemId;
                } else if (option.itemType === 'product') {
                  serviceId = itemId; // i prodotti sono servizi con type='product'
                }

                console.log(`Creazione item: moduleId=${newModule.id}, serviceId=${serviceId}, bundleId=${bundleId}, productId=${productId}`);

                const moduleItem = {
                  moduleId: newModule.id,
                  serviceId: serviceId,
                  bundleId: bundleId,
                  quantity: 1,
                  unitPrice: option.price || 0,
                  isRequired: option.isRequired || false,
                  isSelected: option.isDefault || false,
                  position: option.position || 0,
                  hasDiscount: false,
                  total: option.price || 0,
                  notes: `${selection.name}: ${option.name}`
                };

                console.log("Creando item:", JSON.stringify(moduleItem, null, 2));

                const createdItem = await storage.createQuoteModuleItem(moduleItem);
                console.log("Item creato:", JSON.stringify(createdItem, null, 2));
              }
            }
          }
        } catch (error) {
          console.error("Errore nella creazione degli item per il modulo variabile:", error);
          throw new Error("Errore nella creazione degli item per il modulo variabile");
        }
      }

      // Recupera il modulo completo con i suoi elementi
      const items = await storage.getQuoteModuleItemsByModule(newModule.id);

      res.status(201).json({ ...newModule, items });
    } catch (err) {
      console.error("Error creating module:", err);
      res.status(500).json({ message: "Errore nella creazione del modulo" });
    }
  });

  apiRouter.put("/modules/:id", async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "ID modulo non valido" });
      }

      // Verifica che il modulo esista
      const existingModule = await storage.getQuoteModule(moduleId);
      if (!existingModule) {
        return res.status(404).json({ message: "Modulo non trovato" });
      }

      // Rimuoviamo campi problematici e prepariamo i dati per l'aggiornamento
      const { 
        createdAt, updatedAt, items: itemsFromBody, selections, expiryDate, 
        ...moduleDataToUpdate 
      } = req.body;

      // Prepara i dati per l'aggiornamento con gestione corretta delle date
      const updateData = {
        ...moduleDataToUpdate,
        // Se expiryDate è fornito, lo convertiamo in Date oppure lo impostiamo a null
        ...(expiryDate ? { expiryDate: new Date(expiryDate) } : { expiryDate: null }),
        // Assicuriamoci che i vincoli di selezione siano inclusi
        minSelectCount: moduleDataToUpdate.minSelectCount !== undefined ? 
          parseInt(moduleDataToUpdate.minSelectCount as any) || 0 : undefined,
        maxSelectCount: moduleDataToUpdate.maxSelectCount !== undefined ? 
          parseInt(moduleDataToUpdate.maxSelectCount as any) || null : undefined,
        // Aggiorniamo la data di modifica
        updatedAt: new Date()
      };

      // Log dei dati che verranno inviati all'update
      console.log("Dati per aggiornamento modulo:", updateData);

      // Aggiorna il modulo
      const updatedModule = await storage.updateQuoteModule(moduleId, updateData);

      // Elimina tutti gli elementi esistenti
      const existingItems = await storage.getQuoteModuleItemsByModule(moduleId);
      for (const item of existingItems) {
        await storage.deleteQuoteModuleItem(item.id);
      }

      // Gestisci gli elementi del modulo fisso
      if (itemsFromBody && Array.isArray(itemsFromBody)) {
        // Crea i nuovi elementi
        for (const item of itemsFromBody) {
          await storage.createQuoteModuleItem({
            ...item,
            moduleId
          });
        }
      }

      // Se è un modulo variabile, processa la struttura selections
      if (updateData.type === 'variable') {
        console.log("Aggiornamento modulo variabile: processamento delle selections");

        // Verifica se abbiamo ricevuto un array di selections (potrebbe essere vuoto se tutte le categorie sono state rimosse)
        if (!selections || !Array.isArray(selections)) {
          console.log("Nessuna selezione ricevuta nell'aggiornamento - tutte le categorie sono state rimosse");
          // Se non ci sono selections, significa che tutte le categorie sono state rimosse
          // Non è necessario fare altro perché abbiamo già eliminato tutti gli elementi del modulo
        } else {
          console.log("Processando selections:", JSON.stringify(selections, null, 2));

          try {
            // Per ogni selezione, processa le opzioni come elementi del modulo
            for (const selection of selections) {
              console.log("Processando selezione (update):", JSON.stringify(selection, null, 2));

              if (selection.options && Array.isArray(selection.options)) {
                // Crea item per ogni opzione nella selezione
                for (const option of selection.options) {
                  console.log("Processando opzione (update):", JSON.stringify(option, null, 2));

                  // Conversione di itemId a numero se è una stringa
                  const itemId = typeof option.itemId === 'string' ? parseInt(option.itemId) : option.itemId;

                  // Aggiungiamo controllo per il tipo di elemento
                  let serviceId = null;
                  let bundleId = null;

                  if (option.itemType === 'service') {
                    serviceId = itemId;
                  } else if (option.itemType === 'bundle') {
                    bundleId = itemId;
                  } else if (option.itemType === 'product') {
                    serviceId = itemId; // i prodotti sono servizi con type='product'
                  }

                  console.log(`Creazione item (update): moduleId=${moduleId}, serviceId=${serviceId}, bundleId=${bundleId}`);

                  const moduleItem = {
                    moduleId: moduleId,
                    serviceId: serviceId,
                    bundleId: bundleId,
                    quantity: 1,
                    unitPrice: option.price || 0,
                    isRequired: option.isRequired || false,
                    isSelected: option.isDefault || false,
                    position: option.position || 0,
                    hasDiscount: false,
                    total: option.price || 0,
                    notes: `${selection.name}: ${option.name}`,
                    // Aggiungiamo i vincoli di selezione dalla selezione all'item
                    minSelectCount: option.isRequired ? 1 : 0
                  };

                  console.log("Creando item (update):", JSON.stringify(moduleItem, null, 2));

                  const createdItem = await storage.createQuoteModuleItem(moduleItem);
                  console.log("Item creato (update):", JSON.stringify(createdItem, null, 2));
                }
              }
            }
          } catch (error) {
            console.error("Errore nella creazione degli item per il modulo variabile (update):", error);
            throw new Error("Errore nell'aggiornamento degli item per il modulo variabile");
          }
        }
      }

      // Recupera il modulo aggiornato con i suoi elementi
      const updatedItems = await storage.getQuoteModuleItemsByModule(moduleId);

      res.json({ ...updatedModule, items: updatedItems });
    } catch (err) {
      console.error("Error updating module:", err);
      res.status(500).json({ message: "Errore nell'aggiornamento del modulo" });
    }
  });

  apiRouter.delete("/modules/:id", async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "ID modulo non valido" });
      }

      // Verifica che il modulo esista
      const existingModule = await storage.getQuoteModule(moduleId);
      if (!existingModule) {
        return res.status(404).json({ message: "Modulo non trovato" });
      }

      // Elimina il modulo (gli elementi verranno eliminati automaticamente nell'implementazione di deleteQuoteModule)
      await storage.deleteQuoteModule(moduleId);

      res.status(204).send();
    } catch (err) {
      console.error("Error deleting module:", err);
      res.status(500).json({ message: "Errore nell'eliminazione del modulo" });
    }
  });

  apiRouter.get("/modules/share/:token", async (req, res) => {
    try {
      const { token } = req.params;
      if (!token) {
        return res.status(400).json({ message: "Token non valido" });
      }

      // Recupera il modulo
      const module = await storage.getQuoteModuleByShareToken(token);
      if (!module) {
        return res.status(404).json({ message: "Modulo non trovato o link scaduto" });
      }

      // Verifica che il modulo sia di tipo variabile
      if (module.type !== 'variable') {
        return res.status(400).json({ message: "Questo link non è valido per la configurazione" });
      }

      // Verifica che il modulo sia attivo
      if (module.status !== 'active' && module.status !== 'pending_selection') {
        return res.status(400).json({ message: "Questo modulo non è più attivo" });
      }

      // Verifica la data di scadenza
      if (module.expiryDate && new Date(module.expiryDate) < new Date()) {
        return res.status(400).json({ message: "Il link di configurazione è scaduto" });
      }

      // Recupera il preventivo associato
      const quote = await storage.getQuote(module.quoteId);
      if (!quote) {
        return res.status(404).json({ message: "Preventivo non trovato" });
      }

      // Recupera gli elementi del modulo
      const items = await storage.getQuoteModuleItemsByModule(module.id);

      // Arricchisci gli elementi con i dettagli di servizi, prodotti e pacchetti
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          let enrichedItem = { ...item };

          // Se l'item ha un serviceId, aggiungi i dettagli del servizio
          if (item.serviceId) {
            const service = await storage.getService(item.serviceId);
            if (service) {
              enrichedItem = {
                ...enrichedItem,
                serviceName: service.name,
                serviceDescription: service.description,
                serviceImagePath: service.imagePath
              };
            }
          }

          // Se l'item ha un bundleId, aggiungi i dettagli del bundle
          if (item.bundleId) {
            const bundle = await storage.getServiceBundle(item.bundleId);
            if (bundle) {
              enrichedItem = {
                ...enrichedItem,
                bundleName: bundle.name,
                bundleDescription: bundle.description,
                bundleImagePath: bundle.imagePath
              };
            }
          }

          // Se l'item ha un productId, aggiungi i dettagli del prodotto
          if (item.productId) {
            const product = await storage.getService(item.productId);
            if (product) {
              enrichedItem = {
                ...enrichedItem,
                productName: product.name,
                productDescription: product.description,
                productImagePath: product.imagePath
              };
            }
          }

          return enrichedItem;
        })
      );

      // Recupera il cliente associato al preventivo
      const client = await storage.getClient(quote.clientId);

      res.json({
        module: { 
          ...module, 
          items: enrichedItems,
          // Aggiungiamo esplicitamente i vincoli di selezione
          minSelectCount: module.minSelectCount !== undefined ? module.minSelectCount : 0,
          maxSelectCount: module.maxSelectCount !== undefined ? module.maxSelectCount : null 
        },
        quote: {
          id: quote.id,
          title: quote.title
        },
        client: client ? {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName
        } : null
      });
    } catch (err) {
      console.error("Error fetching shared module:", err);
      res.status(500).json({ message: "Errore nel recupero del modulo condiviso" });
    }
  });

  apiRouter.post("/modules/share/:token/select", async (req, res) => {
    try {
      const { token } = req.params;
      const { selectedItems } = req.body;

      if (!token) {
        return res.status(400).json({ message: "Token non valido" });
      }

      if (!selectedItems || !Array.isArray(selectedItems)) {
        return res.status(400).json({ message: "Dati di selezione non validi" });
      }

      // Recupera il modulo
      const module = await storage.getQuoteModuleByShareToken(token);
      if (!module) {
        return res.status(404).json({ message: "Modulo non trovato o link scaduto" });
      }

      // Verifica che il modulo sia di tipo variabile
      if (module.type !== 'variable') {
        return res.status(400).json({ message: "Questo modulo non supporta le selezioni" });
      }

      // Verifica che il modulo sia attivo
      if (module.status !== 'active' && module.status !== 'pending_selection') {
        return res.status(400).json({ message: "Questo modulo non è più attivo" });
      }

      // Verifica la data di scadenza
      if (module.expiryDate && new Date(module.expiryDate) < new Date()) {
        return res.status(400).json({ message: "Il link di configurazione è scaduto" });
      }

      // Recupera tutti gli elementi del modulo
      const moduleItems = await storage.getQuoteModuleItemsByModule(module.id);

      // Recuperiamo tutte le informazioni arricchite degli elementi
      const enrichedItems = await Promise.all(
        moduleItems.map(async (item) => {
          let enrichedItem = { ...item };

          // Se l'item ha un serviceId, aggiungi i dettagli del servizio
          if (item.serviceId) {
            const service = await storage.getService(item.serviceId);
            if (service) {
              enrichedItem = {
                ...enrichedItem,
                serviceName: service.name,
                serviceDescription: service.description,
                serviceImagePath: service.imagePath
              };
            }
          }

          // Se l'item ha un bundleId, aggiungi i dettagli del bundle
          if (item.bundleId) {
            const bundle = await storage.getServiceBundle(item.bundleId);
            if (bundle) {
              enrichedItem = {
                ...enrichedItem,
                bundleName: bundle.name,
                bundleDescription: bundle.description,
                bundleImagePath: bundle.imagePath
              };
            }
          }

          // Se l'item ha un productId, aggiungi i dettagli del prodotto
          if (item.productId) {
            const product = await storage.getService(item.productId);
            if (product) {
              enrichedItem = {
                ...enrichedItem,
                productName: product.name,
                productDescription: product.description,
                productImagePath: product.imagePath
              };
            }
          }

          return enrichedItem;
        })
      );

      // Conta quanti elementi sono stati selezionati
      const totalSelected = selectedItems.length;

      // Verifica vincoli di minimo e massimo numero di selezioni
      if (module.minSelectCount !== undefined && module.minSelectCount > 0 && totalSelected < module.minSelectCount) {
        return res.status(400).json({
          message: `È necessario selezionare almeno ${module.minSelectCount} opzioni`
        });
      }

      if (module.maxSelectCount !== undefined && module.maxSelectCount !== null && totalSelected > module.maxSelectCount) {
        return res.status(400).json({
          message: `È possibile selezionare al massimo ${module.maxSelectCount} opzioni`
        });
      }

      // Aggiorna lo stato di ciascun elemento
      for (const item of moduleItems) {
        const isSelected = selectedItems.includes(item.id);

        // Verifica se un elemento obbligatorio non è stato selezionato
        if (item.isRequired && !isSelected) {
          // Trova il nome dell'elemento dai dati arricchiti
          const enrichedItem = enrichedItems.find(ei => ei.id === item.id);
          const itemName = enrichedItem?.serviceName || enrichedItem?.productName || enrichedItem?.bundleName || 'Opzione';

          return res.status(400).json({ 
            message: `È necessario selezionare l'opzione obbligatoria: ${itemName}`
          });
        }

        await storage.updateQuoteModuleItem(item.id, {
          isSelected
        });
      }

      // Aggiorna lo stato del modulo
      await storage.updateQuoteModule(module.id, {
        status: 'active' // Cambia da 'pending_selection' ad 'active' se necessario
      });

      res.json({ message: "Selezioni salvate con successo" });
    } catch (err) {
      console.error("Error updating module selections:", err);
      res.status(500).json({ message: "Errore nel salvataggio delle selezioni" });
    }
  });

  // Register all API routes
  // Registrazione dei router modulari
  // Tutte le routes di bundle-leads sono gestite nel file routes/bundle-leads.ts
  // La protezione auth viene applicata a livello di route individuale
  app.use("/api/bundle-leads", bundleLeadsRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/finance", financeRouter);
  app.use("/api/gallery", galleryRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/selection", selectionRouter);
  app.use("/api/clauses", clausesRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/eventi", eventiRouter); // Italian endpoint (legacy)
  app.use("/api/events", eventsRouter); // English standardized endpoint
  app.use("/api", collaboratoriRouter);
  app.use("/api/collaborators", collaboratorsRouter);
  app.use("/api/collaboratori", dashboardPublicRouter);
  // Aggiungi anche una rotta per il nuovo formato dell'URL
  app.use("/api", dashboardPublicRouter);

  // Configurazione di multer per l'upload dei file
  const upload = multer({
    dest: join(tmpdir(), 'uploads'),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // Rotte per l'importazione ed esportazione dei clienti
  app.post('/api/clients/upload', isAuthenticated, upload.single('file'), handleFileUpload);
  app.post('/api/clients/import', isAuthenticated, importClients);
  app.post('/api/clients/direct-import', isAuthenticated, importDirectClients);
  app.get('/api/clients/export', isAuthenticated, exportClientsCSV);

  // Google Calendar routes

  // Endpoint per ottenere l'URL di autorizzazione di Google
  apiRouter.get("/google/auth", isAuthenticated, connectGoogleCalendar);
  
  // Callback per l'autorizzazione di Google (non ha bisogno di CSRF poiché gestisce il redirect da Google)
  app.get("/api/google/callback", googleAuthCallback);
  
  // Endpoint per verificare lo stato di connessione a Google Calendar
  apiRouter.get("/google/status", isAuthenticated, getGoogleAuthStatus);
  
  // Endpoint per sincronizzare un evento specifico con Google Calendar
  apiRouter.post("/google/events/:eventId/sync", isAuthenticated, syncEventToGoogle);
  
  // Endpoint per rimuovere un evento specifico da Google Calendar
  apiRouter.delete("/google/events/:eventId", isAuthenticated, deleteEventFromGoogle);
  
  // Endpoint per sincronizzare tutti gli eventi con Google Calendar
  apiRouter.post("/google/sync-all", isAuthenticated, syncAllEvents);
  
  // Endpoint per importare eventi da Google Calendar
  apiRouter.post("/google/import", isAuthenticated, importGoogleEvents);
  
  // Endpoint per attivare/disattivare la sincronizzazione di un evento
  apiRouter.post("/google/events/:eventId/toggle", isAuthenticated, toggleGoogleSync);

  app.use("/api", apiRouter);

  // Modulo routes
  // Le routes di bundle-leads sono già registrate in precedenza
  app.use("/api/settings", isAuthenticated, settingsRouter);
  app.use("/api/gallery", isAuthenticated, galleryRouter);
  app.use("/api/finance", isAuthenticated, financeRouter);
  app.use("/api/search", isAuthenticated, searchRouter);
  app.use("/api/selection", selectionRouter);
  app.use("/api/clauses", isAuthenticated, clausesRouter);
  app.use("/api/notifications", isAuthenticated, notificationsRouter);
  
  // Nuova rotta standardizzata per i collaboratori (versione inglese)
  app.use("/api/collaborators", isAuthenticated, collaboratorsRouter);
  
  // Manteniamo temporaneamente le vecchie rotte per retrocompatibilità
  app.use("/api/collaboratori", isAuthenticated, collaboratoriRouter);
  app.use("/api/eventi", isAuthenticated, eventiRouter);
  
  // Aggiungi la nuova rotta standardizzata per gli eventi in inglese
  app.use("/api/events", isAuthenticated, eventsRouter);

  // Setup upload routes
  setupUploadRoutes(app);

  // Esegui le migrazioni e sincronizzazioni necessarie all'avvio del server
  try {
    // 1. Sincronizza tutte le assegnazioni dei collaboratori
    console.log("Avvio sincronizzazione delle assegnazioni collaboratori...");
    syncAllCollaboratorAssignments()
      .then(() => console.log("Sincronizzazione assegnazioni collaboratori completata con successo"))
      .catch(err => console.error("Errore durante la sincronizzazione iniziale delle assegnazioni:", err));
      
    // 2. Sincronizza tutti i dati degli eventi tra le tabelle in italiano e inglese
    console.log("Avvio sincronizzazione dei dati eventi...");
    syncAllEventData()
      .then(() => console.log("Sincronizzazione dati eventi completata con successo"))
      .catch(err => console.error("Errore durante la sincronizzazione dei dati eventi:", err));

    // 3. Esegui la migrazione completa dei dati (quando necessario)
    if (process.env.RUN_MIGRATIONS === 'true') {
      console.log("Avvio migrazione completa dei dati...");
      runMigration()
        .then(success => {
          if (success) {
            console.log("✅ Migrazione completa dei dati terminata con successo");
          } else {
            console.error("⚠️ Migrazione dei dati completata con avvisi");
          }
        })
        .catch(err => console.error("❌ Errore fatale durante la migrazione dei dati:", err));
    }
  } catch (error) {
    console.error("Errore nell'avvio delle sincronizzazioni:", error);
  }

  const httpServer = createServer(app);

  return httpServer;
}
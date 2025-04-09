import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import { sendPasswordResetEmail } from "./email";
import { setupUploadRoutes } from "./upload";
import bundleLeadsRouter from "./routes/bundle-leads";
import settingsRouter from "./routes/settings";
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
  
  // Setup API routes
  const apiRouter = express.Router();
  
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
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (err) {
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
  
  apiRouter.get("/quotes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quote = await storage.getQuote(id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      res.json(quote);
    } catch (err) {
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
      const parseResult = insertQuoteSchema.safeParse(req.body);
      
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
      
      const quote = await storage.createQuote(parseResult.data);
      res.status(201).json(quote);
    } catch (err) {
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
        return res.status(400).json({ message: "Quote not found" });
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
      const { sendEmail } = require('./email');
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
      const success = await storage.deleteQuote(id);
      
      if (!success) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });
  
  apiRouter.delete("/quotes/:quoteId/items/:itemId", async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const success = await storage.deleteQuoteItem(itemId);
      
      if (!success) {
        return res.status(404).json({ message: "Quote item not found" });
      }
      
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete quote item" });
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
  });
  
    // Reset Password routes
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
      const token = require('crypto').randomBytes(20).toString('hex');
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
  
  // Register all API routes
  // Registrazione dei router modulari
  app.use("/api/bundle-leads", bundleLeadsRouter);
  app.use("/api/settings", settingsRouter);
  
  app.use("/api", apiRouter);
  
  // Setup upload routes
  setupUploadRoutes(app);
  
  const httpServer = createServer(app);
  
  return httpServer;
}

import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { 
  insertClientSchema, 
  insertEventSchema, 
  insertTaskSchema, 
  insertCollaboratorSchema,
  insertEventCollaboratorSchema,
  insertContractSchema,
  insertServiceSchema,
  insertQuoteSchema,
  insertQuoteItemSchema,
  insertSettingsSchema
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
      const parseResult = insertEventSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      // Verify client exists
      const client = await storage.getClient(parseResult.data.clientId);
      if (!client) {
        return res.status(400).json({ message: "Client not found" });
      }
      
      const event = await storage.createEvent(parseResult.data);
      res.status(201).json(event);
    } catch (err) {
      res.status(500).json({ message: "Failed to create event" });
    }
  });
  
  apiRouter.put("/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parseResult = insertEventSchema.partial().safeParse(req.body);
      
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
      const services = await storage.getAllServices();
      res.json(services);
    } catch (err) {
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
      const parseResult = insertServiceSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const service = await storage.createService(parseResult.data);
      res.status(201).json(service);
    } catch (err) {
      res.status(500).json({ message: "Failed to create service" });
    }
  });
  
  apiRouter.put("/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parseResult = insertServiceSchema.partial().safeParse(req.body);
      
      if (!parseResult.success) {
        const errorMessage = fromZodError(parseResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const updatedService = await storage.updateService(id, parseResult.data);
      
      if (!updatedService) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(updatedService);
    } catch (err) {
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
      
      const updatedQuote = await storage.updateQuote(id, parseResult.data);
      
      if (!updatedQuote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      res.json(updatedQuote);
    } catch (err) {
      res.status(500).json({ message: "Failed to update quote" });
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
  
  // Register all API routes
  // Apply authentication middleware to all API routes except auth routes
  apiRouter.use((req, res, next) => {
    // Skip authentication for login and register endpoints
    if (req.path === '/login' || req.path === '/register' || req.path === '/user') {
      return next();
    }
    
    // Require authentication for all other endpoints
    isAuthenticated(req, res, next);
  });
  
  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}

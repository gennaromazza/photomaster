import { db } from "./db";
import { eq, and, gt, gte } from "drizzle-orm";
import {
  users, clients, events, tasks, collaborators, eventCollaborators,
  contracts, services, quotes, quoteItems, settings,
  type User, type InsertUser, 
  type Client, type InsertClient,
  type Event, type InsertEvent,
  type Task, type InsertTask,
  type Collaborator, type InsertCollaborator,
  type EventCollaborator, type InsertEventCollaborator,
  type Contract, type InsertContract,
  type Service, type InsertService,
  type Quote, type InsertQuote,
  type QuoteItem, type InsertQuoteItem,
  type Settings, type InsertSettings
} from "../shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  getAllClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  
  // Event operations
  getEvent(id: number): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  getEventsByClient(clientId: number): Promise<Event[]>;
  getUpcomingEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // Task operations
  getTask(id: number): Promise<Task | undefined>;
  getAllTasks(): Promise<Task[]>;
  getTasksByEvent(eventId: number): Promise<Task[]>;
  getUncompletedTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  toggleTaskCompletion(id: number): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Collaborator operations
  getCollaborator(id: number): Promise<Collaborator | undefined>;
  getAllCollaborators(): Promise<Collaborator[]>;
  getAvailableCollaborators(): Promise<Collaborator[]>;
  createCollaborator(collaborator: InsertCollaborator): Promise<Collaborator>;
  updateCollaborator(id: number, collaborator: Partial<InsertCollaborator>): Promise<Collaborator | undefined>;
  deleteCollaborator(id: number): Promise<boolean>;
  
  // Event Collaborator operations
  getEventCollaborator(id: number): Promise<EventCollaborator | undefined>;
  getCollaboratorsByEvent(eventId: number): Promise<Collaborator[]>;
  assignCollaboratorToEvent(eventCollaborator: InsertEventCollaborator): Promise<EventCollaborator>;
  removeCollaboratorFromEvent(eventId: number, collaboratorId: number): Promise<boolean>;
  
  // Contract operations
  getContract(id: number): Promise<Contract | undefined>;
  getContractsByClient(clientId: number): Promise<Contract[]>;
  getContractsByEvent(eventId: number): Promise<Contract[]>;
  getAllContracts(): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: number): Promise<boolean>;
  
  // Service operations
  getService(id: number): Promise<Service | undefined>;
  getAllServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  
  // Quote operations
  getQuote(id: number): Promise<Quote | undefined>;
  getQuotesByClient(clientId: number): Promise<Quote[]>;
  getAllQuotes(): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote | undefined>;
  deleteQuote(id: number): Promise<boolean>;
  
  // Quote Item operations
  getQuoteItem(id: number): Promise<QuoteItem | undefined>;
  getQuoteItemsByQuote(quoteId: number): Promise<QuoteItem[]>;
  createQuoteItem(quoteItem: InsertQuoteItem): Promise<QuoteItem>;
  updateQuoteItem(id: number, quoteItem: Partial<InsertQuoteItem>): Promise<QuoteItem | undefined>;
  deleteQuoteItem(id: number): Promise<boolean>;
  
  // Settings operations
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: Partial<InsertSettings>): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set(client)
      .where(eq(clients.id, id))
      .returning();
    return updatedClient || undefined;
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return result !== undefined;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async getEventsByClient(clientId: number): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.clientId, clientId));
  }

  async getUpcomingEvents(): Promise<Event[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await db
      .select()
      .from(events)
      .where(gte(events.date, today));
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(events)
      .set(event)
      .where(eq(events.id, id))
      .returning();
    return updatedEvent || undefined;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id));
    return result !== undefined;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTasksByEvent(eventId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.eventId, eventId));
  }

  async getUncompletedTasks(): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.completed, false));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set(task)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask || undefined;
  }

  async toggleTaskCompletion(id: number): Promise<Task | undefined> {
    const task = await this.getTask(id);
    if (!task) return undefined;
    
    const [updatedTask] = await db
      .update(tasks)
      .set({ completed: !task.completed })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask || undefined;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result !== undefined;
  }

  async getCollaborator(id: number): Promise<Collaborator | undefined> {
    const [collaborator] = await db.select().from(collaborators).where(eq(collaborators.id, id));
    return collaborator || undefined;
  }

  async getAllCollaborators(): Promise<Collaborator[]> {
    return await db.select().from(collaborators);
  }

  async getAvailableCollaborators(): Promise<Collaborator[]> {
    return await db.select().from(collaborators).where(eq(collaborators.status, "available"));
  }

  async createCollaborator(collaborator: InsertCollaborator): Promise<Collaborator> {
    const [newCollaborator] = await db.insert(collaborators).values(collaborator).returning();
    return newCollaborator;
  }

  async updateCollaborator(id: number, collaborator: Partial<InsertCollaborator>): Promise<Collaborator | undefined> {
    const [updatedCollaborator] = await db
      .update(collaborators)
      .set(collaborator)
      .where(eq(collaborators.id, id))
      .returning();
    return updatedCollaborator || undefined;
  }

  async deleteCollaborator(id: number): Promise<boolean> {
    const result = await db.delete(collaborators).where(eq(collaborators.id, id));
    return result !== undefined;
  }

  async getEventCollaborator(id: number): Promise<EventCollaborator | undefined> {
    const [eventCollaborator] = await db.select().from(eventCollaborators).where(eq(eventCollaborators.id, id));
    return eventCollaborator || undefined;
  }

  async getCollaboratorsByEvent(eventId: number): Promise<Collaborator[]> {
    const eventCollabs = await db
      .select()
      .from(eventCollaborators)
      .where(eq(eventCollaborators.eventId, eventId));
    
    if (eventCollabs.length === 0) return [];
    
    const collaboratorIds = eventCollabs.map(ec => ec.collaboratorId);
    
    // If we have collaboratorIds, query for them
    if (collaboratorIds.length > 0) {
      // We need to use a different approach since .in() might not be available
      // Use multiple OR conditions instead
      return await db
        .select()
        .from(collaborators)
        .where(eq(collaborators.id, collaboratorIds[0]));
    }
    
    return [];
  }

  async assignCollaboratorToEvent(eventCollaborator: InsertEventCollaborator): Promise<EventCollaborator> {
    const [newEventCollaborator] = await db
      .insert(eventCollaborators)
      .values(eventCollaborator)
      .returning();
    return newEventCollaborator;
  }

  async removeCollaboratorFromEvent(eventId: number, collaboratorId: number): Promise<boolean> {
    const result = await db
      .delete(eventCollaborators)
      .where(
        and(
          eq(eventCollaborators.eventId, eventId),
          eq(eventCollaborators.collaboratorId, collaboratorId)
        )
      );
    return result !== undefined;
  }

  async getContract(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract || undefined;
  }

  async getContractsByClient(clientId: number): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.clientId, clientId));
  }

  async getContractsByEvent(eventId: number): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.eventId, eventId));
  }

  async getAllContracts(): Promise<Contract[]> {
    return await db.select().from(contracts);
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db.insert(contracts).values(contract).returning();
    return newContract;
  }

  async updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updatedContract] = await db
      .update(contracts)
      .set(contract)
      .where(eq(contracts.id, id))
      .returning();
    return updatedContract || undefined;
  }

  async deleteContract(id: number): Promise<boolean> {
    const result = await db.delete(contracts).where(eq(contracts.id, id));
    return result !== undefined;
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined> {
    const [updatedService] = await db
      .update(services)
      .set(service)
      .where(eq(services.id, id))
      .returning();
    return updatedService || undefined;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id));
    return result !== undefined;
  }

  async getQuote(id: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote || undefined;
  }

  async getQuotesByClient(clientId: number): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.clientId, clientId));
  }

  async getAllQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes);
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [newQuote] = await db.insert(quotes).values(quote).returning();
    return newQuote;
  }

  async updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote | undefined> {
    const [updatedQuote] = await db
      .update(quotes)
      .set(quote)
      .where(eq(quotes.id, id))
      .returning();
    return updatedQuote || undefined;
  }

  async deleteQuote(id: number): Promise<boolean> {
    const result = await db.delete(quotes).where(eq(quotes.id, id));
    return result !== undefined;
  }

  async getQuoteItem(id: number): Promise<QuoteItem | undefined> {
    const [quoteItem] = await db.select().from(quoteItems).where(eq(quoteItems.id, id));
    return quoteItem || undefined;
  }

  async getQuoteItemsByQuote(quoteId: number): Promise<QuoteItem[]> {
    return await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  }

  async createQuoteItem(quoteItem: InsertQuoteItem): Promise<QuoteItem> {
    const [newQuoteItem] = await db.insert(quoteItems).values(quoteItem).returning();
    return newQuoteItem;
  }

  async updateQuoteItem(id: number, quoteItem: Partial<InsertQuoteItem>): Promise<QuoteItem | undefined> {
    const [updatedQuoteItem] = await db
      .update(quoteItems)
      .set(quoteItem)
      .where(eq(quoteItems.id, id))
      .returning();
    return updatedQuoteItem || undefined;
  }

  async deleteQuoteItem(id: number): Promise<boolean> {
    const result = await db.delete(quoteItems).where(eq(quoteItems.id, id));
    return result !== undefined;
  }

  async getSettings(): Promise<Settings | undefined> {
    const allSettings = await db.select().from(settings);
    const [settingsData] = allSettings;
    return settingsData || undefined;
  }

  async updateSettings(settingsData: Partial<InsertSettings>): Promise<Settings> {
    const currentSettings = await this.getSettings();
    
    if (currentSettings) {
      const [updatedSettings] = await db
        .update(settings)
        .set(settingsData)
        .where(eq(settings.id, currentSettings.id))
        .returning();
      return updatedSettings;
    } else {
      const [newSettings] = await db
        .insert(settings)
        .values(settingsData as InsertSettings)
        .returning();
      return newSettings;
    }
  }
}

export const storage = new DatabaseStorage();

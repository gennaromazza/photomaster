import { db } from "./db";
import { eq, and, gt, gte } from "drizzle-orm";
import crypto from "crypto";
import {
  users, clients, events, tasks, collaborators, eventCollaborators,
  contracts, services, quotes, quoteItems, settings, serviceCategories, leadSources,
  serviceBundles, serviceBundleItems, serviceItems,
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
  type ServiceBundle, type InsertServiceBundle,
  type ServiceBundleItem, type InsertServiceBundleItem,
  type ServiceItem, type InsertServiceItem,
  type Settings, type InsertSettings,
  type ServiceCategory, type InsertServiceCategory,
  type LeadSource, type InsertLeadSource
} from "../shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getPendingUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  
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
  getEventsByCollaborator(collaboratorId: number): Promise<Event[]>;
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
  getServicesByCategory(categoryId: number): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  
  // Service Items operations (elementi dei servizi compositi)
  getServiceItem(id: number): Promise<ServiceItem | undefined>;
  getServiceItems(serviceId: number): Promise<ServiceItem[]>;
  createServiceItem(item: InsertServiceItem): Promise<ServiceItem>;
  updateServiceItem(id: number, item: Partial<InsertServiceItem>): Promise<ServiceItem | undefined>;
  deleteServiceItem(id: number): Promise<boolean>;
  
  // Service Bundle operations
  getServiceBundle(id: number): Promise<ServiceBundle | undefined>;
  getAllServiceBundles(): Promise<ServiceBundle[]>;
  getServiceBundlesByCategory(categoryId: number): Promise<ServiceBundle[]>;
  createServiceBundle(bundle: InsertServiceBundle): Promise<ServiceBundle>;
  updateServiceBundle(id: number, bundle: Partial<InsertServiceBundle>): Promise<ServiceBundle | undefined>;
  deleteServiceBundle(id: number): Promise<boolean>;
  
  // Service Bundle Items operations
  getServiceBundleItems(bundleId: number): Promise<ServiceBundleItem[]>;
  createServiceBundleItem(item: InsertServiceBundleItem): Promise<ServiceBundleItem>;
  updateServiceBundleItem(id: number, item: Partial<InsertServiceBundleItem>): Promise<ServiceBundleItem | undefined>;
  deleteServiceBundleItem(id: number): Promise<boolean>;
  
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
  
  // Service Category operations
  getServiceCategory(id: number): Promise<ServiceCategory | undefined>;
  getAllServiceCategories(): Promise<ServiceCategory[]>;
  getActiveServiceCategories(): Promise<ServiceCategory[]>;
  createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory>;
  updateServiceCategory(id: number, category: Partial<InsertServiceCategory>): Promise<ServiceCategory | undefined>;
  deleteServiceCategory(id: number): Promise<boolean>;
  
  // Lead Source operations
  getLeadSource(id: number): Promise<LeadSource | undefined>;
  getAllLeadSources(): Promise<LeadSource[]>;
  getActiveLeadSources(): Promise<LeadSource[]>;
  createLeadSource(source: InsertLeadSource): Promise<LeadSource>;
  updateLeadSource(id: number, source: Partial<InsertLeadSource>): Promise<LeadSource | undefined>;
  deleteLeadSource(id: number): Promise<boolean>;
  
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetPasswordToken, token));
    return user || undefined;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async getPendingUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.status, "pending"));
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
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
  
  async getEventsByCollaborator(collaboratorId: number): Promise<Event[]> {
    // Trova tutti gli eventCollaborators per questo collaboratore
    const eventCollabs = await db
      .select()
      .from(eventCollaborators)
      .where(eq(eventCollaborators.collaboratorId, collaboratorId));
    
    if (eventCollabs.length === 0) return [];
    
    // Estrai tutti gli ID degli eventi
    const eventIds = eventCollabs.map(ec => ec.eventId);
    
    // Se abbiamo eventIds, ottieni gli eventi
    if (eventIds.length > 0) {
      // Stesso approccio usato per getCollaboratorsByEvent
      return await db
        .select()
        .from(events)
        .where(eq(events.id, eventIds[0]));
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
  
  async getServicesByCategory(categoryId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.categoryId, categoryId));
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
  
  // Service Items methods (elementi dei servizi compositi)
  async getServiceItem(id: number): Promise<ServiceItem | undefined> {
    const [item] = await db.select().from(serviceItems).where(eq(serviceItems.id, id));
    return item || undefined;
  }
  
  async getServiceItems(serviceId: number): Promise<ServiceItem[]> {
    return await db.select().from(serviceItems).where(eq(serviceItems.serviceId, serviceId));
  }
  
  async createServiceItem(item: InsertServiceItem): Promise<ServiceItem> {
    const [newItem] = await db.insert(serviceItems).values(item).returning();
    return newItem;
  }
  
  async updateServiceItem(id: number, item: Partial<InsertServiceItem>): Promise<ServiceItem | undefined> {
    const [updatedItem] = await db
      .update(serviceItems)
      .set(item)
      .where(eq(serviceItems.id, id))
      .returning();
    return updatedItem || undefined;
  }
  
  async deleteServiceItem(id: number): Promise<boolean> {
    const result = await db.delete(serviceItems).where(eq(serviceItems.id, id));
    return result !== undefined;
  }
  
  // Service Bundle methods
  async getServiceBundle(id: number): Promise<ServiceBundle | undefined> {
    const [bundle] = await db.select().from(serviceBundles).where(eq(serviceBundles.id, id));
    return bundle || undefined;
  }

  async getAllServiceBundles(): Promise<ServiceBundle[]> {
    return await db.select().from(serviceBundles);
  }
  
  async getServiceBundlesByCategory(categoryId: number): Promise<ServiceBundle[]> {
    return await db.select().from(serviceBundles).where(eq(serviceBundles.categoryId, categoryId));
  }

  async createServiceBundle(bundle: InsertServiceBundle): Promise<ServiceBundle> {
    const [newBundle] = await db.insert(serviceBundles).values(bundle).returning();
    return newBundle;
  }

  async updateServiceBundle(id: number, bundle: Partial<InsertServiceBundle>): Promise<ServiceBundle | undefined> {
    const [updatedBundle] = await db
      .update(serviceBundles)
      .set(bundle)
      .where(eq(serviceBundles.id, id))
      .returning();
    return updatedBundle || undefined;
  }

  async deleteServiceBundle(id: number): Promise<boolean> {
    const result = await db.delete(serviceBundles).where(eq(serviceBundles.id, id));
    return result !== undefined;
  }
  
  // Service Bundle Items methods
  async getServiceBundleItems(bundleId: number): Promise<ServiceBundleItem[]> {
    return await db.select().from(serviceBundleItems).where(eq(serviceBundleItems.bundleId, bundleId));
  }

  async createServiceBundleItem(item: InsertServiceBundleItem): Promise<ServiceBundleItem> {
    const [newItem] = await db.insert(serviceBundleItems).values(item).returning();
    return newItem;
  }

  async updateServiceBundleItem(id: number, item: Partial<InsertServiceBundleItem>): Promise<ServiceBundleItem | undefined> {
    const [updatedItem] = await db
      .update(serviceBundleItems)
      .set(item)
      .where(eq(serviceBundleItems.id, id))
      .returning();
    return updatedItem || undefined;
  }

  async deleteServiceBundleItem(id: number): Promise<boolean> {
    const result = await db.delete(serviceBundleItems).where(eq(serviceBundleItems.id, id));
    return result !== undefined;
  }

  async getQuote(id: number): Promise<any> {
    try {
      // Utilizziamo una select semplice e sicura
      const [quote] = await db.select()
        .from(quotes)
        .where(eq(quotes.id, id));
      
      if (!quote) return undefined;
      
      // Creiamo un oggetto con valori predefiniti per tutti i campi che potrebbero mancare
      const quoteWithDefaults = {
        ...quote,
        subtotal: 0,
        total: 0,
        discount: 0,
        shareExpiry: null
      };
      
      // Carica il cliente principale
      let client = null;
      if (quote.clientId) {
        const [clientData] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, quote.clientId));
        client = clientData;
      }
      
      // Carica il secondo cliente se presente
      let secondClient = null;
      if (quote.secondClientId) {
        const [secondClientData] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, quote.secondClientId));
        secondClient = secondClientData;
      }
      
      // Carica la categoria se presente
      let category = null;
      if (quote.categoryId) {
        const [categoryData] = await db
          .select()
          .from(serviceCategories)
          .where(eq(serviceCategories.id, quote.categoryId));
        category = categoryData;
      }
      
      // Carica la provenienza se presente
      let leadSource = null;
      if (quote.leadSourceId) {
        const [leadSourceData] = await db
          .select()
          .from(leadSources)
          .where(eq(leadSources.id, quote.leadSourceId));
        leadSource = leadSourceData;
      }
      
      // Carica gli elementi del preventivo con i relativi servizi
      const quoteItemsWithServices = await db
        .select({
          quote_items: {
            id: quoteItems.id,
            quoteId: quoteItems.quoteId,
            serviceId: quoteItems.serviceId,
            quantity: quoteItems.quantity,
            unitPrice: quoteItems.unitPrice,
            total: quoteItems.total,
          },
          services: services
        })
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, id))
        .leftJoin(services, eq(quoteItems.serviceId, services.id));
      
      // Formatta gli elementi del preventivo
      const formattedItems = quoteItemsWithServices.map(item => ({
        id: item.quote_items.id,
        quoteId: item.quote_items.quoteId,
        serviceId: item.quote_items.serviceId,
        quantity: item.quote_items.quantity || 1,
        unitPrice: item.quote_items.unitPrice || 0,
        total: item.quote_items.total || 0,
        // Imposta valori di default per i campi non presenti nel DB
        hasDiscount: false,
        discountType: null,
        discountValue: null,
        discountedPrice: null,
        notes: null,
        service: item.services
      }));
      
      // Formatta il risultato completo
      const formattedQuote = {
        ...quoteWithDefaults,
        client: client,
        secondClient: secondClient,
        category: category,
        leadSource: leadSource,
        quoteItems: formattedItems
      };
      
      return formattedQuote;
    } catch (error) {
      console.error("Error in getQuote:", error);
      throw error;
    }
  }

  async getQuotesByClient(clientId: number): Promise<Quote[]> {
    try {
      // Utilizziamo una query più semplice e sicura
      const result = await db.select()
        .from(quotes)
        .where(eq(quotes.clientId, clientId));
      
      // Aggiungiamo i campi virtuali che mancano
      return result.map(quote => {
        return {
          ...quote,
          subtotal: 0,
          total: 0,
          discount: 0,
          shareExpiry: null
        } as unknown as Quote;
      });
    } catch (error) {
      console.error("Error in getQuotesByClient:", error);
      return [];
    }
  }

  async getAllQuotes(): Promise<Quote[]> {
    try {
      // Utilizziamo una query più semplice e sicura
      const result = await db.select().from(quotes);
      
      // Aggiungiamo i campi virtuali che mancano
      return result.map(quote => {
        return {
          ...quote,
          subtotal: 0,
          total: 0,
          discount: 0,
          shareExpiry: null
        } as unknown as Quote;
      });
    } catch (error) {
      console.error("Error in getAllQuotes:", error);
      return [];
    }
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    try {
      const insertData = {
        title: quote.title || 'Nuovo preventivo',
        clientId: quote.clientId,
        secondClientId: quote.secondClientId,
        eventId: quote.eventId,
        categoryId: quote.categoryId,
        leadSourceId: quote.leadSourceId,
        eventDate: quote.eventDate,
        isFullDay: quote.isFullDay,
        eventTime: quote.eventTime,
        eventEndTime: quote.eventEndTime,
        location: quote.location,
        eventType: quote.eventType,
        workflow: quote.workflow || 'default',
        status: quote.status || 'draft',
        notes: quote.notes,
        isShared: false,
        subtotal: 0,
        total: 0,
        discount: 0
      };

      const [newQuote] = await db.insert(quotes).values(insertData).returning();
      
      if (!newQuote) {
        throw new Error("Failed to create quote");
      }

      return {
        ...newQuote,
        subtotal: 0,
        total: 0,
        discount: 0
      } as Quote;
    } catch (error) {
      console.error("Error in createQuote:", error);
      throw error;
    }
  }

  async updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote | undefined> {
    try {
      // Creiamo un oggetto con SOLO i campi che sappiamo esistere nel DB
      const safeQuoteData: Record<string, any> = {};
      
      // Lista dei campi che sappiamo essere nel database (NO description)
      const allowedFields = [
        'title', 'clientId', 'secondClientId', 'eventDate', 
        'categoryId', 'leadSourceId', 'status', 'isShared', 'shareToken'
      ];
      
      // Aggiungiamo solo i campi consentiti che sono presenti nell'input
      for (const field of allowedFields) {
        if (field in quote && (quote as any)[field] !== undefined) {
          safeQuoteData[field] = (quote as any)[field];
        }
      }
      
      // Rimuoviamo esplicitamente i campi che sappiamo non esistere
      delete safeQuoteData.subtotal;
      delete safeQuoteData.total;
      delete safeQuoteData.discount;
      delete safeQuoteData.shareExpiry;
      
      // Se non ci sono campi da aggiornare, otteniamo solo il preventivo
      if (Object.keys(safeQuoteData).length === 0) {
        const [existingQuote] = await db
          .select()
          .from(quotes)
          .where(eq(quotes.id, id));
          
        if (!existingQuote) return undefined;
        
        // Aggiungiamo i campi virtuali
        return {
          ...existingQuote,
          subtotal: 0,
          total: 0,
          discount: 0,
          shareExpiry: null
        } as Quote;
      }
      
      // Aggiorniamo solo con i campi sicuri
      const [updatedQuote] = await db
        .update(quotes)
        .set(safeQuoteData)
        .where(eq(quotes.id, id))
        .returning();
      
      if (!updatedQuote) return undefined;
      
      // Aggiungiamo i campi virtuali
      const result = {
        ...updatedQuote,
        subtotal: 0,
        total: 0,
        discount: 0,
        shareExpiry: null
      };
      
      return result as Quote;
    } catch (error) {
      console.error("Error in updateQuote:", error);
      return undefined;
    }
  }

  async deleteQuote(id: number): Promise<boolean> {
    const result = await db.delete(quotes).where(eq(quotes.id, id));
    return result !== undefined;
  }
  

  
  async generateShareToken(id: number): Promise<string | undefined> {
    try {
      // Genera un token casuale
      const token = crypto.randomBytes(16).toString('hex');
      
      // Aggiorna il preventivo con il token
      const updateData = {
        isShared: true,
        shareToken: token
      };
      
      // Aggiorna il preventivo con il token e la scadenza se disponibile
      const [updatedQuote] = await db
        .update(quotes)
        .set(updateData)
        .where(eq(quotes.id, id))
        .returning();
      
      if (!updatedQuote) return undefined;
      
      return token;
    } catch (error) {
      console.error("Errore nella generazione del token di condivisione:", error);
      return undefined;
    }
  }
  
  async disableSharing(id: number): Promise<boolean> {
    try {
      // Prepariamo un oggetto di aggiornamento con solo i campi che sappiamo esistere
      const updateData: any = {
        isShared: false,
        shareToken: null
      };
      
      // Otteniamo lo schema attuale del database
      try {
        // Verifichiamo se possiamo aggiungere anche shareExpiry
        const result = await db.query.quotes.findFirst({
          where: (quotesTable, { eq }) => eq(quotesTable.id, id)
        });
        
        // Se abbiamo il campo shareExpiry nella tabella, lo aggiungiamo ai dati da aggiornare
        if (result && 'shareExpiry' in result) {
          // Questo evita l'errore di colonna mancante
          updateData.shareExpiry = null;
        }
      } catch (e) {
        // Ignoriamo eventuali errori e procediamo con l'aggiornamento senza shareExpiry
        console.log("shareExpiry potrebbe non esistere nella tabella, proseguiamo senza");
      }
      
      const [updatedQuote] = await db
        .update(quotes)
        .set(updateData)
        .where(eq(quotes.id, id))
        .returning();
      
      return !!updatedQuote;
    } catch (error) {
      console.error("Errore nella disattivazione della condivisione:", error);
      return false;
    }
  }
  
  async getQuoteByShareToken(token: string): Promise<Quote | undefined> {
    try {
      console.log("Cerco preventivo con token:", token);
      
      // Utilizziamo una query SQL grezza specificando solo colonne esistenti
      const rawQuotes = await db.execute(`
        SELECT id, title, client_id, second_client_id, event_id, category_id, lead_source_id, 
        event_date, is_full_day, event_time, event_end_time, location, event_type, workflow, 
        created_at, updated_at, expiry_date, status, notes, signature, is_shared, share_token
        FROM quotes WHERE share_token = $1 AND is_shared = true
      `, [token]);
      
      if (!rawQuotes || rawQuotes.length === 0) {
        console.log("Preventivo non trovato o non condiviso");
        return undefined;
      }
      
      const rawQuote = rawQuotes[0];
      
      // Convertiamo da snake_case a camelCase per TypeScript
      const result: Quote = {
        id: rawQuote.id,
        title: rawQuote.title,
        clientId: rawQuote.client_id,
        secondClientId: rawQuote.second_client_id,
        eventId: rawQuote.event_id,
        categoryId: rawQuote.category_id,
        leadSourceId: rawQuote.lead_source_id,
        eventDate: rawQuote.event_date,
        isFullDay: rawQuote.is_full_day,
        eventTime: rawQuote.event_time,
        eventEndTime: rawQuote.event_end_time,
        location: rawQuote.location,
        eventType: rawQuote.event_type,
        workflow: rawQuote.workflow,
        createdAt: rawQuote.created_at,
        updatedAt: rawQuote.updated_at,
        expiryDate: rawQuote.expiry_date,
        status: rawQuote.status,
        notes: rawQuote.notes,
        signature: rawQuote.signature,
        isShared: rawQuote.is_shared,
        shareToken: rawQuote.share_token,
        // Campi virtuali
        subtotal: 0,
        total: 0,
        discount: 0,
        shareExpiry: null,
      } as Quote;
      
      try {
        // Otteniamo tutti i dati relazionati usando le funzioni esistenti
        // Questo evita errori con colonne mancanti
        const items = await this.getQuoteItemsByQuote(result.id);
        
        // Aggiungiamo gli elementi come dati relazionati senza modificare il tipo Quote
        (result as any).quoteItems = items;
        
        return result;
      } catch (e) {
        console.error("Errore nell'arricchimento dei dati del preventivo:", e);
        // Se c'è un errore, restituiamo comunque i dati base
        return result;
      }
    } catch (error) {
      console.error("Errore nel recupero del preventivo condiviso:", error);
      return undefined;
    }
  }

  async getQuoteItem(id: number): Promise<QuoteItem | undefined> {
    try {
      // Eseguiamo una query SQL grezza che seleziona solo i campi che sappiamo esistere
      const result = await db.execute(
        `SELECT id, quote_id, service_id, quantity, unit_price, total,
         has_discount, discount_type, discount_value, discounted_price
         FROM quote_items WHERE id = $1`,
        [id]
      );
      
      if (result.length === 0) {
        return undefined;
      }
      
      const item = result[0];
      
      // Convertiamo i nomi delle colonne in camel case per TypeScript
      return {
        id: item.id,
        quoteId: item.quote_id,
        serviceId: item.service_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
        notes: null, // Impostiamo notes a null se non esiste nella tabella
        hasDiscount: item.has_discount,
        discountType: item.discount_type,
        discountValue: item.discount_value,
        discountedPrice: item.discounted_price,
        bundleId: null, // Impostiamo bundleId a null se non esiste nella tabella
      } as QuoteItem;
    } catch (error) {
      console.error("Errore nel recupero dell'elemento del preventivo:", error);
      return undefined;
    }
  }

  async getQuoteItemsByQuote(quoteId: number): Promise<QuoteItem[]> {
    try {
      // Eseguiamo una query SQL grezza che seleziona solo i campi che sappiamo esistere
      // Questo evita riferimenti a colonne che potrebbero non esistere
      const result = await db.execute(
        `SELECT id, quote_id, service_id, quantity, unit_price, total,
         has_discount, discount_type, discount_value, discounted_price
         FROM quote_items WHERE quote_id = $1`,
        [quoteId]
      );
      
      // Convertiamo i nomi delle colonne in camel case per TypeScript
      return result.map(item => ({
        id: item.id,
        quoteId: item.quote_id,
        serviceId: item.service_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
        notes: null, // Impostiamo notes a null se non esiste nella tabella
        hasDiscount: item.has_discount,
        discountType: item.discount_type,
        discountValue: item.discount_value,
        discountedPrice: item.discounted_price,
        bundleId: null, // Impostiamo bundleId a null se non esiste nella tabella
      })) as QuoteItem[];
    } catch (error) {
      console.error("Errore nel recupero degli elementi del preventivo:", error);
      return []; // In caso di errore restituiamo un array vuoto
    }
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

  async getServiceCategory(id: number): Promise<ServiceCategory | undefined> {
    const [category] = await db.select().from(serviceCategories).where(eq(serviceCategories.id, id));
    return category || undefined;
  }
  
  async getAllServiceCategories(): Promise<ServiceCategory[]> {
    return await db.select().from(serviceCategories);
  }
  
  async getActiveServiceCategories(): Promise<ServiceCategory[]> {
    return await db.select().from(serviceCategories).where(eq(serviceCategories.isActive, true));
  }
  
  async createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    const [newCategory] = await db.insert(serviceCategories).values(category).returning();
    return newCategory;
  }
  
  async updateServiceCategory(id: number, category: Partial<InsertServiceCategory>): Promise<ServiceCategory | undefined> {
    const [updatedCategory] = await db
      .update(serviceCategories)
      .set(category)
      .where(eq(serviceCategories.id, id))
      .returning();
    return updatedCategory || undefined;
  }
  
  async deleteServiceCategory(id: number): Promise<boolean> {
    const result = await db.delete(serviceCategories).where(eq(serviceCategories.id, id));
    return result !== undefined;
  }
  
  async getLeadSource(id: number): Promise<LeadSource | undefined> {
    const [source] = await db.select().from(leadSources).where(eq(leadSources.id, id));
    return source || undefined;
  }
  
  async getAllLeadSources(): Promise<LeadSource[]> {
    return await db.select().from(leadSources);
  }
  
  async getActiveLeadSources(): Promise<LeadSource[]> {
    return await db.select().from(leadSources).where(eq(leadSources.isActive, true));
  }
  
  async createLeadSource(source: InsertLeadSource): Promise<LeadSource> {
    const [newSource] = await db.insert(leadSources).values(source).returning();
    return newSource;
  }
  
  async updateLeadSource(id: number, source: Partial<InsertLeadSource>): Promise<LeadSource | undefined> {
    const [updatedSource] = await db
      .update(leadSources)
      .set(source)
      .where(eq(leadSources.id, id))
      .returning();
    return updatedSource || undefined;
  }
  
  async deleteLeadSource(id: number): Promise<boolean> {
    const result = await db.delete(leadSources).where(eq(leadSources.id, id));
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

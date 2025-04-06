import {
  users, type User, type InsertUser,
  clients, type Client, type InsertClient,
  events, type Event, type InsertEvent,
  tasks, type Task, type InsertTask,
  collaborators, type Collaborator, type InsertCollaborator,
  eventCollaborators, type EventCollaborator, type InsertEventCollaborator,
  contracts, type Contract, type InsertContract,
  services, type Service, type InsertService,
  quotes, type Quote, type InsertQuote,
  quoteItems, type QuoteItem, type InsertQuoteItem,
  settings, type Settings, type InsertSettings
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private events: Map<number, Event>;
  private tasks: Map<number, Task>;
  private collaborators: Map<number, Collaborator>;
  private eventCollaborators: Map<number, EventCollaborator>;
  private contracts: Map<number, Contract>;
  private services: Map<number, Service>;
  private quotes: Map<number, Quote>;
  private quoteItems: Map<number, QuoteItem>;
  private settingsData: Settings | undefined;
  
  private userCurrentId: number;
  private clientCurrentId: number;
  private eventCurrentId: number;
  private taskCurrentId: number;
  private collaboratorCurrentId: number;
  private eventCollaboratorCurrentId: number;
  private contractCurrentId: number;
  private serviceCurrentId: number;
  private quoteCurrentId: number;
  private quoteItemCurrentId: number;
  private settingsCurrentId: number;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.events = new Map();
    this.tasks = new Map();
    this.collaborators = new Map();
    this.eventCollaborators = new Map();
    this.contracts = new Map();
    this.services = new Map();
    this.quotes = new Map();
    this.quoteItems = new Map();
    
    this.userCurrentId = 1;
    this.clientCurrentId = 1;
    this.eventCurrentId = 1;
    this.taskCurrentId = 1;
    this.collaboratorCurrentId = 1;
    this.eventCollaboratorCurrentId = 1;
    this.contractCurrentId = 1;
    this.serviceCurrentId = 1;
    this.quoteCurrentId = 1;
    this.quoteItemCurrentId = 1;
    this.settingsCurrentId = 1;
    
    // Add sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create a default user (admin)
    this.createUser({
      username: "admin",
      password: "admin",
      fullName: "Marco Rossi",
      email: "admin@example.com",
      role: "admin",
      profileImage: ""
    });
    
    // Create sample clients
    this.createClient({
      firstName: "Giovanni",
      lastName: "Bianchi",
      email: "giovanni.bianchi@example.com",
      phone: "+39 123 456 7890",
      address: "Via Roma 123, Milano",
      notes: "Matrimonio previsto per giugno"
    });
    
    this.createClient({
      firstName: "Lucia",
      lastName: "Verdi",
      email: "lucia.verdi@example.com",
      phone: "+39 098 765 4321",
      address: "Via Dante 45, Roma",
      notes: "Matrimonio previsto a Castello Odescalchi"
    });
    
    this.createClient({
      firstName: "Marco",
      lastName: "Rossi",
      email: "marco.rossi@example.com",
      phone: "+39 111 222 3333",
      address: "Via Garibaldi 78, Firenze",
      notes: "Interessato a servizi fotografici per eventi aziendali"
    });
    
    // Create sample events
    const now = new Date();
    
    this.createEvent({
      title: "Matrimonio Bianchi",
      description: "Matrimonio di Giovanni e Maria",
      eventType: "wedding",
      clientId: 1,
      date: new Date(now.getFullYear(), now.getMonth(), 10),
      location: "Villa Principe, Roma",
      status: "in-progress",
      coverImage: ""
    });
    
    this.createEvent({
      title: "Matrimonio Verdi",
      description: "Matrimonio di Lucia e Paolo",
      eventType: "wedding",
      clientId: 2,
      date: new Date(now.getFullYear(), now.getMonth(), 15),
      location: "Castello Odescalchi, Bracciano",
      status: "upcoming",
      coverImage: ""
    });
    
    this.createEvent({
      title: "Shooting Moda Estate",
      description: "Servizio fotografico collezione estiva",
      eventType: "fashion",
      clientId: 3,
      date: new Date(now.getFullYear(), now.getMonth(), 2),
      location: "Studio Milano",
      status: "completed",
      coverImage: ""
    });
    
    // Create sample tasks
    this.createTask({
      title: "Inviare contratto Matrimonio Verdi",
      description: "Preparare e inviare il contratto per il matrimonio dei Verdi",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      eventId: 2,
      status: "pending",
      completed: false,
      priority: "high"
    });
    
    this.createTask({
      title: "Selezionare foto Shooting Moda",
      description: "Fare una selezione delle foto migliori dello shooting",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      eventId: 3,
      status: "pending",
      completed: false,
      priority: "medium"
    });
    
    this.createTask({
      title: "Contattare location Matrimonio Rossi",
      description: "Verificare disponibilità e dettagli logistici",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
      eventId: null,
      status: "pending",
      completed: false,
      priority: "medium"
    });
    
    this.createTask({
      title: "Preparare preventivo Mostra Arte",
      description: "Calcolare costi e preparare preventivo dettagliato",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
      eventId: null,
      status: "pending",
      completed: false,
      priority: "low"
    });
    
    // Create sample collaborators
    this.createCollaborator({
      firstName: "Anna",
      lastName: "Rossi",
      email: "anna.rossi@example.com",
      phone: "+39 333 444 5555",
      role: "Fotografa",
      profileImage: "",
      status: "available"
    });
    
    this.createCollaborator({
      firstName: "Luca",
      lastName: "Bianchi",
      email: "luca.bianchi@example.com",
      phone: "+39 666 777 8888",
      role: "Assistente",
      profileImage: "",
      status: "busy"
    });
    
    this.createCollaborator({
      firstName: "Paolo",
      lastName: "Verdi",
      email: "paolo.verdi@example.com",
      phone: "+39 999 000 1111",
      role: "Videomaker",
      profileImage: "",
      status: "available"
    });
    
    // Assign collaborators to events
    this.assignCollaboratorToEvent({
      eventId: 1,
      collaboratorId: 1,
      role: "Fotografa principale"
    });
    
    this.assignCollaboratorToEvent({
      eventId: 1,
      collaboratorId: 3,
      role: "Videomaker"
    });
    
    this.assignCollaboratorToEvent({
      eventId: 2,
      collaboratorId: 1,
      role: "Fotografa principale"
    });
    
    this.assignCollaboratorToEvent({
      eventId: 2,
      collaboratorId: 2,
      role: "Assistente"
    });
    
    // Create sample contracts
    this.createContract({
      title: "Contratto Matrimonio Bianchi",
      content: "Contenuto dettagliato del contratto per il matrimonio dei Bianchi",
      eventId: 1,
      clientId: 1,
      status: "signed",
      signedByClient: true,
      signedByAdmin: true,
      signatureDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      signatureUrl: ""
    });
    
    this.createContract({
      title: "Contratto Matrimonio Verdi",
      content: "Contenuto dettagliato del contratto per il matrimonio dei Verdi",
      eventId: 2,
      clientId: 2,
      status: "pending",
      signedByClient: false,
      signedByAdmin: true,
      signatureDate: null,
      signatureUrl: ""
    });
    
    this.createContract({
      title: "Contratto Shooting Moda",
      content: "Contenuto dettagliato del contratto per lo shooting moda",
      eventId: 3,
      clientId: 3,
      status: "signed",
      signedByClient: true,
      signedByAdmin: true,
      signatureDate: new Date(now.getFullYear(), now.getMonth() - 2, 5),
      signatureUrl: ""
    });
    
    // Create sample services
    this.createService({
      name: "Pacchetto Matrimonio Standard",
      description: "Servizio fotografico completo per matrimonio, 8 ore di copertura",
      price: 1800,
      type: "package",
      image: ""
    });
    
    this.createService({
      name: "Pacchetto Matrimonio Premium",
      description: "Servizio fotografico e video completo per matrimonio, 12 ore di copertura",
      price: 2800,
      type: "package",
      image: ""
    });
    
    this.createService({
      name: "Album Fotografico 30x30",
      description: "Album fotografico di alta qualità, 30 pagine",
      price: 350,
      type: "product",
      image: ""
    });
    
    this.createService({
      name: "Servizio Engagement",
      description: "Servizio fotografico pre-matrimoniale, 2 ore",
      price: 300,
      type: "service",
      image: ""
    });
    
    // Create a sample quote
    this.createQuote({
      title: "Preventivo Matrimonio Verdi",
      clientId: 2,
      eventId: 2,
      expiryDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
      status: "sent",
      subtotal: 3150,
      tax: 693,
      discount: 200,
      total: 3643,
      notes: "Offerta speciale per il pacchetto premium"
    });
    
    // Add items to the quote
    this.createQuoteItem({
      quoteId: 1,
      serviceId: 2,
      quantity: 1,
      unitPrice: 2800,
      total: 2800
    });
    
    this.createQuoteItem({
      quoteId: 1,
      serviceId: 3,
      quantity: 1,
      unitPrice: 350,
      total: 350
    });
    
    // Create settings
    this.updateSettings({
      companyName: "Studio Arté",
      companyEmail: "info@studioarte.com",
      companyPhone: "+39 02 1234567",
      companyAddress: "Via della Fotografia 42, Milano",
      companyLogo: "",
      taxRate: 22,
      defaultCurrency: "EUR",
      colorTheme: "default"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
  
  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  
  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    const id = this.clientCurrentId++;
    const now = new Date();
    const newClient: Client = { ...client, id, createdAt: now };
    this.clients.set(id, newClient);
    return newClient;
  }
  
  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    const existingClient = this.clients.get(id);
    if (!existingClient) return undefined;
    
    const updatedClient: Client = {
      ...existingClient,
      ...client,
    };
    
    this.clients.set(id, updatedClient);
    return updatedClient;
  }
  
  async deleteClient(id: number): Promise<boolean> {
    return this.clients.delete(id);
  }
  
  // Event operations
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }
  
  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }
  
  async getEventsByClient(clientId: number): Promise<Event[]> {
    return Array.from(this.events.values()).filter(event => event.clientId === clientId);
  }
  
  async getUpcomingEvents(): Promise<Event[]> {
    const now = new Date();
    return Array.from(this.events.values())
      .filter(event => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  
  async createEvent(event: InsertEvent): Promise<Event> {
    const id = this.eventCurrentId++;
    const newEvent: Event = { ...event, id };
    this.events.set(id, newEvent);
    return newEvent;
  }
  
  async updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const existingEvent = this.events.get(id);
    if (!existingEvent) return undefined;
    
    const updatedEvent: Event = {
      ...existingEvent,
      ...event,
    };
    
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }
  
  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }
  
  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }
  
  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }
  
  async getTasksByEvent(eventId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.eventId === eventId);
  }
  
  async getUncompletedTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => !task.completed)
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }
  
  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskCurrentId++;
    const newTask: Task = { ...task, id };
    this.tasks.set(id, newTask);
    return newTask;
  }
  
  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;
    
    const updatedTask: Task = {
      ...existingTask,
      ...task,
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async toggleTaskCompletion(id: number): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask: Task = {
      ...task,
      completed: !task.completed,
      status: !task.completed ? 'completed' : 'pending'
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }
  
  // Collaborator operations
  async getCollaborator(id: number): Promise<Collaborator | undefined> {
    return this.collaborators.get(id);
  }
  
  async getAllCollaborators(): Promise<Collaborator[]> {
    return Array.from(this.collaborators.values());
  }
  
  async getAvailableCollaborators(): Promise<Collaborator[]> {
    return Array.from(this.collaborators.values()).filter(collaborator => 
      collaborator.status === 'available'
    );
  }
  
  async createCollaborator(collaborator: InsertCollaborator): Promise<Collaborator> {
    const id = this.collaboratorCurrentId++;
    const newCollaborator: Collaborator = { ...collaborator, id };
    this.collaborators.set(id, newCollaborator);
    return newCollaborator;
  }
  
  async updateCollaborator(id: number, collaborator: Partial<InsertCollaborator>): Promise<Collaborator | undefined> {
    const existingCollaborator = this.collaborators.get(id);
    if (!existingCollaborator) return undefined;
    
    const updatedCollaborator: Collaborator = {
      ...existingCollaborator,
      ...collaborator,
    };
    
    this.collaborators.set(id, updatedCollaborator);
    return updatedCollaborator;
  }
  
  async deleteCollaborator(id: number): Promise<boolean> {
    return this.collaborators.delete(id);
  }
  
  // EventCollaborator operations
  async getEventCollaborator(id: number): Promise<EventCollaborator | undefined> {
    return this.eventCollaborators.get(id);
  }
  
  async getCollaboratorsByEvent(eventId: number): Promise<Collaborator[]> {
    const eventCollaboratorEntries = Array.from(this.eventCollaborators.values())
      .filter(ec => ec.eventId === eventId);
      
    const collaborators: Collaborator[] = [];
    
    for (const entry of eventCollaboratorEntries) {
      const collaborator = this.collaborators.get(entry.collaboratorId);
      if (collaborator) {
        collaborators.push(collaborator);
      }
    }
    
    return collaborators;
  }
  
  async assignCollaboratorToEvent(eventCollaborator: InsertEventCollaborator): Promise<EventCollaborator> {
    const id = this.eventCollaboratorCurrentId++;
    const newEventCollaborator: EventCollaborator = { ...eventCollaborator, id };
    this.eventCollaborators.set(id, newEventCollaborator);
    return newEventCollaborator;
  }
  
  async removeCollaboratorFromEvent(eventId: number, collaboratorId: number): Promise<boolean> {
    const entries = Array.from(this.eventCollaborators.entries());
    
    for (const [key, entry] of entries) {
      if (entry.eventId === eventId && entry.collaboratorId === collaboratorId) {
        return this.eventCollaborators.delete(key);
      }
    }
    
    return false;
  }
  
  // Contract operations
  async getContract(id: number): Promise<Contract | undefined> {
    return this.contracts.get(id);
  }
  
  async getContractsByClient(clientId: number): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(contract => 
      contract.clientId === clientId
    );
  }
  
  async getContractsByEvent(eventId: number): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(contract => 
      contract.eventId === eventId
    );
  }
  
  async getAllContracts(): Promise<Contract[]> {
    return Array.from(this.contracts.values());
  }
  
  async createContract(contract: InsertContract): Promise<Contract> {
    const id = this.contractCurrentId++;
    const now = new Date();
    const newContract: Contract = { ...contract, id, createdAt: now };
    this.contracts.set(id, newContract);
    return newContract;
  }
  
  async updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const existingContract = this.contracts.get(id);
    if (!existingContract) return undefined;
    
    const updatedContract: Contract = {
      ...existingContract,
      ...contract,
    };
    
    this.contracts.set(id, updatedContract);
    return updatedContract;
  }
  
  async deleteContract(id: number): Promise<boolean> {
    return this.contracts.delete(id);
  }
  
  // Service operations
  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }
  
  async getAllServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }
  
  async createService(service: InsertService): Promise<Service> {
    const id = this.serviceCurrentId++;
    const newService: Service = { ...service, id };
    this.services.set(id, newService);
    return newService;
  }
  
  async updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined> {
    const existingService = this.services.get(id);
    if (!existingService) return undefined;
    
    const updatedService: Service = {
      ...existingService,
      ...service,
    };
    
    this.services.set(id, updatedService);
    return updatedService;
  }
  
  async deleteService(id: number): Promise<boolean> {
    return this.services.delete(id);
  }
  
  // Quote operations
  async getQuote(id: number): Promise<Quote | undefined> {
    return this.quotes.get(id);
  }
  
  async getQuotesByClient(clientId: number): Promise<Quote[]> {
    return Array.from(this.quotes.values()).filter(quote => 
      quote.clientId === clientId
    );
  }
  
  async getAllQuotes(): Promise<Quote[]> {
    return Array.from(this.quotes.values());
  }
  
  async createQuote(quote: InsertQuote): Promise<Quote> {
    const id = this.quoteCurrentId++;
    const now = new Date();
    const newQuote: Quote = { ...quote, id, createdAt: now };
    this.quotes.set(id, newQuote);
    return newQuote;
  }
  
  async updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote | undefined> {
    const existingQuote = this.quotes.get(id);
    if (!existingQuote) return undefined;
    
    const updatedQuote: Quote = {
      ...existingQuote,
      ...quote,
    };
    
    this.quotes.set(id, updatedQuote);
    return updatedQuote;
  }
  
  async deleteQuote(id: number): Promise<boolean> {
    return this.quotes.delete(id);
  }
  
  // Quote Item operations
  async getQuoteItem(id: number): Promise<QuoteItem | undefined> {
    return this.quoteItems.get(id);
  }
  
  async getQuoteItemsByQuote(quoteId: number): Promise<QuoteItem[]> {
    return Array.from(this.quoteItems.values()).filter(item => 
      item.quoteId === quoteId
    );
  }
  
  async createQuoteItem(quoteItem: InsertQuoteItem): Promise<QuoteItem> {
    const id = this.quoteItemCurrentId++;
    const newQuoteItem: QuoteItem = { ...quoteItem, id };
    this.quoteItems.set(id, newQuoteItem);
    return newQuoteItem;
  }
  
  async updateQuoteItem(id: number, quoteItem: Partial<InsertQuoteItem>): Promise<QuoteItem | undefined> {
    const existingQuoteItem = this.quoteItems.get(id);
    if (!existingQuoteItem) return undefined;
    
    const updatedQuoteItem: QuoteItem = {
      ...existingQuoteItem,
      ...quoteItem,
    };
    
    this.quoteItems.set(id, updatedQuoteItem);
    return updatedQuoteItem;
  }
  
  async deleteQuoteItem(id: number): Promise<boolean> {
    return this.quoteItems.delete(id);
  }
  
  // Settings operations
  async getSettings(): Promise<Settings | undefined> {
    // Return the first settings object (we should only have one)
    return this.settingsData;
  }
  
  async updateSettings(settings: Partial<InsertSettings>): Promise<Settings> {
    if (!this.settingsData) {
      const id = this.settingsCurrentId++;
      this.settingsData = {
        id,
        companyName: settings.companyName || "Studio Fotografico",
        companyEmail: settings.companyEmail || "info@studiofotografico.com",
        companyPhone: settings.companyPhone || "",
        companyAddress: settings.companyAddress || "",
        companyLogo: settings.companyLogo || "",
        contractTemplate: settings.contractTemplate || "",
        quoteTemplate: settings.quoteTemplate || "",
        taxRate: settings.taxRate ?? 0,
        defaultCurrency: settings.defaultCurrency || "EUR",
        colorTheme: settings.colorTheme || "default",
        additionalSettings: settings.additionalSettings || null
      };
    } else {
      this.settingsData = {
        ...this.settingsData,
        ...settings
      };
    }
    
    return this.settingsData;
  }
}

export const storage = new MemStorage();

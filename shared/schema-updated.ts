import { relations } from "drizzle-orm";
import { pgTable, serial, text, integer, boolean, timestamp, numeric, jsonb, date, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tabella utenti
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  email: text("email"),
  role: text("role").default("user").notNull(), // admin, staff, user
  approved: boolean("approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Altri campi utente
  phoneNumber: text("phone_number"),
  profilePicture: text("profile_picture"),
  lastLogin: timestamp("last_login"),
  active: boolean("active").default(true).notNull(),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  role: true,
  approved: true,
  phoneNumber: true,
  profilePicture: true,
  active: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Tabella clienti
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country").default("IT"),
  notes: text("notes"),
  leadSourceId: integer("lead_source_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  taxCode: text("tax_code"), // codice fiscale
  vatNumber: text("vat_number"), // partita IVA
  pec: text("pec"), // Posta Elettronica Certificata
  sdiCode: text("sdi_code"), // Codice SDI per fatturazione elettronica
  birthDate: date("birth_date"),
  birthPlace: text("birth_place"),
  // Dati aggiuntivi organizzati in JSON
  additionalData: jsonb("additional_data"),
  // Meta informazioni
  isArchived: boolean("is_archived").default(false).notNull(),
  isCompany: boolean("is_company").default(false).notNull(),
  companyName: text("company_name"),
});

export const insertClientSchema = createInsertSchema(clients).pick({
  firstName: true, 
  lastName: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  postalCode: true,
  country: true,
  notes: true,
  leadSourceId: true,
  taxCode: true,
  vatNumber: true,
  pec: true,
  sdiCode: true,
  birthDate: true,
  birthPlace: true,
  additionalData: true,
  isArchived: true,
  isCompany: true,
  companyName: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export const clientsRelations = relations(clients, ({ many }) => ({
  events: many(events),
  quotes: many(quotes),
}));

// SCHEMA EVENTI
// Base schema without transforms
const baseEventInsertSchema = createInsertSchema(events).pick({
  title: true,
  description: true,
  location: true,
  startDate: true,
  endDate: true,
  allDay: true,
  status: true,
  eventType: true,
  clientId: true,
  color: true,
  notes: true,
  additionalData: true,
  isArchived: true
});

export const insertEventSchema = baseEventInsertSchema.transform((event) => ({
  ...event,
  endDate: event.endDate ?? event.startDate,
}));

export const partialEventSchema = baseEventInsertSchema.partial();

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export const eventsRelations = relations(events, ({ one, many }) => ({
  client: one(clients, {
    fields: [events.clientId],
    references: [clients.id],
  }),
  tasks: many(tasks),
  collaborators: many(eventCollaborators),
}));

// Tabella attività/promemoria legati agli eventi
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  completed: boolean("completed").default(false).notNull(),
  eventId: integer("event_id"),
  assignedTo: integer("assigned_to"), // ID utente a cui è assegnata
  priority: text("priority").default("medium"), // high, medium, low
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  title: true,
  description: true,
  dueDate: true,
  completed: true,
  eventId: true,
  assignedTo: true,
  priority: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const tasksRelations = relations(tasks, ({ one }) => ({
  event: one(events, {
    fields: [tasks.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
}));

// Tabella collaboratori
export const collaborators = pgTable("collaborators", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"), // Fotografo, Videografo, Assistente, ecc.
  bio: text("bio"),
  profileImage: text("profile_image"),
  active: boolean("active").default(true).notNull(),
  hourlyRate: numeric("hourly_rate"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country").default("IT"),
  taxCode: text("tax_code"), // codice fiscale
  vatNumber: text("vat_number"), // partita IVA
  notes: text("notes"),
  privateNotes: text("private_notes"), // Note visibili solo all'admin
  paymentMethod: text("payment_method"), // Bonifico, Contanti, ecc.
  iban: text("iban"),
  bankName: text("bank_name"),
});

export const insertCollaboratorSchema = createInsertSchema(collaborators).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  bio: true,
  profileImage: true,
  active: true,
  hourlyRate: true,
  address: true,
  city: true,
  postalCode: true,
  country: true,
  taxCode: true,
  vatNumber: true,
  notes: true,
  privateNotes: true,
  paymentMethod: true,
  iban: true,
  bankName: true,
});

export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;
export type Collaborator = typeof collaborators.$inferSelect;

export const collaboratorsRelations = relations(collaborators, ({ many }) => ({
  events: many(eventCollaborators),
}));

// Tabella associazione evento-collaboratore
export const eventCollaborators = pgTable("event_collaborators", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  collaboratorId: integer("collaborator_id").notNull(),
  role: text("role"), // Ruolo specifico per questo evento
  notes: text("notes"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  fee: numeric("fee"), // Compenso pattuito
  paid: boolean("paid").default(false).notNull(),
  paidAmount: numeric("paid_amount").default("0"),
  paidDate: timestamp("paid_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paymentReceipt: text("payment_receipt"), // Percorso del file della ricevuta
  paymentMethod: text("payment_method"), // Metodo di pagamento utilizzato
  additionalInfo: jsonb("additional_info"),
}, (table) => {
  return {
    uniqueEventCollaborator: unique().on(table.eventId, table.collaboratorId),
  };
});

export const insertEventCollaboratorSchema = createInsertSchema(eventCollaborators).pick({
  eventId: true,
  collaboratorId: true,
  role: true,
  notes: true,
  startTime: true,
  endTime: true,
  fee: true,
  paid: true,
  paidAmount: true,
  paidDate: true,
  paymentReceipt: true,
  paymentMethod: true,
  additionalInfo: true,
});

export type InsertEventCollaborator = z.infer<typeof insertEventCollaboratorSchema>;
export type EventCollaborator = typeof eventCollaborators.$inferSelect;

export const eventCollaboratorsRelations = relations(eventCollaborators, ({ one }) => ({
  event: one(events, {
    fields: [eventCollaborators.eventId],
    references: [events.id],
  }),
  collaborator: one(collaborators, {
    fields: [eventCollaborators.collaboratorId],
    references: [collaborators.id],
  }),
}));

// Tabella Contratti
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  quoteId: integer("quote_id"), // Preventivo associato
  contractNumber: text("contract_number"), // Numero contratto
  status: text("status").default("draft").notNull(), // draft, sent, signed, active, completed, cancelled
  startDate: date("start_date"), 
  endDate: date("end_date"),
  eventDate: date("event_date"), // Data dell'evento se diversa da startDate
  totalAmount: numeric("total_amount").notNull(),
  depositAmount: numeric("deposit_amount"),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  signatureDate: timestamp("signature_date"),
  signatureName: text("signature_name"),
  signatureImage: text("signature_image"), // URL/percorso dell'immagine della firma
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  paymentSchedule: jsonb("payment_schedule"), // Array di date e importi
  location: text("location"),
  contractType: text("contract_type"), // wedding, portrait, commercial, etc.
  documentPath: text("document_path"), // Percorso del file contratto generato
  sentDate: timestamp("sent_date"),
  // Campo per la firma digitale (disegnata a mano)
  signatureData: text("signature_data"),
  // Link pubblico per la firma esterna
  publicLink: text("public_link"),
  publicLinkExpiry: timestamp("public_link_expiry"),
  publicLinkPassword: text("public_link_password"),
  // Clausole aggiuntive
  additionalClauses: jsonb("additional_clauses"),
});

export const insertContractSchema = createInsertSchema(contracts).pick({
  clientId: true,
  title: true,
  quoteId: true,
  contractNumber: true,
  status: true,
  startDate: true,
  endDate: true,
  eventDate: true,
  totalAmount: true,
  depositAmount: true,
  notes: true,
  termsAndConditions: true,
  signatureDate: true,
  signatureName: true,
  signatureImage: true,
  paymentSchedule: true,
  location: true,
  contractType: true,
  documentPath: true,
  sentDate: true,
  signatureData: true,
  publicLink: true,
  publicLinkExpiry: true,
  publicLinkPassword: true,
  additionalClauses: true,
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export const contractsRelations = relations(contracts, ({ one }) => ({
  client: one(clients, {
    fields: [contracts.clientId],
    references: [clients.id],
  }),
  quote: one(quotes, {
    fields: [contracts.quoteId],
    references: [quotes.id],
  }),
}));

// Tabella Servizi
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price").notNull().default("0"),
  duration: integer("duration"), // Durata in minuti
  categoryId: integer("category_id"),
  type: text("type").default("service").notNull(), // service, product
  imagePath: text("image_path"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Campi aggiuntivi
  sku: text("sku"),
  taxRate: numeric("tax_rate"),
  costPrice: numeric("cost_price"),
  unit: text("unit").default("pcs"),
  minQuantity: integer("min_quantity").default(1),
  maxQuantity: integer("max_quantity"),
  stockQuantity: integer("stock_quantity"),
  trackInventory: boolean("track_inventory").default(false),
  isStandard: boolean("is_standard").default(false), // Indica se è un servizio standard o personalizzato
});

export const insertServiceSchema = createInsertSchema(services).pick({
  name: true,
  description: true,
  price: true,
  duration: true,
  categoryId: true,
  type: true,
  imagePath: true,
  active: true,
  sku: true,
  taxRate: true,
  costPrice: true,
  unit: true,
  minQuantity: true,
  maxQuantity: true,
  stockQuantity: true,
  trackInventory: true,
  isStandard: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// Items associati ai servizi
export const serviceItems = pgTable("service_items", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  includedQuantity: integer("included_quantity").default(1).notNull(),
});

export const insertServiceItemSchema = createInsertSchema(serviceItems).pick({
  serviceId: true,
  name: true,
  description: true,
  includedQuantity: true,
});

export type InsertServiceItem = z.infer<typeof insertServiceItemSchema>;
export type ServiceItem = typeof serviceItems.$inferSelect;

export const serviceItemsRelations = relations(serviceItems, ({ one }) => ({
  service: one(services, {
    fields: [serviceItems.serviceId],
    references: [services.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  items: many(serviceItems),
}));

// Tabella quote (preventivi)
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  number: text("number"), // Numero preventivo
  status: text("status").default("draft").notNull(), // draft, sent, accepted, rejected, expired
  validUntil: date("valid_until"),
  eventDate: date("event_date"),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Sconto
  discountType: text("discount_type"), // percentage, fixed
  discountValue: numeric("discount_value").default("0"),
  // Importi (opzionali perché possono essere calcolati)
  subtotalAmount: numeric("subtotal_amount").default("0"),
  discountAmount: numeric("discount_amount").default("0"),
  taxAmount: numeric("tax_amount").default("0"),
  totalAmount: numeric("total_amount").default("0"),
  // Dati firma
  signatureDate: timestamp("signature_date"),
  signatureName: text("signature_name"),
  signatureImage: text("signature_image"),
  signatureData: text("signature_data"), // Firma disegnata
  signatureIp: text("signature_ip"),
  // Link condivisione pubblica
  publicShareToken: text("public_share_token"),
  publicShareExpiry: timestamp("public_share_expiry"),
  // Campi per eventi standard
  eventType: text("event_type"), // matrimonio, battesimo, etc
  eventHours: integer("event_hours"), // ore di copertura
  // Campi per la gestione bundle
  bundleId: integer("bundle_id"), // ID del pacchetto se questo preventivo è stato generato da un pacchetto
  bundleDiscountApplied: boolean("bundle_discount_applied").default(false),
  // Campi extra
  additionalInfo: jsonb("additional_info"),
  // Clausole contrattuali 
  termsAccepted: boolean("terms_accepted").default(false),
  acceptanceDate: timestamp("acceptance_date"),
  acceptedClauses: jsonb("accepted_clauses"),
});

export const insertQuoteSchema = createInsertSchema(quotes);

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
// Il tipo Quote include campi calcolati non presenti direttamente nel database
export type Quote = typeof quotes.$inferSelect & {
  // Campi virtuali per il frontend - non esistono nel database
  subtotal?: number;
  total?: number;
  discount?: number;
  shareExpiry?: Date | null;
};

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
  items: many(quoteItems),
  modules: many(quoteModules),
  bundle: one(serviceBundles, {
    fields: [quotes.bundleId],
    references: [serviceBundles.id],
  }),
}));

// Items del preventivo
export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull(),
  serviceId: integer("service_id"),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price").notNull().default("0"),
  quantity: integer("quantity").default(1).notNull(),
  taxRate: numeric("tax_rate").default("0"),
  // Il totale può essere calcolato (price * quantity * (1 - discount))
  discount: numeric("discount").default("0"),
  discountType: text("discount_type"), // percentage, fixed
  total: numeric("total").default("0"),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  type: text("type").default("service").notNull(), // service, product
  notes: text("notes"),
  moduleId: integer("module_id"), // ID del modulo a cui appartiene questo item (se presente)
  options: jsonb("options"), // Opzioni configurabili
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).pick({
  quoteId: true,
  serviceId: true,
  name: true,
  description: true,
  price: true,
  quantity: true,
  taxRate: true,
  discount: true,
  discountType: true,
  total: true,
  position: true,
  type: true,
  notes: true,
  moduleId: true,
  options: true,
});

export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
  service: one(services, {
    fields: [quoteItems.serviceId],
    references: [services.id],
  }),
  module: one(quoteModules, {
    fields: [quoteItems.moduleId],
    references: [quoteModules.id],
  }),
}));

// Moduli del preventivo (raggruppamenti di items)
export const quoteModules = pgTable("quote_modules", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Sconto a livello di modulo
  discountType: text("discount_type"), // percentage, fixed
  discountValue: numeric("discount_value").default("0"),
  // Campi calcolati
  subtotal: numeric("subtotal").default("0"),
  total: numeric("total").default("0"),
  // Extra info
  icon: text("icon"), // classe icona o nome file
  notes: text("notes"),
  options: jsonb("options"), // Opzioni configurabili del modulo
  isOptional: boolean("is_optional").default(false),
  isSelected: boolean("is_selected").default(true),
});

export const insertQuoteModuleSchema = createInsertSchema(quoteModules).pick({
  quoteId: true,
  name: true,
  description: true,
  position: true,
  discountType: true,
  discountValue: true,
  subtotal: true,
  total: true,
  icon: true,
  notes: true,
  options: true,
  isOptional: true,
  isSelected: true,
});

export type InsertQuoteModule = z.infer<typeof insertQuoteModuleSchema>;
export type QuoteModule = typeof quoteModules.$inferSelect;

// Items dei moduli del preventivo
export const quoteModuleItems = pgTable("quote_module_items", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull(),
  serviceId: integer("service_id"),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price").notNull().default("0"),
  quantity: integer("quantity").default(1).notNull(),
  taxRate: numeric("tax_rate").default("0"),
  // Il totale può essere calcolato (price * quantity * (1 - discount))
  discount: numeric("discount").default("0"),
  discountType: text("discount_type"), // percentage, fixed
  total: numeric("total").default("0"),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  type: text("type").default("service").notNull(), // service, product
  notes: text("notes"),
  options: jsonb("options"), // Opzioni configurabili
});

export const insertQuoteModuleItemSchema = createInsertSchema(quoteModuleItems).pick({
  moduleId: true,
  serviceId: true,
  name: true,
  description: true,
  price: true,
  quantity: true,
  taxRate: true,
  discount: true,
  discountType: true,
  total: true,
  position: true,
  type: true,
  notes: true,
  options: true,
});

export type InsertQuoteModuleItem = z.infer<typeof insertQuoteModuleItemSchema>;
export type QuoteModuleItem = typeof quoteModuleItems.$inferSelect;

export const quoteModulesRelations = relations(quoteModules, ({ one, many }) => ({
  quote: one(quotes, {
    fields: [quoteModules.quoteId],
    references: [quotes.id],
  }),
  items: many(quoteModuleItems),
}));

export const quoteModuleItemsRelations = relations(quoteModuleItems, ({ one }) => ({
  module: one(quoteModules, {
    fields: [quoteModuleItems.moduleId],
    references: [quoteModules.id],
  }),
  service: one(services, {
    fields: [quoteModuleItems.serviceId],
    references: [services.id],
  }),
}));

// Pacchetti di servizi
export const serviceBundles = pgTable("service_bundles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imagePath: text("image_path"),
  active: boolean("active").default(true).notNull(),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Totali del pacchetto
  totalPrice: numeric("total_price").default("0").notNull(),
  discountedPrice: numeric("discounted_price").default("0").notNull(),
  // Tipo di sconto applicato
  discountType: text("discount_type").default("percentage"), // percentage, fixed  
  discountValue: numeric("discount_value").default("0"),
  // Template style per il frontend
  templateStyle: text("template_style").default("elegant"), // elegant, modern, minimal, bold
  // Priorità di visualizzazione
  priority: integer("priority").default(0),
  // Pubblica pagina dettaglio
  publicPage: boolean("public_page").default(true),
  // Tag per ricerche e filtri
  tags: text("tags").array(),
  // Categoria del pacchetto
  categoryId: integer("category_id"),
  // Info aggiuntive
  additionalInfo: jsonb("additional_info"),
  shortDescription: text("short_description"),
});

export const insertServiceBundleSchema = createInsertSchema(serviceBundles).pick({
  name: true,
  description: true,
  imagePath: true,
  active: true,
  featured: true,
  totalPrice: true,
  discountedPrice: true,
  discountType: true,
  discountValue: true,
  templateStyle: true,
  priority: true,
  publicPage: true,
  tags: true,
  categoryId: true,
  additionalInfo: true,
  shortDescription: true,
});

export type InsertServiceBundle = z.infer<typeof insertServiceBundleSchema>;
export type ServiceBundle = typeof serviceBundles.$inferSelect;

export const serviceBundlesRelations = relations(serviceBundles, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [serviceBundles.categoryId],
    references: [serviceCategories.id],
  }),
  items: many(serviceBundleItems),
}));

// Item del pacchetto di servizi
export const serviceBundleItems = pgTable("service_bundle_items", {
  id: serial("id").primaryKey(),
  bundleId: integer("bundle_id").notNull(),
  serviceId: integer("service_id").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  discountApplied: boolean("discount_applied").default(true).notNull(),
  position: integer("position").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertServiceBundleItemSchema = createInsertSchema(serviceBundleItems).pick({
  bundleId: true,
  serviceId: true,
  quantity: true,
  discountApplied: true,
  position: true,
  notes: true,
});

export type InsertServiceBundleItem = z.infer<typeof insertServiceBundleItemSchema>;
export type ServiceBundleItem = typeof serviceBundleItems.$inferSelect;

export const serviceBundleItemsRelations = relations(serviceBundleItems, ({ one }) => ({
  bundle: one(serviceBundles, {
    fields: [serviceBundleItems.bundleId],
    references: [serviceBundles.id],
  }),
  service: one(services, {
    fields: [serviceBundleItems.serviceId],
    references: [services.id],
  }),
}));

// Tabella transazioni finanziarie
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  quoteId: integer("quote_id"),
  contractId: integer("contract_id"),
  amount: numeric("amount").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  type: text("type").notNull(), // payment, refund, expense
  method: text("method"), // cash, bank_transfer, credit_card, etc.
  status: text("status").default("completed").notNull(), // pending, completed, failed, refunded
  reference: text("reference"), // Riferimento esterno (es. ID PayPal)
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Info fatturazione
  invoiceNumber: text("invoice_number"),
  invoiceDate: date("invoice_date"),
  invoicePdf: text("invoice_pdf"), // Percorso del file
  // Categorizzazione spese
  category: text("category"),
  // Pagamento a rate
  installmentNumber: integer("installment_number"),
  totalInstallments: integer("total_installments"),
  // Metadati
  metadata: jsonb("metadata"),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  clientId: true,
  quoteId: true,
  contractId: true,
  amount: true,
  date: true,
  type: true,
  method: true,
  status: true,
  reference: true,
  description: true,
  notes: true,
  invoiceNumber: true,
  invoiceDate: true,
  invoicePdf: true,
  category: true,
  installmentNumber: true,
  totalInstallments: true,
  metadata: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export const transactionsRelations = relations(transactions, ({ one }) => ({
  client: one(clients, {
    fields: [transactions.clientId],
    references: [clients.id],
  }),
  quote: one(quotes, {
    fields: [transactions.quoteId],
    references: [quotes.id],
  }),
  contract: one(contracts, {
    fields: [transactions.contractId],
    references: [contracts.id],
  }),
}));

// Tabella pagamenti programmati
export const scheduledPayments = pgTable("scheduled_payments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  quoteId: integer("quote_id"),
  contractId: integer("contract_id"),
  amount: numeric("amount").notNull(),
  dueDate: date("due_date").notNull(),
  description: text("description"),
  status: text("status").default("pending").notNull(), // pending, paid, overdue, cancelled
  paymentMethod: text("payment_method"),
  reminderSent: boolean("reminder_sent").default(false),
  reminderDate: timestamp("reminder_date"),
  notes: text("notes"),
  transactionId: integer("transaction_id"), // ID della transazione se pagato
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Informazioni sulla rata
  installmentNumber: integer("installment_number"),
  totalInstallments: integer("total_installments"),
  // Metadati
  metadata: jsonb("metadata"),
});

export const insertScheduledPaymentSchema = createInsertSchema(scheduledPayments).pick({
  clientId: true,
  quoteId: true,
  contractId: true,
  amount: true,
  dueDate: true,
  description: true,
  status: true,
  paymentMethod: true,
  reminderSent: true,
  reminderDate: true,
  notes: true,
  transactionId: true,
  installmentNumber: true,
  totalInstallments: true,
  metadata: true,
});

export type InsertScheduledPayment = z.infer<typeof insertScheduledPaymentSchema>;
export type ScheduledPayment = typeof scheduledPayments.$inferSelect;

export const scheduledPaymentsRelations = relations(scheduledPayments, ({ one }) => ({
  client: one(clients, {
    fields: [scheduledPayments.clientId],
    references: [clients.id],
  }),
  quote: one(quotes, {
    fields: [scheduledPayments.quoteId],
    references: [quotes.id],
  }),
  contract: one(contracts, {
    fields: [scheduledPayments.contractId],
    references: [contracts.id],
  }),
  transaction: one(transactions, {
    fields: [scheduledPayments.transactionId],
    references: [transactions.id],
  }),
}));

// Categorie di servizi
export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3F51B5"),
  icon: text("icon"),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  parentId: integer("parent_id"), // Per categorie nidificate
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories).pick({
  name: true,
  description: true,
  color: true,
  icon: true,
  position: true,
  parentId: true,
});

export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type ServiceCategory = typeof serviceCategories.$inferSelect;

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  services: many(services),
  bundles: many(serviceBundles),
}));

// Fonti di lead
export const leadSources = pgTable("lead_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#4CAF50"),
  icon: text("icon"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLeadSourceSchema = createInsertSchema(leadSources).pick({
  name: true,
  description: true,
  color: true,
  icon: true,
  isActive: true,
});

export type InsertLeadSource = z.infer<typeof insertLeadSourceSchema>;
export type LeadSource = typeof leadSources.$inferSelect;

export const leadSourcesRelations = relations(leadSources, ({ many }) => ({
  clients: many(clients),
}));

// Tabella events (definizione tardiva perché ha relazioni bidirezionali)
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  allDay: boolean("all_day").default(false).notNull(),
  status: text("status").default("scheduled").notNull(), // scheduled, completed, cancelled
  eventType: text("event_type").default("other"), // wedding, portrait, event, other
  clientId: integer("client_id"),
  color: text("color"),
  notes: text("notes"),
  additionalData: jsonb("additional_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
});

// Impostazioni
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  companyEmail: text("company_email").notNull(),
  companyPhone: text("company_phone"),
  companyAddress: text("company_address"),
  companyLogo: text("company_logo"),
  contractTemplate: text("contract_template"),
  quoteTemplate: text("quote_template"),
  // Template email personalizzati
  emailQuoteSignedAdmin: text("email_quote_signed_admin"),
  emailQuoteSignedClient: text("email_quote_signed_client"),
  emailRegistrationNotification: text("email_registration_notification"),
  emailApprovalNotification: text("email_approval_notification"),
  emailDisabledNotification: text("email_disabled_notification"),
  emailPasswordReset: text("email_password_reset"),
  // Social media
  instagram: text("instagram_url"),
  facebook: text("facebook_url"), 
  twitter: text("twitter_url"),
  youtube: text("youtube_url"),
  website: text("website_url"),
  tiktokUrl: text("tiktok_url"),
  pinterestUrl: text("pinterest_url"),
  linkedinUrl: text("linkedin_url"),
  companyDescription: text("company_description"),
  // Altre impostazioni
  taxRate: integer("tax_rate").default(0).notNull(),
  defaultCurrency: text("default_currency").default("EUR").notNull(),
  colorTheme: text("color_theme").default("default").notNull(),
  additionalSettings: jsonb("additional_settings"),
});

export const insertSettingsSchema = createInsertSchema(settings)
  .pick({
    companyName: true,
    companyEmail: true,
    companyPhone: true,
    companyAddress: true,
    companyLogo: true,
    contractTemplate: true,
    quoteTemplate: true,
    emailQuoteSignedAdmin: true,
    emailQuoteSignedClient: true,
    emailRegistrationNotification: true,
    emailApprovalNotification: true,
    emailDisabledNotification: true,
    emailPasswordReset: true,
    instagram: true,
    facebook: true,
    twitter: true,
    youtube: true,
    website: true,
    tiktokUrl: true,
    pinterestUrl: true,
    linkedinUrl: true,
    companyDescription: true,
    taxRate: true,
    defaultCurrency: true,
    colorTheme: true,
    additionalSettings: true,
  })
  .partial({
    companyPhone: true,
    companyAddress: true,
    companyLogo: true,
    contractTemplate: true,
    quoteTemplate: true,
    emailQuoteSignedAdmin: true,
    emailQuoteSignedClient: true,
    emailRegistrationNotification: true,
    emailApprovalNotification: true,
    emailDisabledNotification: true,
    emailPasswordReset: true,
    instagram: true,
    facebook: true,
    twitter: true,
    youtube: true,
    website: true,
    tiktokUrl: true,
    pinterestUrl: true,
    linkedinUrl: true,
    companyDescription: true,
    additionalSettings: true,
  });

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Schema per lead generati dalle pagine dei pacchetti
export const bundleLeads = pgTable("bundle_leads", {
  id: serial("id").primaryKey(),
  bundleId: integer("bundle_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message"),
  status: text("status").default("new").notNull(), // new, contacted, converted, archived
  quoteId: integer("quote_id"), // ID del preventivo generato automaticamente
  clientId: integer("client_id"), // ID del cliente creato o associato
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBundleLeadSchema = createInsertSchema(bundleLeads).pick({
  bundleId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  message: true,
  status: true,
  quoteId: true,
  clientId: true,
});

export type InsertBundleLead = z.infer<typeof insertBundleLeadSchema>;
export type BundleLead = typeof bundleLeads.$inferSelect;

export const bundleLeadsRelations = relations(bundleLeads, ({ one }) => ({
  bundle: one(serviceBundles, {
    fields: [bundleLeads.bundleId],
    references: [serviceBundles.id],
  }),
  quote: one(quotes, {
    fields: [bundleLeads.quoteId],
    references: [quotes.id],
  }),
  client: one(clients, {
    fields: [bundleLeads.clientId],
    references: [clients.id],
  }),
}));

// GESTIONE GALLERIE FOTOGRAFICHE
// Queste definizioni sono state spostate in un file separato per maggiore chiarezza
// Importiamo ed esportiamo tutto dal file schema_gallery.ts
export * from "../schema_gallery";
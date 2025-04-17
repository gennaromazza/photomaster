import { pgTable, text, serial, integer, boolean, timestamp, jsonb, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("user"),
  status: text("status").notNull().default("pending"), // pending, active, disabled
  profileImage: text("profile_image"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  googleId: text("google_id").unique(),
  googleTokens: text("google_tokens"), // JSON string con access_token, refresh_token, ecc.
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  profileImage: true,
  resetPasswordToken: true,
  resetPasswordExpires: true,
  googleId: true,
  googleTokens: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Client Schema
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  companyName: text("company_name"),
  zipCode: text("zip_code"),
  state: text("state"),
  province: text("province"),
  fiscalCode: text("fiscal_code"),
  city: text("city"),
  internationalPrefix: text("international_prefix"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  notes: text("notes"),
});

export const insertClientSchema = createInsertSchema(clients).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  address: true,
  companyName: true,
  zipCode: true,
  state: true,
  province: true,
  fiscalCode: true,
  city: true,
  internationalPrefix: true,
  notes: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export const clientsRelations = relations(clients, ({ many }) => ({
  events: many(events),
  contracts: many(contracts),
  quotes: many(quotes),
}));

// Event Schema
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull(),
  clientId: integer("client_id").notNull(),
  secondClientId: integer("second_client_id"), // per sposo/sposa o secondo cliente
  quoteId: integer("quote_id"), // Relazione con i preventivi
  fromSignedQuote: boolean("from_signed_quote").default(false), // Indica se l'evento è stato creato da un preventivo firmato
  categoryId: integer("category_id"),
  leadSourceId: integer("lead_source_id"),
  date: timestamp("date").notNull(),
  endDate: timestamp("end_date"),
  duration: integer("duration"), // durata in minuti
  location: text("location"),
  status: text("status").notNull().default("upcoming"),
  notes: text("notes"),
  coverImage: text("cover_image"),
});

// Base insert schema senza transform per poter usare .partial()
const baseEventInsertSchema = createInsertSchema(events).pick({
  title: true,
  description: true,
  eventType: true,
  clientId: true,
  secondClientId: true,
  quoteId: true,
  categoryId: true,
  leadSourceId: true,
  date: true,
  endDate: true,
  duration: true,
  location: true,
  status: true,
  notes: true,
  coverImage: true,
});

// Schema per insert con transform delle date
export const insertEventSchema = baseEventInsertSchema.transform((event) => ({
  ...event,
  date: typeof event.date === 'string' ? new Date(event.date) : event.date,
  endDate: event.endDate && typeof event.endDate === 'string' ? new Date(event.endDate) : event.endDate
}));

// Schema che può essere usato per chiamare .partial()
export const partialEventSchema = baseEventInsertSchema.partial();

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export const eventsRelations = relations(events, ({ one, many }) => ({
  client: one(clients, {
    fields: [events.clientId],
    references: [clients.id],
  }),
  secondClient: one(clients, {
    fields: [events.secondClientId],
    references: [clients.id],
    relationName: "secondClientEvents",
  }),
  quote: one(quotes, {
    fields: [events.quoteId],
    references: [quotes.id],
  }),
  category: one(serviceCategories, {
    fields: [events.categoryId],
    references: [serviceCategories.id],
  }),
  leadSource: one(leadSources, {
    fields: [events.leadSourceId],
    references: [leadSources.id],
  }),
  tasks: many(tasks),
  contracts: many(contracts),
  quotes: many(quotes),
  eventCollaborators: many(eventCollaborators),
}));

// Task Schema
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  eventId: integer("event_id"),
  status: text("status").notNull().default("pending"),
  completed: boolean("completed").default(false).notNull(),
  priority: text("priority").default("medium").notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  title: true,
  description: true,
  dueDate: true,
  eventId: true,
  status: true,
  completed: true,
  priority: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const tasksRelations = relations(tasks, ({ one }) => ({
  event: one(events, {
    fields: [tasks.eventId],
    references: [events.id],
  }),
}));

// Collaborator Schema
export const collaborators = pgTable("collaborators", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull(),
  profileImage: text("profile_image"),
  status: text("status").default("available").notNull(),
});

export const insertCollaboratorSchema = createInsertSchema(collaborators).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  profileImage: true,
  status: true,
});

export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;
export type Collaborator = typeof collaborators.$inferSelect;

export const collaboratorsRelations = relations(collaborators, ({ many }) => ({
  eventCollaborators: many(eventCollaborators),
}));

// Event Collaborator Schema (join table)
export const eventCollaborators = pgTable("event_collaborators", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  collaboratorId: integer("collaborator_id").notNull(),
  role: text("role").notNull(),
});

export const insertEventCollaboratorSchema = createInsertSchema(eventCollaborators).pick({
  eventId: true,
  collaboratorId: true,
  role: true,
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

// Contract Schema
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  eventId: integer("event_id").notNull(),
  clientId: integer("client_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: text("status").default("pending").notNull(),
  signedByClient: boolean("signed_by_client").default(false).notNull(),
  signedByAdmin: boolean("signed_by_admin").default(false).notNull(),
  signatureDate: timestamp("signature_date"),
  signatureUrl: text("signature_url"),
});

export const insertContractSchema = createInsertSchema(contracts).pick({
  title: true,
  content: true,
  eventId: true,
  clientId: true,
  status: true,
  signedByClient: true,
  signedByAdmin: true,
  signatureDate: true,
  signatureUrl: true,
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export const contractsRelations = relations(contracts, ({ one }) => ({
  client: one(clients, {
    fields: [contracts.clientId],
    references: [clients.id],
  }),
  event: one(events, {
    fields: [contracts.eventId],
    references: [events.id],
  }),
}));

// Product/Service Schema
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  type: text("type").notNull(), // 'product' o 'service'
  categoryId: integer("category_id"),
  isActive: boolean("is_active").default(true).notNull(),
  image: text("image"),
  imagePath: text("image_path"), // Percorso dell'immagine salvata
  // Campi per gestione sconti
  hasDiscount: boolean("has_discount").default(false).notNull(),
  discountType: text("discount_type"), // 'percentage' o 'fixed'
  discountValue: integer("discount_value"), // Valore dello sconto (percentuale o fisso)
  discountedPrice: integer("discounted_price"), // Prezzo scontato calcolato
  // Gestione del prodotto
  sku: text("sku"), // Codice prodotto
  stock: integer("stock"), // Disponibilità in magazzino (per prodotti fisici)
  unit: text("unit"), // Unità di misura (es. "pz", "ore", "giorni")
  taxable: boolean("taxable").default(true).notNull(), // Se soggetto a tassazione
  // Composizione servizio
  isComposite: boolean("is_composite").default(false).notNull(), // Indica se il servizio è composto da più prodotti
});

export const insertServiceSchema = createInsertSchema(services).pick({
  name: true,
  description: true,
  price: true,
  type: true,
  categoryId: true,
  isActive: true,
  image: true,
  imagePath: true,
  hasDiscount: true,
  discountType: true,
  discountValue: true,
  discountedPrice: true,
  sku: true,
  stock: true,
  unit: true,
  taxable: true,
  isComposite: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// Service Items Schema - Elementi di prodotti all'interno di un servizio composto
export const serviceItems = pgTable("service_items", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  productId: integer("product_id").notNull(), // ID del prodotto (un altro service di tipo 'product')
  quantity: integer("quantity").default(1).notNull(),
});

export const insertServiceItemSchema = createInsertSchema(serviceItems).pick({
  serviceId: true,
  productId: true,
  quantity: true,
});

export type InsertServiceItem = z.infer<typeof insertServiceItemSchema>;
export type ServiceItem = typeof serviceItems.$inferSelect;

export const serviceItemsRelations = relations(serviceItems, ({ one }) => ({
  service: one(services, {
    fields: [serviceItems.serviceId],
    references: [services.id],
  }),
  product: one(services, {
    fields: [serviceItems.productId],
    references: [services.id],
    relationName: "productItems",
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  quoteItems: many(quoteItems),
  serviceItems: many(serviceItems, { relationName: "serviceItems" }),
  productItems: many(serviceItems, { relationName: "productItems" }),
}));

// Quote Schema
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  clientId: integer("client_id").notNull(),
  secondClientId: integer("second_client_id"), // per sposo/sposa o secondo cliente
  eventId: integer("event_id"),
  categoryId: integer("category_id"),
  leadSourceId: integer("lead_source_id"),
  eventDate: timestamp("event_date"),
  isFullDay: boolean("is_full_day").default(false), // Evento per tutta la giornata
  eventTime: text("event_time"), // Orario di inizio evento (formato HH:MM)
  eventEndTime: text("event_end_time"), // Orario di fine evento (formato HH:MM)
  location: text("location"), // Indirizzo/location dell'evento
  ceremonyLocation: text("ceremony_location"), // Luogo del rito (chiesa, comune, ecc.)
  ceremonyTime: text("ceremony_time"), // Orario del rito (formato HH:MM)
  eventType: text("event_type"), // Tipo di lavoro/evento (wedding, baptism, ecc.)
  workflow: text("workflow").default("default"), // Workflow da applicare
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  expiryDate: timestamp("expiry_date"),
  status: text("status").default("draft").notNull(),
  notes: text("notes"),
  signature: text("signature"), // Firma del cliente per l'approvazione
  isShared: boolean("is_shared").default(false), // Indica se il preventivo è condiviso pubblicamente
  shareToken: text("share_token"), // Token univoco per l'URL di condivisione
  // Questi campi non esistono nella tabella reale
  // subtotal: integer("subtotal").default(0), // Subtotale (somma dei servizi/prodotti prima degli sconti)
  // total: integer("total").default(0), // Totale (subtotale - sconti)
  // discount: integer("discount").default(0), // Sconto applicato al preventivo
});

// Creiamo lo schema solo con i campi che esistono nella tabella reale
export const insertQuoteSchema = createInsertSchema(quotes);

export type InsertQuote = z.infer<typeof insertQuoteSchema>;

// Estendiamo Quote con i campi virtuali per l'applicazione frontend
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
  secondClient: one(clients, {
    fields: [quotes.secondClientId],
    references: [clients.id],
    relationName: "secondClientQuotes",
  }),
  event: one(events, {
    fields: [quotes.eventId],
    references: [events.id],
    relationName: "eventQuotes",
  }),
  category: one(serviceCategories, {
    fields: [quotes.categoryId],
    references: [serviceCategories.id],
  }),
  leadSource: one(leadSources, {
    fields: [quotes.leadSourceId],
    references: [leadSources.id],
  }),
  quoteItems: many(quoteItems),
  modules: many(quoteModules),
}));

// Quote Items Schema
export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull(),
  serviceId: integer("service_id").notNull(),
  bundleId: integer("bundle_id"), // Se questo elemento fa parte di un pacchetto
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: integer("unit_price").notNull(),
  // Sconto specifico per l'elemento nel preventivo
  hasDiscount: boolean("has_discount").default(false).notNull(),
  discountType: text("discount_type"), // 'percentage' o 'fixed'
  discountValue: integer("discount_value"), // Valore dello sconto (percentuale o fisso)
  discountedPrice: integer("discounted_price"), // Prezzo unitario scontato
  // Totale calcolato (quantity * unitPrice o quantity * discountedPrice se scontato)
  total: integer("total").notNull(),
  // Note specifiche per l'elemento
  notes: text("notes"),
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).pick({
  quoteId: true,
  serviceId: true,
  bundleId: true,
  quantity: true,
  unitPrice: true,
  hasDiscount: true,
  discountType: true,
  discountValue: true,
  discountedPrice: true,
  total: true,
  notes: true,
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
  bundle: one(serviceBundles, {
    fields: [quoteItems.bundleId],
    references: [serviceBundles.id],
  }),
}));

// Quote Modules Schema
export const quoteModules = pgTable("quote_modules", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'fixed' o 'variable'
  status: text("status").default("draft").notNull(), // 'draft', 'active', 'selected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  expiryDate: timestamp("expiry_date"), // Data di scadenza per i moduli variabili
  shareToken: text("share_token"), // Token univoco per l'URL di condivisione
  clientNotes: text("client_notes"), // Note per il cliente
  internalNotes: text("internal_notes"), // Note interne
  // Campi per la gestione del prezzo totale
  subtotal: integer("subtotal").default(0), // Subtotale (somma degli elementi)
  total: integer("total").default(0), // Totale finale
  minSelectCount: integer("min_select_count"), // Numero minimo di selezioni per moduli variabili
  maxSelectCount: integer("max_select_count"), // Numero massimo di selezioni per moduli variabili
});

export const insertQuoteModuleSchema = createInsertSchema(quoteModules).pick({
  quoteId: true,
  name: true,
  description: true,
  type: true,
  status: true,
  expiryDate: true,
  shareToken: true,
  clientNotes: true,
  internalNotes: true,
  subtotal: true,
  total: true,
  minSelectCount: true,
  maxSelectCount: true,
});

export type InsertQuoteModule = z.infer<typeof insertQuoteModuleSchema>;
export type QuoteModule = typeof quoteModules.$inferSelect;

// Quote Module Items Schema
export const quoteModuleItems = pgTable("quote_module_items", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull(),
  serviceId: integer("service_id"), // Se elemento è un servizio/prodotto
  bundleId: integer("bundle_id"), // Se elemento è un pacchetto
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: integer("unit_price").notNull(),
  isRequired: boolean("is_required").default(false), // Indica se questo elemento è obbligatorio (per moduli variabili)
  isSelected: boolean("is_selected").default(false), // Indica se questo elemento è stato selezionato dal cliente
  position: integer("position").default(0), // Posizione nell'elenco
  // Sconto specifico per l'elemento nel modulo
  hasDiscount: boolean("has_discount").default(false).notNull(),
  discountType: text("discount_type"), // 'percentage' o 'fixed'
  discountValue: integer("discount_value"), // Valore dello sconto (percentuale o fisso)
  discountedPrice: integer("discounted_price"), // Prezzo unitario scontato
  // Totale calcolato (quantity * unitPrice o quantity * discountedPrice se scontato)
  total: integer("total").notNull(),
  // Note specifiche per l'elemento
  notes: text("notes"),
});

export const insertQuoteModuleItemSchema = createInsertSchema(quoteModuleItems).pick({
  moduleId: true,
  serviceId: true,
  bundleId: true,
  quantity: true,
  unitPrice: true,
  isRequired: true,
  isSelected: true,
  position: true,
  hasDiscount: true,
  discountType: true,
  discountValue: true,
  discountedPrice: true,
  total: true,
  notes: true,
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
  bundle: one(serviceBundles, {
    fields: [quoteModuleItems.bundleId],
    references: [serviceBundles.id],
    relationName: "moduleItemBundle",
  }),
}));

// Pacchetti (Bundle) Schema - Raggruppamenti di servizi e prodotti
export const serviceBundles = pgTable("service_bundles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  imagePath: text("image_path"), // Percorso dell'immagine ottimizzata
  totalPrice: integer("total_price").notNull(), // Prezzo totale reale
  discountedPrice: integer("discounted_price").notNull(), // Prezzo scontato del pacchetto
  discountType: text("discount_type").notNull(), // 'percentage' o 'fixed'
  discountValue: integer("discount_value").notNull(), // Valore dello sconto
  isActive: boolean("is_active").default(true).notNull(),
  categoryId: integer("category_id"),
  templateStyle: text("template_style").default("elegant").notNull(), // Stile di template per la visualizzazione
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceBundleSchema = createInsertSchema(serviceBundles).pick({
  name: true,
  description: true,
  image: true,
  imagePath: true,
  totalPrice: true,
  discountedPrice: true,
  discountType: true,
  discountValue: true,
  isActive: true,
  categoryId: true,
  templateStyle: true,
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

// Service Bundle Items Schema - Elementi all'interno dei pacchetti
export const serviceBundleItems = pgTable("service_bundle_items", {
  id: serial("id").primaryKey(),
  bundleId: integer("bundle_id").notNull(),
  serviceId: integer("service_id").notNull(),
  quantity: integer("quantity").default(1).notNull(),
});

export const insertServiceBundleItemSchema = createInsertSchema(serviceBundleItems).pick({
  bundleId: true,
  serviceId: true,
  quantity: true,
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

// Service Category Schema
export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color").default("#3b82f6"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories).pick({
  name: true,
  description: true,
  color: true,
  isActive: true,
});

export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type ServiceCategory = typeof serviceCategories.$inferSelect;

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  services: many(services),
  events: many(events),
}));

// Lead Source Schema (Provenienze)
export const leadSources = pgTable("lead_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeadSourceSchema = createInsertSchema(leadSources).pick({
  name: true,
  description: true,
  isActive: true,
});

export type InsertLeadSource = z.infer<typeof insertLeadSourceSchema>;
export type LeadSource = typeof leadSources.$inferSelect;

export const leadSourcesRelations = relations(leadSources, ({ many }) => ({
  events: many(events),
  quotes: many(quotes),
}));

// Nessuna relazione aggiuntiva qui

// Settings Schema
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

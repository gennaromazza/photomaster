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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  notes: text("notes"),
});

export const insertClientSchema = createInsertSchema(clients).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  address: true,
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
  type: text("type").notNull(),
  categoryId: integer("category_id"),
  isActive: boolean("is_active").default(true).notNull(),
  image: text("image"),
});

export const insertServiceSchema = createInsertSchema(services).pick({
  name: true,
  description: true,
  price: true,
  type: true,
  categoryId: true,
  isActive: true,
  image: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  quoteItems: many(quoteItems),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiryDate: timestamp("expiry_date"),
  status: text("status").default("draft").notNull(),
  subtotal: integer("subtotal").notNull(),
  tax: integer("tax").default(0).notNull(),
  discount: integer("discount").default(0).notNull(),
  total: integer("total").notNull(),
  notes: text("notes"),
});

export const insertQuoteSchema = createInsertSchema(quotes).pick({
  title: true,
  clientId: true,
  secondClientId: true,
  eventId: true,
  categoryId: true,
  leadSourceId: true,
  eventDate: true,
  expiryDate: true,
  status: true,
  subtotal: true,
  tax: true,
  discount: true,
  total: true,
  notes: true,
});

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

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
}));

// Quote Items Schema
export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull(),
  serviceId: integer("service_id").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: integer("unit_price").notNull(),
  total: integer("total").notNull(),
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).pick({
  quoteId: true,
  serviceId: true,
  quantity: true,
  unitPrice: true,
  total: true,
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
  taxRate: integer("tax_rate").default(0).notNull(),
  defaultCurrency: text("default_currency").default("EUR").notNull(),
  colorTheme: text("color_theme").default("default").notNull(),
  additionalSettings: jsonb("additional_settings"),
});

export const insertSettingsSchema = createInsertSchema(settings).pick({
  companyName: true,
  companyEmail: true,
  companyPhone: true,
  companyAddress: true,
  companyLogo: true,
  contractTemplate: true,
  quoteTemplate: true,
  taxRate: true,
  defaultCurrency: true,
  colorTheme: true,
  additionalSettings: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

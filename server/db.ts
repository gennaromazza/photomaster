import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";
import { Pool } from "pg"; 

// Verifica che DATABASE_URL sia definito
if (!process.env.DATABASE_URL) {
  console.error("ERRORE: DATABASE_URL non è definito nelle variabili d'ambiente.");
  console.error("Assicurati che il file .env sia presente nella root del progetto e contenga DATABASE_URL.");
  process.exit(1);
}

// Create a Postgres client con gestione errori migliorata
const connectionString = process.env.DATABASE_URL;
let client;
let db;

// Create a Pool for direct SQL queries
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Aggiunto blocco try-catch per gestire meglio gli errori di connessione
try {
  client = postgres(connectionString);
  
  // Create a Drizzle ORM instance
  db = drizzle(client, { schema });
  
  console.log("Connessione al database stabilita con successo");
} catch (error) {
  console.error("ERRORE: Impossibile connettersi al database:", error);
  console.error("Verifica che la stringa di connessione DATABASE_URL sia corretta e che il database sia accessibile.");
  process.exit(1);
}

// Esporta il tipo corretto dell'istanza db
export type DB = typeof db;

// Creiamo un wrapper per postgres per query SQL dirette
export const pgClient = client;

// Esporta l'istanza db
export { db };
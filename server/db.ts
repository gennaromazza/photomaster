import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

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

// Esporta l'istanza db
export { db };
/**
 * Endpoints di debug per il database
 * DA UTILIZZARE SOLO IN AMBIENTE DI SVILUPPO!
 */

import { Request, Response } from "express";
import { Pool } from "pg";
import { db } from "../db";
import { isAdmin, csrfBypass } from "../auth";

// Configura una connessione diretta al database per operazioni raw
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Esegue una query SQL raw
 */
export const executeQuery = async (req: Request, res: Response) => {
  // Verificare che siamo in ambiente di sviluppo
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Questo endpoint è disponibile solo in ambiente di sviluppo" });
  }

  // Verificare che l'utente sia un amministratore
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Solo gli amministratori possono eseguire query SQL dirette" });
  }

  const { query, params } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Query SQL mancante" });
  }

  try {
    const result = await pool.query(query, params || []);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Errore nell'esecuzione della query SQL:", error);
    res.status(500).json({ 
      error: "Errore nell'esecuzione della query SQL", 
      details: error.message 
    });
  }
};

/**
 * Ottiene la struttura di una tabella
 */
export const getTableStructure = async (req: Request, res: Response) => {
  // Verificare che siamo in ambiente di sviluppo
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Questo endpoint è disponibile solo in ambiente di sviluppo" });
  }

  const { tableName } = req.body;

  if (!tableName) {
    return res.status(400).json({ error: "Nome tabella mancante" });
  }

  try {
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `;

    const result = await pool.query(query, [tableName]);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Errore nel recupero della struttura della tabella:", error);
    res.status(500).json({ 
      error: "Errore nel recupero della struttura della tabella", 
      details: error.message 
    });
  }
};

/**
 * Ottiene le dipendenze di una tabella
 */
export const getTableDependencies = async (req: Request, res: Response) => {
  // Verificare che siamo in ambiente di sviluppo
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Questo endpoint è disponibile solo in ambiente di sviluppo" });
  }

  const { tableName } = req.body;

  if (!tableName) {
    return res.status(400).json({ error: "Nome tabella mancante" });
  }

  try {
    // Query per ottenere le foreign key che referenziano questa tabella
    const referencedByQuery = `
      SELECT
        tc.table_schema, 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = $1;
    `;

    // Query per ottenere le foreign key di questa tabella
    const referencesQuery = `
      SELECT
        tc.table_schema, 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1;
    `;

    const [referencedByResult, referencesResult] = await Promise.all([
      pool.query(referencedByQuery, [tableName]),
      pool.query(referencesQuery, [tableName])
    ]);

    res.json({
      referencedBy: referencedByResult.rows,
      references: referencesResult.rows
    });
  } catch (error: any) {
    console.error("Errore nel recupero delle dipendenze della tabella:", error);
    res.status(500).json({ 
      error: "Errore nel recupero delle dipendenze della tabella", 
      details: error.message 
    });
  }
};

/**
 * Crea endpoint di debug per il database
 */
export function setupDebugDbEndpoints(app: any) {
  // Verificare che siamo in ambiente di sviluppo
  if (process.env.NODE_ENV === "production") {
    console.log("Debug DB endpoints non disponibili in produzione");
    return;
  }

  console.log("Configurazione degli endpoint di debug DB");

  // Sottorotte per operazioni di debug sul database con bypass CSRF
  app.post("/api/debug/db/execute", csrfBypass, isAdmin, executeQuery);
  app.post("/api/debug/db/structure", csrfBypass, isAdmin, getTableStructure);
  app.post("/api/debug/db/dependencies", csrfBypass, isAdmin, getTableDependencies);
  
  console.log("Endpoint di debug DB configurati");
}
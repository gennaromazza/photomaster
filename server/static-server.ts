import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/**
 * Serve i file statici nella modalità di produzione.
 * Questa funzione corregge il percorso alla directory di build.
 */
export function serveStaticFixed(app: Express) {
  // Corretto il percorso per puntare alla directory dist/public nella root del progetto
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    // Log più dettagliato per il debugging
    console.error(`Directory di build non trovata: ${distPath}`);
    console.error(`Directory corrente: ${process.cwd()}`);

    try {
      console.error(`Contenuto directory corrente:`, fs.readdirSync(process.cwd()));
    } catch (e) {
      console.error(`Impossibile leggere la directory corrente:`, e);
    }

    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  console.log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
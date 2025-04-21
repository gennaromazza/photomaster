// Carichiamo dotenv prima di tutto per assicurarci che le variabili d'ambiente siano disponibili
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { serveStaticFixed } from "./static-server";
import helmet from "helmet";
import path from "path";

const app = express();

// Configurazione di Helmet per migliorare la sicurezza delle intestazioni HTTP
// Personalizzazione per consentire l'uso di CKEditor e altre risorse
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.ckeditor.com", "https://replit.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.ckeditor.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://cdn.ckeditor.com", "https://*.googleusercontent.com", "https:"],
        connectSrc: ["'self'", "https://www.googleapis.com"],
        frameSrc: ["'self'", "https://accounts.google.com"],
      },
    },
    crossOriginEmbedderPolicy: false, // Necessario per CKEditor
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configurazione static files
app.use(express.static(path.join(process.cwd(), "dist", "public")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log dettagliato dell'errore senza causare il crash del server
    console.error("Errore API:", {
      status,
      message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });

    // Risposta al client con messaggio di errore
    res.status(status).json({ message });
    // Il throw è stato rimosso per evitare il crash del server
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Utilizziamo la versione corretta per servire i file statici in produzione
    serveStaticFixed(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
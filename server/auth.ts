import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "../shared/schema";
import connectPg from "connect-pg-simple";
import pkg from "pg";
const { Pool } = pkg;
import { z } from "zod";
import { sendRegistrationNotification, sendApprovalNotification, sendDisabledNotification } from "./email";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Schema per la validazione della registrazione
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  fullName: z.string().min(3).max(100),
  email: z.string().email(),
  role: z.enum(["admin", "user", "editor"]).default("user"),
});

// Schema per la validazione del login
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export function setupAuth(app: Express) {
  // Crea un nuovo connection pool per le sessioni
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const PostgresSessionStore = connectPg(session);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "studio-arte-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 giorni
      secure: process.env.NODE_ENV === "production",
    },
    store: new PostgresSessionStore({
      pool,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        // Se l'utente non esiste o la password non corrisponde
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Credenziali non valide" });
        }
        
        // Se l'utente non è ancora stato approvato
        if (user.status === "pending") {
          return done(null, false, { message: "Account in attesa di approvazione" });
        }
        
        // Se l'utente è stato disabilitato
        if (user.status === "disabled") {
          return done(null, false, { message: "Account disabilitato" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registrazione di un nuovo utente
  app.post("/api/register", async (req, res, next) => {
    try {
      // Validazione dei dati di input
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ errors: result.error.format() });
      }
      
      const userData = result.data;
      
      // Controllo se l'utente esiste già
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Nome utente già in uso" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email già in uso" });
      }
      
      // Hash della password
      const hashedPassword = await hashPassword(userData.password);
      
      // Setup status iniziale
      // Se l'email è gennaro.mazzacane@gmail.com, imposta come admin e approva
      // altrimenti, metti lo stato come pending
      const isAdmin = userData.email === "gennaro.mazzacane@gmail.com";
      const initialStatus = isAdmin ? "active" : "pending";
      const role = isAdmin ? "admin" : userData.role;
      
      // Creazione dell'utente
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        status: initialStatus,
        role,
        profileImage: "",
      });
      
      // Se l'utente è admin, logga automaticamente
      if (isAdmin) {
        req.login(user, (err) => {
          if (err) return next(err);
          // Ometto la password nella risposta
          const { password, ...userWithoutPassword } = user;
          res.status(201).json(userWithoutPassword);
        });
      } else {
        // Altrimenti, invia solo conferma di registrazione
        // e invia una notifica all'admin per l'approvazione
        const { password, ...userWithoutPassword } = user;
        
        // Invia notifica all'amministratore
        await sendRegistrationNotification(user);
        
        res.status(201).json({
          ...userWithoutPassword,
          message: "Registrazione effettuata con successo. Attendi l'approvazione dell'amministratore."
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // Login
  app.post("/api/login", (req, res, next) => {
    try {
      // Validazione dei dati di input
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ errors: result.error.format() });
      }
      
      passport.authenticate("local", (err: Error, user: SelectUser, info: { message: string }) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: info.message || "Credenziali non valide" });
        
        req.login(user, (err) => {
          if (err) return next(err);
          // Ometto la password nella risposta
          const { password, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        });
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  // Logout
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logout effettuato con successo" });
    });
  });

  // Get utente corrente
  app.get("/api/user", (req, res) => {
    // Questo endpoint è già gestito nel middleware delle routes.ts
    // Qui dobbiamo solo fornire i dati dell'utente
    if (req.isAuthenticated()) {
      // Ometto la password nella risposta
      const { password, ...userWithoutPassword } = req.user as SelectUser;
      res.json(userWithoutPassword);
    } else {
      // Se non autenticato, il middleware in routes.ts si è già occupato della risposta 401
      // ma per sicurezza rispondiamo anche qui
      res.status(401).json({ message: "Non autenticato" });
    }
  });
  
  // Approvazione di un utente (solo per admin)
  app.patch("/api/users/:id/approve", async (req, res, next) => {
    try {
      // Verifica che l'utente sia autenticato e che sia admin
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const currentUser = req.user as SelectUser;
      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "Non autorizzato" });
      }
      
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID utente non valido" });
      }
      
      // Controlla se l'utente esiste
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Utente non trovato" });
      }
      
      // Aggiorna lo stato dell'utente a "active"
      const updatedUser = await storage.updateUser(userId, { status: "active" });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Errore durante l'aggiornamento dell'utente" });
      }
      
      // Invia email di notifica all'utente
      await sendApprovalNotification(updatedUser);
      
      // Ometti la password nella risposta
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  
  // Disabilitazione di un utente (solo per admin)
  app.patch("/api/users/:id/disable", async (req, res, next) => {
    try {
      // Verifica che l'utente sia autenticato e che sia admin
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const currentUser = req.user as SelectUser;
      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "Non autorizzato" });
      }
      
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID utente non valido" });
      }
      
      // Non permettere di disabilitare se stesso
      if (userId === currentUser.id) {
        return res.status(400).json({ message: "Non puoi disabilitare il tuo account" });
      }
      
      // Controlla se l'utente esiste
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Utente non trovato" });
      }
      
      // Aggiorna lo stato dell'utente a "disabled"
      const updatedUser = await storage.updateUser(userId, { status: "disabled" });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Errore durante l'aggiornamento dell'utente" });
      }
      
      // Invia email di notifica all'utente
      await sendDisabledNotification(updatedUser);
      
      // Ometti la password nella risposta
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
  
  // Ottenere tutti gli utenti (solo per admin)
  app.get("/api/users", async (req, res, next) => {
    try {
      // Verifica che l'utente sia autenticato e che sia admin
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const currentUser = req.user as SelectUser;
      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "Non autorizzato" });
      }
      
      // Ottieni tutti gli utenti
      const users = await storage.getAllUsers();
      
      // Ometti le password nella risposta
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      next(error);
    }
  });
  
  // Ottenere le richieste di registrazione pendenti (solo per admin)
  app.get("/api/users/pending", async (req, res, next) => {
    try {
      // Verifica che l'utente sia autenticato e che sia admin
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Non autenticato" });
      }
      
      const currentUser = req.user as SelectUser;
      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "Non autorizzato" });
      }
      
      // Ottieni gli utenti con stato "pending"
      const pendingUsers = await storage.getPendingUsers();
      
      // Ometti le password nella risposta
      const usersWithoutPasswords = pendingUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      next(error);
    }
  });
}

// Middleware per verificare l'autenticazione
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.status(401).json({ message: "Non autenticato" });
  }
}

// Middleware per verificare il ruolo admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user as SelectUser).role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Non autorizzato" });
  }
}
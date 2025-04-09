import { Router } from "express";
import { db } from "../db";
import { settings, insertSettingsSchema } from "@shared/schema";
import { isAuthenticated, isAdmin } from "../auth";
import { eq } from "drizzle-orm";

const router = Router();

// Ottieni le impostazioni dello studio fotografico
router.get("/", async (req, res) => {
  try {
    // Recupera le impostazioni esistenti
    const settingsData = await db.query.settings.findFirst();
    
    // Se non ci sono impostazioni, restituisci valori predefiniti
    if (!settingsData) {
      return res.json({
        id: 0,
        companyName: "Studio Fotografico",
        companyEmail: "info@studiofotografico.it",
        companyPhone: "",
        companyAddress: "",
        companyLogo: "",
        contractTemplate: "",
        quoteTemplate: "",
        taxRate: 22,
        defaultCurrency: "EUR",
        colorTheme: "default",
        additionalSettings: {},
      });
    }
    
    res.json(settingsData);
  } catch (error) {
    console.error("Errore nel recupero delle impostazioni:", error);
    res.status(500).json({ error: "Errore nel recupero delle impostazioni" });
  }
});

// Aggiorna le impostazioni dello studio fotografico
router.put("/", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const validatedData = insertSettingsSchema.parse(req.body);
    
    // Verifica se esistono già impostazioni
    const existingSettings = await db.query.settings.findFirst();
    
    let result;
    
    if (existingSettings) {
      // Aggiorna le impostazioni esistenti
      [result] = await db.update(settings)
        .set(validatedData)
        .where(eq(settings.id, existingSettings.id))
        .returning();
    } else {
      // Crea nuove impostazioni
      [result] = await db.insert(settings)
        .values(validatedData)
        .returning();
    }
    
    res.json(result);
  } catch (error) {
    console.error("Errore nell'aggiornamento delle impostazioni:", error);
    res.status(500).json({ error: "Errore nell'aggiornamento delle impostazioni" });
  }
});

export default router;
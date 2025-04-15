import { Router } from "express";
import { db } from "../db";
import { settings, insertSettingsSchema } from "@shared/schema";
import { isAuthenticated, isAdmin } from "../auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

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
    console.log("Dati ricevuti per aggiornamento settings:", req.body);
    
    // Crea uno schema più permissivo per l'aggiornamento parziale
    const updateSettingsSchema = z.object({
      companyName: z.string().optional(),
      companyEmail: z.string().optional(),
      companyPhone: z.string().optional().nullable(),
      companyAddress: z.string().optional().nullable(),
      companyLogo: z.string().optional().nullable(),
      contractTemplate: z.string().optional().nullable(),
      quoteTemplate: z.string().optional().nullable(),
      emailQuoteSignedAdmin: z.string().optional().nullable(),
      emailQuoteSignedClient: z.string().optional().nullable(),
      emailRegistrationNotification: z.string().optional().nullable(),
      emailApprovalNotification: z.string().optional().nullable(),
      emailDisabledNotification: z.string().optional().nullable(),
      emailPasswordReset: z.string().optional().nullable(),
      taxRate: z.number().optional(),
      defaultCurrency: z.string().optional(),
      colorTheme: z.string().optional(),
      additionalSettings: z.any().optional(),
    });
    
    const validatedData = updateSettingsSchema.parse(req.body);
    
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
      // Crea nuove impostazioni - qui serviranno campi obbligatori
      const requiredFields = {
        companyName: validatedData.companyName || "Studio Fotografico",
        companyEmail: validatedData.companyEmail || "info@studiofotografico.it",
        taxRate: validatedData.taxRate || 22,
        defaultCurrency: validatedData.defaultCurrency || "EUR",
        colorTheme: validatedData.colorTheme || "default",
        ...validatedData,
      };
      
      [result] = await db.insert(settings)
        .values(requiredFields)
        .returning();
    }
    
    res.json(result);
  } catch (error) {
    console.error("Errore nell'aggiornamento delle impostazioni:", error);
    res.status(500).json({ error: "Errore nell'aggiornamento delle impostazioni", details: error });
  }
});

export default router;
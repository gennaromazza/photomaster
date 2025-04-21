import { Request, Response } from "express";
import { db } from "../db";
import { photos, galleries, galleryChapters, photoSelections, photoComments, photoLikes } from "../../schema_gallery";
import * as fs from "fs";
import * as path from "path";

// Directory per file caricati
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "galleries");
const THUMBNAILS_DIR = path.join(UPLOAD_DIR, "thumbnails");
const MEDIUM_DIR = path.join(UPLOAD_DIR, "medium");
const LARGE_DIR = path.join(UPLOAD_DIR, "large");
const WEBP_DIR = path.join(UPLOAD_DIR, "webp");
const QR_DIR = path.join(UPLOAD_DIR, "qr");

/**
 * Controller per la pulizia completa delle gallerie e file associati
 */
export const cleanupGalleries = async (req: Request, res: Response) => {
  try {
    const { deleteFiles = true } = req.body;
    
    console.log("Avvio pulizia gallerie, eliminazione file fisici:", deleteFiles);
    
    // Conta le entità prima dell'eliminazione
    const photoCount = await db
      .select({
        count: db.fn.count().mapWith(Number)
      })
      .from(photos)
      .then(result => result[0]?.count || 0);
    
    const galleryCount = await db
      .select({
        count: db.fn.count().mapWith(Number)
      })
      .from(galleries)
      .then(result => result[0]?.count || 0);
    
    const totalPhotos = photoCount;
    const totalGalleries = galleryCount;
    
    console.log(`Trovate ${totalPhotos} foto e ${totalGalleries} gallerie da eliminare`);
    
    // Se richiesto, elimina i file fisici
    if (deleteFiles) {
      console.log("Eliminazione file fisici in corso...");
      
      // Ottieni tutti i file associati per eliminarli
      const allPhotos = await db.select().from(photos);
      
      // Elimina i file dal filesystem
      for (const photo of allPhotos) {
        try {
          // Elimina tutti i formati dell'immagine
          if (photo.path && fs.existsSync(photo.path)) {
            fs.unlinkSync(photo.path);
            console.log(`File eliminato: ${photo.path}`);
          }
          
          if (photo.thumbnailPath && fs.existsSync(photo.thumbnailPath)) {
            fs.unlinkSync(photo.thumbnailPath);
            console.log(`Thumbnail eliminata: ${photo.thumbnailPath}`);
          }
          
          if (photo.mediumPath && fs.existsSync(photo.mediumPath)) {
            fs.unlinkSync(photo.mediumPath);
            console.log(`Medium eliminata: ${photo.mediumPath}`);
          }
          
          if (photo.largePath && fs.existsSync(photo.largePath)) {
            fs.unlinkSync(photo.largePath);
            console.log(`Large eliminata: ${photo.largePath}`);
          }
          
          if (photo.webpPath && fs.existsSync(photo.webpPath)) {
            fs.unlinkSync(photo.webpPath);
            console.log(`WebP eliminata: ${photo.webpPath}`);
          }
        } catch (err) {
          console.error(`Errore nell'eliminazione del file ${photo.filename}:`, err);
        }
      }
      
      // Elimina anche i files QR code delle gallerie
      const qrDirectory = QR_DIR;
      if (fs.existsSync(qrDirectory)) {
        try {
          const files = fs.readdirSync(qrDirectory);
          for (const file of files) {
            fs.unlinkSync(path.join(qrDirectory, file));
            console.log(`QR code eliminato: ${file}`);
          }
          console.log("Tutti i QR code sono stati eliminati");
        } catch (err) {
          console.error("Errore nell'eliminazione dei QR code:", err);
        }
      }
    }
    
    // Elimina tutti i dati correlati dal database
    console.log("Eliminazione dati dal database in corso...");
    
    // L'eliminazione dovrebbe seguire l'ordine delle dipendenze
    await db.delete(photoSelections);
    await db.delete(photoComments);
    await db.delete(photoLikes);
    await db.delete(photos);
    await db.delete(galleryChapters);
    await db.delete(galleries);
    
    console.log("Pulizia gallerie completata con successo");
    
    res.json({
      success: true,
      message: "Pulizia gallerie completata con successo",
      galleries: totalGalleries,
      photos: totalPhotos
    });
  } catch (error) {
    console.error("Errore durante la pulizia delle gallerie:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: `Errore durante la pulizia delle gallerie: ${error.message}` });
    } else {
      res.status(500).json({ error: "Errore durante la pulizia delle gallerie" });
    }
  }
};
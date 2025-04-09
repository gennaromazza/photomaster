import { Request, Response, Express } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { isAuthenticated } from './auth';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurazione di base per multer
const storage = multer.diskStorage({
  destination: function (_, __, cb) {
    // Crea la directory di upload se non esiste
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (_, file, cb) {
    // Genera un nome file univoco
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniquePrefix + path.extname(file.originalname));
  }
});

// Filtro per accettare solo immagini
const fileFilter = (_: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accetta solo immagini
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Il file caricato non è un\'immagine valida'));
  }
};

// Configura multer con limiti specifici
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB in bytes
  }
});

/**
 * Ottimizza e salva un'immagine caricata
 */
async function processImage(file: Express.Multer.File): Promise<string> {
  const originalPath = file.path;
  const filename = uuidv4() + path.extname(file.originalname);
  const outputDir = path.join(__dirname, '../uploads/optimized');
  const outputPath = path.join(outputDir, filename);

  // Crea la directory per le immagini ottimizzate se non esiste
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Ottimizza l'immagine con Sharp
  try {
    await sharp(originalPath)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    
    // Rimuove il file originale
    fs.unlinkSync(originalPath);
    
    // Restituisce il percorso relativo dell'immagine
    return `/uploads/optimized/${filename}`;
  } catch (error) {
    console.error('Errore durante l\'ottimizzazione dell\'immagine:', error);
    throw new Error('Non è stato possibile elaborare l\'immagine');
  }
}

/**
 * Configura le rotte per l'upload
 */
export function setupUploadRoutes(app: Express) {
  // Crea una route per servire i file statici dalla cartella uploads
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  
  // Route per l'upload di un'immagine
  app.post('/api/upload/image', upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nessun file caricato' });
      }

      // Processa l'immagine e ottieni il percorso relativo
      const imagePath = await processImage(req.file);
      
      res.status(201).json({ 
        imagePath, 
        message: 'Immagine caricata con successo' 
      });
    } catch (error) {
      console.error('Errore upload immagine:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: 'Errore durante l\'upload dell\'immagine' });
    }
  });

  // Route per eliminare un'immagine
  app.delete('/api/upload/image', (req: Request, res: Response) => {
    try {
      const { imagePath } = req.body;
      
      if (!imagePath) {
        return res.status(400).json({ message: 'Percorso immagine non specificato' });
      }
      
      // Verifica che il percorso sia valido e non contenga ../
      if (imagePath.includes('..') || !imagePath.startsWith('/uploads/')) {
        return res.status(400).json({ message: 'Percorso immagine non valido' });
      }
      
      const fullPath = path.join(__dirname, '..', imagePath);
      
      // Verifica che il file esista
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return res.status(200).json({ message: 'Immagine eliminata con successo' });
      }
      
      res.status(404).json({ message: 'Immagine non trovata' });
    } catch (error) {
      console.error('Errore eliminazione immagine:', error);
      res.status(500).json({ message: 'Errore durante l\'eliminazione dell\'immagine' });
    }
  });
}
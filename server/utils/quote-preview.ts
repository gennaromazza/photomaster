import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { Storage } from '../storage';
import { Quote, Contract } from '../../shared/schema';

/**
 * Aggiunge una filigrana all'immagine di anteprima del preventivo
 * e restituisce il percorso dell'immagine risultante
 */
export async function generateWatermarkedPreview(
  quoteData: Quote, 
  storage: Storage
): Promise<string> {
  try {
    // Creiamo una cartella temporanea per le anteprime se non esiste
    const previewDir = path.join(process.cwd(), 'uploads', 'previews');
    if (!fs.existsSync(previewDir)) {
      fs.mkdirSync(previewDir, { recursive: true });
    }

    // Otteniamo il contratto se esiste
    let contractData = null;
    if (quoteData.contractId) {
      const contract = await storage.getContract(quoteData.contractId);
      contractData = contract;
    }

    // Otteniamo i dati del cliente
    const client = await storage.getClient(quoteData.clientId);
    
    // Otteniamo i dati dell'evento se è presente
    let eventData = null;
    if (quoteData.eventId) {
      const event = await storage.getEvent(quoteData.eventId);
      eventData = event;
    }

    // Otteniamo le impostazioni dello studio
    const settings = await storage.getSettings();

    // Creiamo l'immagine di anteprima
    const previewFileName = `quote_preview_${quoteData.id}_${Date.now()}.png`;
    const previewPath = path.join(previewDir, previewFileName);

    // Dimensioni dell'immagine
    const width = 1200;
    const height = 630;
    
    // Creiamo un buffer con SVG che rappresenta l'anteprima del preventivo
    const svgBuffer = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f8f9fa" />
      
      <!-- Filigrana con logo dello studio -->
      <text x="${width / 2}" y="${height / 2}" 
            font-family="Arial" font-size="80" fill="rgba(0,0,0,0.08)" text-anchor="middle" dominant-baseline="middle"
            transform="rotate(-30, ${width / 2}, ${height / 2})">
        ${settings?.studioName || 'Studio Fotografico'}
      </text>
      
      <!-- Bordo -->
      <rect x="10" y="10" width="${width - 20}" height="${height - 20}" 
            stroke="#e0e0e0" stroke-width="2" fill="none" />
      
      <!-- Header -->
      <rect x="0" y="0" width="${width}" height="120" fill="#303030" />
      
      <!-- Logo dello studio -->
      <text x="50" y="70" font-family="Arial" font-size="28" fill="#ffffff" font-weight="bold">
        ${settings?.studioName || 'Studio Fotografico'}
      </text>
      
      <!-- Titolo del preventivo -->
      <text x="50" y="180" font-family="Arial" font-size="40" fill="#303030" font-weight="bold">
        Preventivo
      </text>
      
      <!-- Dettagli preventivo -->
      <text x="50" y="230" font-family="Arial" font-size="24" fill="#505050">
        Riferimento: ${quoteData.reference || ''}
      </text>
      
      <!-- Cliente -->
      <text x="50" y="280" font-family="Arial" font-size="24" fill="#505050">
        Cliente: ${client?.firstName || ''} ${client?.lastName || ''}
      </text>
      
      <!-- Evento -->
      ${eventData ? `
      <text x="50" y="330" font-family="Arial" font-size="24" fill="#505050">
        Evento: ${eventData.title || ''}
      </text>
      ` : ''}
      
      <!-- Data preventivo -->
      <text x="50" y="380" font-family="Arial" font-size="20" fill="#707070">
        Data: ${new Date(quoteData.createdAt).toLocaleDateString('it-IT')}
      </text>
      
      <!-- Importo -->
      <text x="50" y="430" font-family="Arial" font-size="36" fill="#303030" font-weight="bold">
        Totale: €${quoteData.total ? (quoteData.total / 100).toFixed(2) : '0,00'}
      </text>
      
      <!-- Stato -->
      <rect x="${width - 250}" y="50" width="200" height="60" rx="5" ry="5" 
            fill="${quoteData.status === 'approved' ? '#4CAF50' : quoteData.status === 'pending' ? '#FFC107' : '#9E9E9E'}" />
      <text x="${width - 150}" y="90" font-family="Arial" font-size="24" fill="#ffffff" text-anchor="middle">
        ${quoteData.status === 'approved' ? 'Approvato' : quoteData.status === 'pending' ? 'In attesa' : 'Bozza'}
      </text>
      
      <!-- Footer -->
      <rect x="0" y="${height - 80}" width="${width}" height="80" fill="#f0f0f0" />
      <text x="${width / 2}" y="${height - 40}" font-family="Arial" font-size="18" fill="#707070" text-anchor="middle">
        ${settings?.studioName || 'Studio Fotografico'} | ${settings?.email || ''} | ${settings?.phone || ''}
      </text>
    </svg>
    `);

    // Convertiamo l'SVG in un'immagine PNG
    await sharp(svgBuffer)
      .png()
      .toFile(previewPath);

    return previewPath;
  } catch (error) {
    console.error('Errore nella generazione dell\'anteprima:', error);
    throw new Error('Impossibile generare l\'anteprima del preventivo');
  }
}
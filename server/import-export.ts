import { Request, Response } from 'express';
import { storage } from './storage';
import { createReadStream, writeFileSync } from 'fs';
import csvParser from 'csv-parser';
import * as xlsx from 'xlsx';
import { tmpdir } from 'os';
import { join } from 'path';
import { Client, InsertClient } from '@shared/schema';
import { randomUUID } from 'crypto';

// Mappa i campi dell'intestazione dal file importato ai campi del modello Client
export interface FieldMapping {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  companyName?: string;
  zipCode?: string;
  state?: string;
  province?: string;
  fiscalCode?: string;
  city?: string;
  internationalPrefix?: string;
  notes?: string;
}

// Estrae l'estensione dal nome del file
function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

// Importa clienti da un file CSV
async function importFromCSV(filePath: string, fieldMapping: FieldMapping): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    
    createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data: any) => results.push(data))
      .on('end', () => {
        console.log('CSV headers found:', Object.keys(results[0] || {}));
        resolve(results);
      })
      .on('error', (error: Error) => {
        console.error('Error parsing CSV:', error);
        reject(error);
      });
  });
}

// Importa clienti da un file Excel
async function importFromExcel(filePath: string): Promise<any[]> {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
}

// Converte i dati importati nel formato client utilizzando la mappatura dei campi
function convertToClientFormat(data: any[], fieldMapping: FieldMapping): InsertClient[] {
  return data.map(row => {
    const client: any = {};
    
    if (fieldMapping.firstName && row[fieldMapping.firstName]) {
      client.firstName = row[fieldMapping.firstName].toString();
    } else {
      client.firstName = '';
    }
    
    if (fieldMapping.lastName && row[fieldMapping.lastName]) {
      client.lastName = row[fieldMapping.lastName].toString();
    } else {
      client.lastName = '';
    }
    
    if (fieldMapping.email && row[fieldMapping.email]) {
      client.email = row[fieldMapping.email].toString();
    } else {
      client.email = `import_${randomUUID().substring(0, 8)}@example.com`;
    }
    
    if (fieldMapping.phone && row[fieldMapping.phone]) {
      client.phone = row[fieldMapping.phone].toString();
    } else {
      client.phone = null;
    }
    
    if (fieldMapping.address && row[fieldMapping.address]) {
      client.address = row[fieldMapping.address].toString();
    } else {
      client.address = null;
    }
    
    // Aggiungi i nuovi campi dal CSV
    if (fieldMapping.companyName && row[fieldMapping.companyName]) {
      client.companyName = row[fieldMapping.companyName].toString();
    } else {
      client.companyName = null;
    }
    
    if (fieldMapping.zipCode && row[fieldMapping.zipCode]) {
      client.zipCode = row[fieldMapping.zipCode].toString();
    } else {
      client.zipCode = null;
    }
    
    if (fieldMapping.state && row[fieldMapping.state]) {
      client.state = row[fieldMapping.state].toString();
    } else {
      client.state = null;
    }
    
    if (fieldMapping.province && row[fieldMapping.province]) {
      client.province = row[fieldMapping.province].toString();
    } else {
      client.province = null;
    }
    
    if (fieldMapping.fiscalCode && row[fieldMapping.fiscalCode]) {
      client.fiscalCode = row[fieldMapping.fiscalCode].toString();
    } else {
      client.fiscalCode = null;
    }
    
    if (fieldMapping.city && row[fieldMapping.city]) {
      client.city = row[fieldMapping.city].toString();
    } else {
      client.city = null;
    }
    
    if (fieldMapping.internationalPrefix && row[fieldMapping.internationalPrefix]) {
      client.internationalPrefix = row[fieldMapping.internationalPrefix].toString();
    } else {
      client.internationalPrefix = null;
    }
    
    if (fieldMapping.notes && row[fieldMapping.notes]) {
      client.notes = row[fieldMapping.notes].toString();
    } else {
      client.notes = null;
    }
    
    return client as InsertClient;
  });
}

// Analizza i dati per determinare le intestazioni disponibili
export async function analyzeFile(filePath: string): Promise<string[]> {
  const extension = getFileExtension(filePath);
  let headers: string[] = [];
  
  if (extension === 'csv') {
    const data = await importFromCSV(filePath, {});
    if (data.length > 0) {
      headers = Object.keys(data[0]);
      console.log('CSV headers extracted:', headers);
    }
  } else if (extension === 'xlsx' || extension === 'xls') {
    const data = await importFromExcel(filePath);
    if (data.length > 0) {
      headers = Object.keys(data[0]);
      console.log('Excel headers extracted:', headers);
    }
  }
  
  // Pulisci le intestazioni rimuovendo virgolette se presenti
  headers = headers.map(header => header.replace(/^["']|["']$/g, '').trim());
  
  return headers;
}

// Gestisce l'upload del file e restituisce le intestazioni per la mappatura
export async function handleFileUpload(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Nessun file caricato" });
      return;
    }
    
    const filePath = req.file.path;
    const headers = await analyzeFile(filePath);
    
    res.status(200).json({
      filePath,
      headers,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error("Errore durante l'analisi del file:", error);
    res.status(500).json({ error: "Errore durante l'analisi del file" });
  }
}

// Importa clienti da un file con la mappatura dei campi specificata
/**
 * Gestisce l'importazione dei clienti da un file caricato sul server
 */
export async function importClients(req: Request, res: Response): Promise<void> {
  try {
    const { filePath, fieldMapping } = req.body;
    
    if (!filePath || !fieldMapping) {
      res.status(400).json({ error: "Dati mancanti: percorso del file o mappatura dei campi" });
      return;
    }
    
    const extension = getFileExtension(filePath);
    let rawData: any[] = [];
    
    if (extension === 'csv') {
      rawData = await importFromCSV(filePath, fieldMapping);
    } else if (extension === 'xlsx' || extension === 'xls') {
      rawData = await importFromExcel(filePath);
    } else {
      res.status(400).json({ error: "Formato file non supportato" });
      return;
    }
    
    const clientsToInsert = convertToClientFormat(rawData, fieldMapping);
    const importedClients: Client[] = [];
    const errors: any[] = [];
    
    // Inserisci i clienti nel database
    for (const client of clientsToInsert) {
      try {
        const newClient = await storage.createClient(client);
        importedClients.push(newClient);
      } catch (error) {
        errors.push({
          client,
          error: (error as Error).message
        });
      }
    }
    
    res.status(200).json({
      success: true,
      imported: importedClients.length,
      total: clientsToInsert.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("Errore durante l'importazione dei clienti:", error);
    res.status(500).json({ error: "Errore durante l'importazione dei clienti" });
  }
}

// Esporta tutti i clienti in formato CSV
/**
 * Gestisce l'importazione diretta dei clienti (i dati vengono inviati direttamente dal frontend)
 */
export async function importDirectClients(req: Request, res: Response): Promise<void> {
  try {
    const { clients } = req.body;
    
    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      res.status(400).json({ error: "Nessun cliente da importare" });
      return;
    }
    
    const importedClients: Client[] = [];
    const errors: any[] = [];
    
    // Inserisci i clienti nel database
    for (const client of clients) {
      try {
        // Valida i campi obbligatori (nome e cognome)
        if (!client.firstName || !client.lastName) {
          errors.push({
            client,
            error: "Nome e cognome sono campi obbligatori"
          });
          continue;
        }
        
        const newClient = await storage.createClient(client);
        importedClients.push(newClient);
      } catch (error) {
        errors.push({
          client,
          error: (error as Error).message
        });
      }
    }
    
    res.status(200).json({
      success: true,
      imported: importedClients.length,
      total: clients.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("Errore durante l'importazione diretta dei clienti:", error);
    res.status(500).json({ error: "Errore durante l'importazione dei clienti" });
  }
}

/**
 * Esporta tutti i clienti in formato Excel
 */
export async function exportClientsCSV(req: Request, res: Response): Promise<void> {
  try {
    const clients = await storage.getAllClients();
    
    if (!clients || clients.length === 0) {
      res.status(404).json({ error: "Nessun cliente da esportare" });
      return;
    }
    
    // Crea un file CSV temporaneo
    const csvData = clients.map(client => {
      return {
        ID: client.id,
        'Nome Azienda': client.companyName || '',
        Nome: client.firstName,
        Cognome: client.lastName,
        Email: client.email,
        Telefono: client.phone || '',
        Indirizzo: client.address || '',
        'C.A.P.': client.zipCode || '',
        Stato: client.state || '',
        Provincia: client.province || '',
        'Codice Fiscale': client.fiscalCode || '',
        Città: client.city || '',
        'Prefisso Internazionale': client.internationalPrefix || '',
        Note: client.notes || '',
        'Data Creazione': new Date(client.createdAt).toLocaleDateString()
      };
    });
    
    const worksheet = xlsx.utils.json_to_sheet(csvData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Clienti');
    
    const fileName = `export_clienti_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const filePath = join(tmpdir(), fileName);
    
    xlsx.writeFile(workbook, filePath);
    
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Errore durante il download del file:", err);
        res.status(500).send("Errore durante il download del file");
      }
    });
  } catch (error) {
    console.error("Errore durante l'esportazione dei clienti:", error);
    res.status(500).json({ error: "Errore durante l'esportazione dei clienti" });
  }
}
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
        resolve(results);
      })
      .on('error', (error: Error) => {
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
    }
  } else if (extension === 'xlsx' || extension === 'xls') {
    const data = await importFromExcel(filePath);
    if (data.length > 0) {
      headers = Object.keys(data[0]);
    }
  }
  
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
        Nome: client.firstName,
        Cognome: client.lastName,
        Email: client.email,
        Telefono: client.phone || '',
        Indirizzo: client.address || '',
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
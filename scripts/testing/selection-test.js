/**
 * Script di test per il sistema di selezione delle foto
 * 
 * Questo script verifica tutte le funzionalità del sistema di selezione:
 * - Impostazioni di selezione (creazione, lettura, aggiornamento)
 * - Sessioni (creazione, lettura, aggiornamento, eliminazione)
 * - Selezione di foto (aggiunta, rimozione, lettura)
 * - Commenti (aggiunta, risposta, lettura, marcatura come letti)
 * - Funzionalità di esportazione
 * 
 * Usa lo script con: node scripts/testing/selection-test.js
 */

import axios from 'axios';
import colors from 'colors';
import { v4 as uuidv4 } from 'uuid';

// Configurazione
const BASE_URL = 'http://localhost:5000/api';
const SELECTION_BASE_URL = `${BASE_URL}/selection`;
const GALLERY_BASE_URL = `${BASE_URL}/gallery`;
let CSRF_TOKEN = null;
let galleryId = null;
let sessionId = null;
let photoId = null;
let commentId = null;

// Utility per i log colorati
const logSuccess = (message) => console.log(colors.green(`✓ ${message}`));
const logInfo = (message) => console.log(colors.blue(`ℹ ${message}`));
const logWarning = (message) => console.log(colors.yellow(`⚠ ${message}`));
const logError = (message, error) => {
  console.log(colors.red(`✗ ${message}`));
  if (error && error.response) {
    console.log(colors.red(`  Dettagli: ${error.response.status} - ${JSON.stringify(error.response.data)}`));
  } else if (error) {
    console.log(colors.red(`  Errore: ${error.message || JSON.stringify(error)}`));
  }
};

// Utility per le richieste HTTP
const api = {
  async getCsrfToken() {
    try {
      const response = await axios.get(`${BASE_URL}/csrf-token`);
      CSRF_TOKEN = response.data.csrfToken;
      logSuccess('Token CSRF ottenuto');
      return CSRF_TOKEN;
    } catch (error) {
      logError('Impossibile ottenere il token CSRF', error);
      throw error;
    }
  },

  async getHeaders() {
    if (!CSRF_TOKEN) {
      await this.getCsrfToken();
    }
    return {
      'Content-Type': 'application/json',
      'X-CSRF-Token': CSRF_TOKEN
    };
  },

  async get(url) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async post(url, data) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(url, data, { headers });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async put(url, data) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.put(url, data, { headers });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async delete(url) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.delete(url, { headers });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Step 1: Trovare una galleria esistente
async function findGallery() {
  try {
    logInfo('Cercando gallerie esistenti...');
    const galleries = await api.get(`${GALLERY_BASE_URL}/galleries`);
    
    if (!galleries || galleries.length === 0) {
      logWarning('Nessuna galleria trovata. Creare prima una galleria.');
      process.exit(1);
    }
    
    galleryId = galleries[0].id;
    logSuccess(`Galleria trovata: ID ${galleryId}`);
    
    // Trovare anche una foto nella galleria
    const galleryPhotos = await api.get(`${GALLERY_BASE_URL}/galleries/${galleryId}/photos`);
    if (galleryPhotos && galleryPhotos.photos && galleryPhotos.photos.length > 0) {
      photoId = galleryPhotos.photos[0].id;
      logSuccess(`Foto trovata: ID ${photoId}`);
    } else {
      logWarning('Nessuna foto trovata nella galleria. Alcune funzionalità di test saranno limitate.');
    }
    
    return galleryId;
  } catch (error) {
    logError('Errore durante la ricerca delle gallerie', error);
    process.exit(1);
  }
}

// Step 2: Testare le impostazioni di selezione
async function testSelectionSettings() {
  logInfo('\n== Test Impostazioni di Selezione ==');
  
  try {
    // Ottieni impostazioni esistenti o crea impostazioni di default
    let settings;
    try {
      logInfo('Tentativo di ottenere impostazioni esistenti...');
      settings = await api.get(`${SELECTION_BASE_URL}/settings/${galleryId}`);
      logSuccess('Impostazioni esistenti recuperate');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        logWarning('Nessuna impostazione trovata, verranno create impostazioni di default');
      } else {
        throw error;
      }
    }
    
    // Aggiorna le impostazioni
    const updateData = {
      isEnabled: true,
      maxSelections: 10,
      allowComments: true,
      customMessage: `Test message ${new Date().toISOString()}`
    };
    
    logInfo('Aggiornamento impostazioni...');
    const updatedSettings = await api.put(`${SELECTION_BASE_URL}/settings/${galleryId}`, updateData);
    
    if (updatedSettings && updatedSettings.id) {
      logSuccess('Impostazioni aggiornate correttamente');
      console.log(JSON.stringify(updatedSettings, null, 2));
      return updatedSettings;
    } else {
      logError('Risposta non valida durante l\'aggiornamento delle impostazioni');
    }
  } catch (error) {
    logError('Errore durante il test delle impostazioni', error);
  }
}

// Step 3: Testare creazione sessione
async function testCreateSession() {
  logInfo('\n== Test Creazione Sessione ==');
  
  try {
    const sessionData = {
      galleryId: galleryId,
      clientName: `Test Client ${new Date().getTime()}`,
      clientEmail: `test${new Date().getTime()}@example.com`,
      notes: 'Test session created by automated test script'
    };
    
    logInfo('Creazione sessione di selezione...');
    const session = await api.post(`${SELECTION_BASE_URL}/sessions`, sessionData);
    
    if (session && session.id) {
      sessionId = session.id;
      logSuccess(`Sessione creata: ID ${sessionId}`);
      console.log(JSON.stringify(session, null, 2));
      return session;
    } else {
      logError('Risposta non valida durante la creazione della sessione');
    }
  } catch (error) {
    logError('Errore durante la creazione della sessione', error);
  }
}

// Step 4: Testare recupero sessioni per galleria
async function testGetSessionsByGallery() {
  logInfo('\n== Test Recupero Sessioni per Galleria ==');
  
  try {
    logInfo(`Recupero sessioni per galleria ID ${galleryId}...`);
    const sessions = await api.get(`${SELECTION_BASE_URL}/sessions/gallery/${galleryId}`);
    
    if (Array.isArray(sessions)) {
      logSuccess(`Recuperate ${sessions.length} sessioni`);
      return sessions;
    } else {
      logError('Risposta non valida durante il recupero delle sessioni');
    }
  } catch (error) {
    logError('Errore durante il recupero delle sessioni', error);
  }
}

// Step 5: Testare recupero sessione singola
async function testGetSession() {
  logInfo('\n== Test Recupero Sessione Singola ==');
  
  if (!sessionId) {
    logWarning('Nessun ID sessione disponibile per il test');
    return;
  }
  
  try {
    logInfo(`Recupero sessione ID ${sessionId}...`);
    const session = await api.get(`${SELECTION_BASE_URL}/sessions/${sessionId}`);
    
    if (session && session.id) {
      logSuccess('Sessione recuperata correttamente');
      return session;
    } else {
      logError('Risposta non valida durante il recupero della sessione');
    }
  } catch (error) {
    logError('Errore durante il recupero della sessione', error);
  }
}

// Step 6: Testare toggle selezione foto
async function testTogglePhotoSelection() {
  logInfo('\n== Test Toggle Selezione Foto ==');
  
  if (!sessionId || !photoId) {
    logWarning('Mancano ID sessione o ID foto per il test');
    return;
  }
  
  try {
    logInfo(`Selezionando foto ID ${photoId} per sessione ID ${sessionId}...`);
    const toggleData = { sessionId: sessionId, photoId: photoId };
    const selection = await api.post(`${SELECTION_BASE_URL}/selections/toggle`, toggleData);
    
    if (selection) {
      logSuccess(`Foto ${selection.action === 'added' ? 'selezionata' : 'deselezionata'} correttamente`);
      return selection;
    } else {
      logError('Risposta non valida durante la selezione della foto');
    }
  } catch (error) {
    logError('Errore durante la selezione della foto', error);
  }
}

// Step 7: Testare recupero selezioni per sessione
async function testGetSessionSelections() {
  logInfo('\n== Test Recupero Selezioni per Sessione ==');
  
  if (!sessionId) {
    logWarning('Nessun ID sessione disponibile per il test');
    return;
  }
  
  try {
    logInfo(`Recupero selezioni per sessione ID ${sessionId}...`);
    const selections = await api.get(`${SELECTION_BASE_URL}/selections/session/${sessionId}`);
    
    if (Array.isArray(selections)) {
      logSuccess(`Recuperate ${selections.length} selezioni`);
      return selections;
    } else {
      logError('Risposta non valida durante il recupero delle selezioni');
    }
  } catch (error) {
    logError('Errore durante il recupero delle selezioni', error);
  }
}

// Step 8: Testare aggiunta commento
async function testAddComment() {
  logInfo('\n== Test Aggiunta Commento ==');
  
  if (!sessionId || !photoId) {
    logWarning('Mancano ID sessione o ID foto per il test');
    return;
  }
  
  try {
    const commentData = {
      photoId: photoId,
      sessionId: sessionId,
      content: `Test comment ${new Date().toISOString()}`,
      clientName: 'Test Script'
    };
    
    logInfo('Aggiunta commento...');
    const comment = await api.post(`${SELECTION_BASE_URL}/comments`, commentData);
    
    if (comment && comment.id) {
      commentId = comment.id;
      logSuccess(`Commento aggiunto: ID ${commentId}`);
      return comment;
    } else {
      logError('Risposta non valida durante l\'aggiunta del commento');
    }
  } catch (error) {
    logError('Errore durante l\'aggiunta del commento', error);
  }
}

// Step 9: Testare risposta a commento
async function testReplyToComment() {
  logInfo('\n== Test Risposta a Commento ==');
  
  if (!commentId || !sessionId || !photoId) {
    logWarning('Mancano dati necessari per il test');
    return;
  }
  
  try {
    const replyData = {
      photoId: photoId,
      sessionId: sessionId,
      content: `Test reply ${new Date().toISOString()}`,
      parentId: commentId
    };
    
    logInfo(`Risposta al commento ID ${commentId}...`);
    const reply = await api.post(`${SELECTION_BASE_URL}/comments/reply`, replyData);
    
    if (reply && reply.id) {
      logSuccess(`Risposta aggiunta: ID ${reply.id}`);
      return reply;
    } else {
      logError('Risposta non valida durante l\'aggiunta della risposta');
    }
  } catch (error) {
    logError('Errore durante l\'aggiunta della risposta', error);
  }
}

// Step 10: Testare recupero commenti per sessione
async function testGetSessionComments() {
  logInfo('\n== Test Recupero Commenti per Sessione ==');
  
  if (!sessionId) {
    logWarning('Nessun ID sessione disponibile per il test');
    return;
  }
  
  try {
    logInfo(`Recupero commenti per sessione ID ${sessionId}...`);
    const comments = await api.get(`${SELECTION_BASE_URL}/comments/session/${sessionId}`);
    
    if (Array.isArray(comments)) {
      logSuccess(`Recuperati ${comments.length} commenti`);
      return comments;
    } else {
      logError('Risposta non valida durante il recupero dei commenti');
    }
  } catch (error) {
    logError('Errore durante il recupero dei commenti', error);
  }
}

// Step 11: Testare recupero commenti per foto
async function testGetPhotoComments() {
  logInfo('\n== Test Recupero Commenti per Foto ==');
  
  if (!photoId) {
    logWarning('Nessun ID foto disponibile per il test');
    return;
  }
  
  try {
    logInfo(`Recupero commenti per foto ID ${photoId}...`);
    const comments = await api.get(`${SELECTION_BASE_URL}/comments/photo/${photoId}`);
    
    if (Array.isArray(comments)) {
      logSuccess(`Recuperati ${comments.length} commenti`);
      return comments;
    } else {
      logError('Risposta non valida durante il recupero dei commenti');
    }
  } catch (error) {
    logError('Errore durante il recupero dei commenti', error);
  }
}

// Step 12: Testare marcatura commento come letto
async function testMarkCommentAsRead() {
  logInfo('\n== Test Marcatura Commento come Letto ==');
  
  if (!commentId) {
    logWarning('Nessun ID commento disponibile per il test');
    return;
  }
  
  try {
    logInfo(`Marcatura commento ID ${commentId} come letto...`);
    const result = await api.put(`${SELECTION_BASE_URL}/comments/${commentId}/read`, {});
    
    if (result) {
      logSuccess('Commento marcato come letto');
      return result;
    } else {
      logError('Risposta non valida durante la marcatura del commento');
    }
  } catch (error) {
    logError('Errore durante la marcatura del commento', error);
  }
}

// Step 13: Testare completamento sessione
async function testCompleteSession() {
  logInfo('\n== Test Completamento Sessione ==');
  
  if (!sessionId) {
    logWarning('Nessun ID sessione disponibile per il test');
    return;
  }
  
  try {
    logInfo(`Completamento sessione ID ${sessionId}...`);
    const session = await api.put(`${SELECTION_BASE_URL}/sessions/${sessionId}/complete`, {});
    
    if (session && session.id) {
      logSuccess('Sessione completata correttamente');
      return session;
    } else {
      logError('Risposta non valida durante il completamento della sessione');
    }
  } catch (error) {
    logError('Errore durante il completamento della sessione', error);
  }
}

// Step 14: Testare esportazione selezioni
async function testExportSelections() {
  logInfo('\n== Test Esportazione Selezioni ==');
  
  if (!sessionId) {
    logWarning('Nessun ID sessione disponibile per il test');
    return;
  }
  
  try {
    logInfo(`Esportazione selezioni per sessione ID ${sessionId}...`);
    const exportData = await api.get(`${SELECTION_BASE_URL}/export/${sessionId}`);
    
    if (exportData) {
      logSuccess('Esportazione completata correttamente');
      return exportData;
    } else {
      logError('Risposta non valida durante l\'esportazione');
    }
  } catch (error) {
    logError('Errore durante l\'esportazione', error);
  }
}

// Step 15: Testare eliminazione sessione
async function testDeleteSession() {
  logInfo('\n== Test Eliminazione Sessione ==');
  
  if (!sessionId) {
    logWarning('Nessun ID sessione disponibile per il test');
    return;
  }
  
  try {
    logInfo(`Eliminazione sessione ID ${sessionId}...`);
    const result = await api.delete(`${SELECTION_BASE_URL}/sessions/${sessionId}`);
    
    if (result && result.success) {
      logSuccess('Sessione eliminata correttamente');
      return result;
    } else {
      logError('Risposta non valida durante l\'eliminazione della sessione');
    }
  } catch (error) {
    logError('Errore durante l\'eliminazione della sessione', error);
  }
}

// Esecuzione dei test in sequenza
async function runTests() {
  console.log('\n=== TEST SISTEMA DI SELEZIONE FOTO ===\n');
  
  try {
    // Preparazione
    await findGallery();
    
    // Test impostazioni
    await testSelectionSettings();
    
    // Test sessioni
    const session = await testCreateSession();
    await testGetSessionsByGallery();
    await testGetSession();
    
    // Test selezioni
    await testTogglePhotoSelection();
    await testGetSessionSelections();
    
    // Test commenti
    await testAddComment();
    await testReplyToComment();
    await testGetSessionComments();
    await testGetPhotoComments();
    await testMarkCommentAsRead();
    
    // Test sessione e esportazione
    await testCompleteSession();
    await testExportSelections();
    await testDeleteSession();
    
    console.log('\n=== TEST COMPLETATI ===\n');
  } catch (error) {
    console.log('\n=== TEST FALLITI ===\n');
    console.error(error);
  }
}

// Avvio dei test
runTests();
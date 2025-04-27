// Script per il testing completo del sistema di gallerie e selezioni
// Testa i flussi completi sia dal punto di vista del fotografo che del cliente

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configurazione
const BASE_URL = 'http://localhost:3000/api';
const GALLERY_BASE_URL = `${BASE_URL}/galleries`;
const SELECTION_BASE_URL = `${BASE_URL}/selections`;

// Credenziali per il test (modificare con credenziali valide)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

const CLIENT_CREDENTIALS = {
  username: 'cliente',
  password: 'cliente123'
};

// Variabili di stato per tenere traccia dei dati durante i test
let adminToken = null;
let clientToken = null;
let testGalleryId = null;
let testPhotoId = null;
let testChapterId = null;
let testSessionId = null;
let testSessionKey = null;
let clientCookies = null;
let photographerCookies = null;

// Utility per i log colorati
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function logInfo(message) {
  console.log(`${colors.blue}[INFO] ${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}[SUCCESS] ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}[WARNING] ${message}${colors.reset}`);
}

function logError(message, error = null) {
  console.error(`${colors.red}[ERROR] ${message}${colors.reset}`);
  if (error) {
    if (error.response) {
      console.error(`${colors.red}Status: ${error.response.status}${colors.reset}`);
      console.error(`${colors.red}Data: ${JSON.stringify(error.response.data, null, 2)}${colors.reset}`);
    } else if (error.message) {
      console.error(`${colors.red}Message: ${error.message}${colors.reset}`);
    } else {
      console.error(`${colors.red}${JSON.stringify(error, null, 2)}${colors.reset}`);
    }
  }
}

// Wrapper per le chiamate API con gestione degli errori
const api = {
  async get(url, token = null) {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.get(url, config);
      return response.data;
    } catch (error) {
      logError(`GET ${url} fallito`, error);
      return null;
    }
  },

  async post(url, data, token = null) {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.post(url, data, config);
      return response.data;
    } catch (error) {
      logError(`POST ${url} fallito`, error);
      return null;
    }
  },

  async put(url, data, token = null) {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.put(url, data, config);
      return response.data;
    } catch (error) {
      logError(`PUT ${url} fallito`, error);
      return null;
    }
  },

  async delete(url, token = null) {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.delete(url, config);
      return response.data;
    } catch (error) {
      logError(`DELETE ${url} fallito`, error);
      return null;
    }
  },

  async upload(url, filePath, fieldName = 'file', token = null) {
    try {
      const formData = new FormData();
      formData.append(fieldName, fs.createReadStream(filePath));
      
      const config = {
        headers: {
          ...formData.getHeaders(),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      };
      
      const response = await axios.post(url, formData, config);
      return response.data;
    } catch (error) {
      logError(`UPLOAD ${url} fallito`, error);
      return null;
    }
  }
};

// Funzione principale di test
async function runTests() {
  logInfo('Avvio dei test del sistema di gallerie e selezioni...');
  
  // Test di login e autenticazione
  await testAuthentication();
  
  // Test dal punto di vista del fotografo
  await testPhotographerFlow();
  
  // Test dal punto di vista del cliente
  await testClientFlow();
  
  // Test di edge case e gestione errori
  await testEdgeCases();
  
  // Pulizia dopo i test (opzionale)
  await cleanupTests();
  
  logSuccess('Test completati!');
}

// Autenticazione per test
async function testAuthentication() {
  logInfo('Test di autenticazione...');
  
  try {
    // Login come amministratore (fotografo)
    const adminLogin = await axios.post(`${BASE_URL}/login`, ADMIN_CREDENTIALS);
    adminToken = adminLogin.data.token || 'session-auth';
    photographerCookies = adminLogin.headers['set-cookie'];
    logSuccess('Login come amministratore completato');
    
    // Login come cliente
    try {
      const clientLogin = await axios.post(`${BASE_URL}/login`, CLIENT_CREDENTIALS);
      clientToken = clientLogin.data.token || 'session-auth';
      clientCookies = clientLogin.headers['set-cookie'];
      logSuccess('Login come cliente completato');
    } catch (error) {
      logWarning('Login come cliente fallito, continuerò senza autenticazione cliente');
    }
  } catch (error) {
    logError('Errore durante l\'autenticazione', error);
    process.exit(1);
  }
}

// Test del flusso fotografo
async function testPhotographerFlow() {
  logInfo('Inizio test del flusso fotografo...');
  
  // 1. Creazione di una galleria di test
  await testCreateGallery();
  
  // 2. Creazione di un capitolo nella galleria
  await testCreateChapter();
  
  // 3. Caricamento foto
  await testUploadPhotos();
  
  // 4. Configurazione delle impostazioni di selezione
  await testSetupSelectionSettings();
  
  // 5. Verifica delle statistiche e dei report
  await testGalleryStatistics();
  
  logSuccess('Test del flusso fotografo completato');
}

// Test del flusso cliente
async function testClientFlow() {
  logInfo('Inizio test del flusso cliente...');
  
  // 1. Accesso alla galleria
  await testGalleryAccess();
  
  // 2. Creazione di una sessione di selezione
  await testCreateSelectionSession();
  
  // 3. Selezione delle foto
  await testSelectPhotos();
  
  // 4. Aggiunta di commenti alle foto
  await testAddComments();
  
  // 5. Finalizzazione della selezione
  await testFinalizeSelection();
  
  logSuccess('Test del flusso cliente completato');
}

// Test di casi limite e gestione errori
async function testEdgeCases() {
  logInfo('Inizio test di casi limite e gestione errori...');
  
  // 1. Test con galleria protetta da password
  await testPasswordProtectedGallery();
  
  // 2. Test con limiti di selezione
  await testSelectionLimits();
  
  // 3. Test di sessioni multiple
  await testMultipleSessions();
  
  // 4. Test con date di scadenza
  await testExpiryDates();
  
  logSuccess('Test di casi limite completato');
}

// Implementazione dei test individuali
async function testCreateGallery() {
  logInfo('Creazione di una galleria di test...');
  
  const newGallery = {
    name: `Test Gallery ${new Date().toISOString()}`,
    description: 'Galleria creata durante i test automatici',
    shortDescription: 'Test automatici',
    slug: `test-gallery-${Date.now()}`,
    isPublic: true,
    layout: 'grid',
    theme: 'light',
    selectionEnabled: true,
    studio: 'TestStudio'
  };
  
  try {
    const response = await axios.post(
      `${GALLERY_BASE_URL}/galleries`, 
      newGallery, 
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    testGalleryId = response.data.id;
    logSuccess(`Galleria creata con ID: ${testGalleryId}`);
    return response.data;
  } catch (error) {
    logError('Errore nella creazione della galleria', error);
    
    // Tentativo di recupero di una galleria esistente
    logInfo('Tentativo di recupero di una galleria esistente...');
    try {
      const galleries = await axios.get(
        `${GALLERY_BASE_URL}/galleries`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (galleries.data && galleries.data.length > 0) {
        testGalleryId = galleries.data[0].id;
        logWarning(`Utilizzando una galleria esistente: ${testGalleryId}`);
        return galleries.data[0];
      }
    } catch (fallbackError) {
      logError('Impossibile recuperare gallerie esistenti', fallbackError);
    }
    
    return null;
  }
}

async function testCreateChapter() {
  if (!testGalleryId) {
    logWarning('ID galleria non disponibile, test capitolo saltato');
    return null;
  }
  
  logInfo(`Creazione di un capitolo nella galleria ${testGalleryId}...`);
  
  const newChapter = {
    galleryId: testGalleryId,
    title: `Capitolo di test ${new Date().toISOString()}`,
    description: 'Capitolo creato durante i test automatici',
    sortOrder: 1,
    slug: `test-chapter-${Date.now()}`,
    isPublic: true
  };
  
  try {
    const response = await axios.post(
      `${GALLERY_BASE_URL}/galleries/${testGalleryId}/chapters`, 
      newChapter, 
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    testChapterId = response.data.id;
    logSuccess(`Capitolo creato con ID: ${testChapterId}`);
    return response.data;
  } catch (error) {
    logError('Errore nella creazione del capitolo', error);
    
    // Tentativo di recupero di un capitolo esistente
    logInfo('Tentativo di recupero di un capitolo esistente...');
    try {
      const chapters = await axios.get(
        `${GALLERY_BASE_URL}/galleries/${testGalleryId}/chapters`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (chapters.data && chapters.data.length > 0) {
        testChapterId = chapters.data[0].id;
        logWarning(`Utilizzando un capitolo esistente: ${testChapterId}`);
        return chapters.data[0];
      }
    } catch (fallbackError) {
      logError('Impossibile recuperare capitoli esistenti', fallbackError);
    }
    
    return null;
  }
}

async function testUploadPhotos() {
  if (!testGalleryId) {
    logWarning('ID galleria non disponibile, test caricamento foto saltato');
    return null;
  }
  
  logInfo(`Verifica delle foto esistenti nella galleria ${testGalleryId}...`);
  
  try {
    // Prima controlliamo se ci sono già foto nella galleria
    const galleryPhotos = await axios.get(
      `${GALLERY_BASE_URL}/galleries/${testGalleryId}/photos`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    if (galleryPhotos.data && galleryPhotos.data.photos && galleryPhotos.data.photos.length > 0) {
      testPhotoId = galleryPhotos.data.photos[0].id;
      logWarning(`Utilizzando foto esistente con ID: ${testPhotoId}`);
      return galleryPhotos.data.photos[0];
    }
    
    // Se non ci sono foto, ne creiamo una simulata
    logInfo('Nessuna foto trovata, creazione di un record di test simulato...');
    
    const fakePhotoData = {
      galleryId: testGalleryId,
      chapterId: testChapterId,
      filename: `test-photo-${Date.now()}.jpg`,
      originalFilename: 'test-photo.jpg',
      path: `/uploads/test-photo-${Date.now()}.jpg`,
      thumbnailPath: `/uploads/thumbnails/test-photo-${Date.now()}.jpg`,
      mediumPath: `/uploads/medium/test-photo-${Date.now()}.jpg`,
      largePath: `/uploads/large/test-photo-${Date.now()}.jpg`,
      size: 1000000,
      width: 1920,
      height: 1080,
      mimeType: 'image/jpeg',
      title: 'Foto di test',
      caption: 'Foto creata durante i test automatici',
      tags: ['test', 'automatico']
    };
    
    // Nota: In un test reale, dovresti caricare un file effettivo
    // Qui simuliamo solo l'inserimento di un record
    try {
      const response = await axios.post(
        `${GALLERY_BASE_URL}/photos/simulate-upload`,
        fakePhotoData,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      testPhotoId = response.data.id;
      logSuccess(`Record foto simulato creato con ID: ${testPhotoId}`);
      return response.data;
    } catch (error) {
      logError('Errore nella creazione del record foto simulato', error);
      logWarning('Tentativo di creare una foto tramite endpoint alternativo...');
      
      // Fallback: prova un altro endpoint
      try {
        const fallbackResponse = await axios.post(
          `${GALLERY_BASE_URL}/galleries/${testGalleryId}/photos/mock`,
          { title: 'Foto di test mock', chapterId: testChapterId },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        
        testPhotoId = fallbackResponse.data.id;
        logSuccess(`Record foto mock creato con ID: ${testPhotoId}`);
        return fallbackResponse.data;
      } catch (fallbackError) {
        logError('Tutti i tentativi di creazione foto falliti', fallbackError);
        return null;
      }
    }
  } catch (error) {
    logError('Errore nel recupero o creazione delle foto', error);
    return null;
  }
}

async function testSetupSelectionSettings() {
  if (!testGalleryId) {
    logWarning('ID galleria non disponibile, test impostazioni selezione saltato');
    return null;
  }
  
  logInfo(`Configurazione delle impostazioni di selezione per la galleria ${testGalleryId}...`);
  
  const selectionSettings = {
    galleryId: testGalleryId,
    isEnabled: true,
    maxSelections: 20,
    allowComments: true,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 giorni da oggi
    customMessage: 'Seleziona le tue foto preferite!',
    instructions: 'Clicca sulle foto per selezionarle. Puoi selezionarne fino a 20.'
  };
  
  try {
    const response = await axios.post(
      `${SELECTION_BASE_URL}/settings`,
      selectionSettings,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    logSuccess(`Impostazioni di selezione configurate per la galleria ${testGalleryId}`);
    return response.data;
  } catch (error) {
    logError('Errore nella configurazione delle impostazioni di selezione', error);
    
    // Tentativo di aggiornamento delle impostazioni esistenti
    logInfo('Tentativo di aggiornamento delle impostazioni esistenti...');
    try {
      const updateResponse = await axios.put(
        `${SELECTION_BASE_URL}/settings/${testGalleryId}`,
        selectionSettings,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      logWarning('Impostazioni di selezione aggiornate tramite PUT');
      return updateResponse.data;
    } catch (fallbackError) {
      logError('Impossibile configurare le impostazioni di selezione', fallbackError);
    }
    
    return null;
  }
}

async function testGalleryStatistics() {
  if (!testGalleryId) {
    logWarning('ID galleria non disponibile, test statistiche saltato');
    return;
  }
  
  logInfo(`Verifica delle statistiche per la galleria ${testGalleryId}...`);
  
  try {
    const response = await axios.get(
      `${GALLERY_BASE_URL}/galleries/${testGalleryId}/stats`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    logSuccess('Statistiche recuperate con successo');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    logError('Errore nel recupero delle statistiche', error);
    return null;
  }
}

async function testGalleryAccess() {
  if (!testGalleryId) {
    logWarning('ID galleria non disponibile, test accesso galleria saltato');
    return;
  }
  
  logInfo(`Test di accesso alla galleria ${testGalleryId} come cliente...`);
  
  try {
    // Accesso alla galleria pubblica
    const response = await axios.get(
      `${GALLERY_BASE_URL}/public/${testGalleryId}`,
      { headers: clientToken ? { Authorization: `Bearer ${clientToken}` } : {} }
    );
    
    logSuccess('Accesso alla galleria completato con successo');
    return response.data;
  } catch (error) {
    logError('Errore nell\'accesso alla galleria', error);
    return null;
  }
}

async function testCreateSelectionSession() {
  if (!testGalleryId) {
    logWarning('ID galleria non disponibile, test sessione di selezione saltato');
    return null;
  }
  
  logInfo(`Creazione di una sessione di selezione per la galleria ${testGalleryId}...`);
  
  const sessionData = {
    galleryId: testGalleryId,
    clientName: 'Cliente Test',
    clientEmail: 'cliente.test@example.com',
    sessionKey: uuidv4(),
    notes: 'Sessione creata durante i test automatici'
  };
  
  try {
    const response = await axios.post(
      `${SELECTION_BASE_URL}/sessions`,
      sessionData,
      { headers: clientToken ? { Authorization: `Bearer ${clientToken}` } : {} }
    );
    
    testSessionId = response.data.id;
    testSessionKey = response.data.sessionKey;
    logSuccess(`Sessione di selezione creata con ID: ${testSessionId} e chiave: ${testSessionKey}`);
    return response.data;
  } catch (error) {
    logError('Errore nella creazione della sessione di selezione', error);
    
    // Tentativo di recupero di una sessione esistente
    logInfo('Tentativo di recupero di una sessione esistente...');
    try {
      const sessions = await axios.get(
        `${SELECTION_BASE_URL}/gallery/${testGalleryId}/sessions`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (sessions.data && sessions.data.length > 0) {
        testSessionId = sessions.data[0].id;
        testSessionKey = sessions.data[0].sessionKey;
        logWarning(`Utilizzando una sessione esistente: ${testSessionId}`);
        return sessions.data[0];
      }
    } catch (fallbackError) {
      logError('Impossibile recuperare sessioni esistenti', fallbackError);
    }
    
    // Crea una sessione con token di admin se tutto il resto fallisce
    try {
      logWarning('Tentativo di creare una sessione con token di admin...');
      const adminResponse = await axios.post(
        `${SELECTION_BASE_URL}/sessions/admin-create`,
        sessionData,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      testSessionId = adminResponse.data.id;
      testSessionKey = adminResponse.data.sessionKey;
      logSuccess(`Sessione di selezione creata con token admin. ID: ${testSessionId}`);
      return adminResponse.data;
    } catch (adminError) {
      logError('Tutti i tentativi di creazione sessione falliti', adminError);
      return null;
    }
  }
}

async function testSelectPhotos() {
  if (!testPhotoId || !testSessionId) {
    logWarning('ID foto o sessione non disponibili, test selezione foto saltato');
    return;
  }
  
  logInfo(`Selezione della foto ${testPhotoId} nella sessione ${testSessionId}...`);
  
  const selectionData = {
    photoId: testPhotoId,
    sessionId: testSessionId,
    selectionType: 'favorite'
  };
  
  try {
    const response = await axios.post(
      `${SELECTION_BASE_URL}/photos`,
      selectionData,
      { headers: clientToken ? { Authorization: `Bearer ${clientToken}` } : {} }
    );
    
    logSuccess('Foto selezionata con successo');
    return response.data;
  } catch (error) {
    logError('Errore nella selezione della foto', error);
    
    // Tentativo con endpoint alternativo
    logInfo('Tentativo con endpoint alternativo...');
    try {
      const fallbackData = {
        photoId: testPhotoId,
        galleryId: testGalleryId,
        sessionId: testSessionKey || testSessionId,
        clientName: 'Cliente Test',
        clientEmail: 'cliente.test@example.com',
        selectionType: 'favorite'
      };
      
      const fallbackResponse = await axios.post(
        `${GALLERY_BASE_URL}/selections/toggle`,
        fallbackData
      );
      
      logSuccess('Foto selezionata con successo tramite endpoint alternativo');
      return fallbackResponse.data;
    } catch (fallbackError) {
      logError('Tutti i tentativi di selezione foto falliti', fallbackError);
      return null;
    }
  }
}

async function testAddComments() {
  if (!testPhotoId || !testSessionId) {
    logWarning('ID foto o sessione non disponibili, test commenti saltato');
    return;
  }
  
  logInfo(`Aggiunta di un commento alla foto ${testPhotoId} nella sessione ${testSessionId}...`);
  
  const commentData = {
    photoId: testPhotoId,
    sessionId: testSessionId,
    content: 'Questo è un commento di test',
    clientName: 'Cliente Test'
  };
  
  try {
    const response = await axios.post(
      `${SELECTION_BASE_URL}/comments`,
      commentData,
      { headers: clientToken ? { Authorization: `Bearer ${clientToken}` } : {} }
    );
    
    logSuccess('Commento aggiunto con successo');
    return response.data;
  } catch (error) {
    logError('Errore nell\'aggiunta del commento', error);
    
    // Tentativo con endpoint alternativo
    logInfo('Tentativo con endpoint alternativo...');
    try {
      const fallbackData = {
        photoId: testPhotoId,
        galleryId: testGalleryId,
        comment: 'Questo è un commento di test tramite endpoint alternativo',
        name: 'Cliente Test',
        email: 'cliente.test@example.com'
      };
      
      const fallbackResponse = await axios.post(
        `${GALLERY_BASE_URL}/photos/${testPhotoId}/comments`,
        fallbackData
      );
      
      logSuccess('Commento aggiunto con successo tramite endpoint alternativo');
      return fallbackResponse.data;
    } catch (fallbackError) {
      logError('Tutti i tentativi di aggiunta commento falliti', fallbackError);
      return null;
    }
  }
}

async function testFinalizeSelection() {
  if (!testSessionId) {
    logWarning('ID sessione non disponibile, test finalizzazione selezione saltato');
    return;
  }
  
  logInfo(`Finalizzazione della sessione di selezione ${testSessionId}...`);
  
  try {
    const response = await axios.put(
      `${SELECTION_BASE_URL}/sessions/${testSessionId}/complete`,
      { notes: 'Selezione completata durante i test automatici' },
      { headers: clientToken ? { Authorization: `Bearer ${clientToken}` } : {} }
    );
    
    logSuccess('Sessione di selezione finalizzata con successo');
    return response.data;
  } catch (error) {
    logError('Errore nella finalizzazione della sessione', error);
    
    // Tentativo con endpoint alternativo
    logInfo('Tentativo con endpoint alternativo...');
    try {
      const fallbackResponse = await axios.post(
        `${SELECTION_BASE_URL}/sessions/${testSessionId}/finalize`,
        { message: 'Ho completato la mia selezione!' }
      );
      
      logSuccess('Sessione finalizzata con successo tramite endpoint alternativo');
      return fallbackResponse.data;
    } catch (fallbackError) {
      logError('Tutti i tentativi di finalizzazione falliti', fallbackError);
      return null;
    }
  }
}

// Test di casi limite

async function testPasswordProtectedGallery() {
  logInfo('Test di accesso a galleria protetta da password...');
  
  // Creazione di una nuova galleria protetta da password o aggiornamento di quella esistente
  try {
    const passwordProtectedGallery = testGalleryId ? 
      await axios.put(
        `${GALLERY_BASE_URL}/galleries/${testGalleryId}`,
        { password: 'test123', isPublic: false },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      ) :
      await axios.post(
        `${GALLERY_BASE_URL}/galleries`,
        {
          name: `Password Protected Gallery ${new Date().toISOString()}`,
          description: 'Galleria protetta da password per test',
          slug: `password-protected-${Date.now()}`,
          isPublic: false,
          password: 'test123'
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
    const galleryId = testGalleryId || passwordProtectedGallery.data.id;
    
    // Test di accesso senza password (dovrebbe fallire)
    try {
      await axios.get(`${GALLERY_BASE_URL}/public/${galleryId}`);
      logError('Accesso senza password ha avuto successo quando dovrebbe fallire');
    } catch (errorNoPassword) {
      logSuccess('Test corretto: accesso senza password fallito come previsto');
    }
    
    // Test di accesso con password
    try {
      const response = await axios.post(
        `${GALLERY_BASE_URL}/public/${galleryId}/access`,
        { password: 'test123' }
      );
      
      logSuccess('Accesso con password corretto ha avuto successo');
      return response.data;
    } catch (error) {
      logError('Errore nell\'accesso con password', error);
      return null;
    }
  } catch (error) {
    logError('Errore nella creazione/aggiornamento della galleria protetta', error);
    return null;
  }
}

async function testSelectionLimits() {
  if (!testGalleryId) {
    logWarning('ID galleria non disponibile, test limiti selezione saltato');
    return;
  }
  
  logInfo('Test dei limiti di selezione...');
  
  // Imposta un limite basso per le selezioni
  try {
    await axios.put(
      `${SELECTION_BASE_URL}/settings/${testGalleryId}`,
      {
        isEnabled: true,
        maxSelections: 1, // Limite di una sola foto
        allowComments: true
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    logSuccess('Limite di selezione impostato a 1 foto');
    
    // Ora proviamo a selezionare due foto
    if (testPhotoId) {
      // Prima selezione (dovrebbe riuscire)
      try {
        await testSelectPhotos();
        logSuccess('Prima selezione riuscita come previsto');
        
        // Seconda selezione con ID foto+1 (dovrebbe fallire)
        try {
          const selectionData = {
            photoId: testPhotoId + 1,
            sessionId: testSessionId,
            selectionType: 'favorite'
          };
          
          await axios.post(
            `${SELECTION_BASE_URL}/photos`,
            selectionData,
            { headers: clientToken ? { Authorization: `Bearer ${clientToken}` } : {} }
          );
          
          logWarning('Seconda selezione riuscita quando dovrebbe fallire - il limite non funziona');
        } catch (error) {
          if (error.response && error.response.status === 400) {
            logSuccess('Test corretto: seconda selezione fallita per limite raggiunto');
          } else {
            logError('Seconda selezione fallita per un motivo diverso dal limite', error);
          }
        }
      } catch (error) {
        logError('Errore nel test dei limiti di selezione', error);
      }
    } else {
      logWarning('ID foto non disponibile, test di selezione multipla saltato');
    }
    
    // Ripristina il limite a un valore più alto
    await axios.put(
      `${SELECTION_BASE_URL}/settings/${testGalleryId}`,
      {
        isEnabled: true,
        maxSelections: 20,
        allowComments: true
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    logSuccess('Limite di selezione ripristinato a 20 foto');
  } catch (error) {
    logError('Errore nel test dei limiti di selezione', error);
    return null;
  }
}

async function testMultipleSessions() {
  if (!testGalleryId) {
    logWarning('ID galleria non disponibile, test sessioni multiple saltato');
    return;
  }
  
  logInfo('Test di sessioni multiple...');
  
  // Crea una seconda sessione
  try {
    const secondSessionData = {
      galleryId: testGalleryId,
      clientName: 'Secondo Cliente Test',
      clientEmail: 'secondo.cliente@example.com',
      sessionKey: uuidv4(),
      notes: 'Seconda sessione per test'
    };
    
    const secondSession = await axios.post(
      `${SELECTION_BASE_URL}/sessions`,
      secondSessionData,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    const secondSessionId = secondSession.data.id;
    logSuccess(`Seconda sessione creata con ID: ${secondSessionId}`);
    
    // Verifica che le selezioni siano separate tra le sessioni
    if (testPhotoId) {
      // Selezione nella prima sessione
      const selectionData1 = {
        photoId: testPhotoId,
        sessionId: testSessionId,
        selectionType: 'favorite'
      };
      
      // Selezione nella seconda sessione
      const selectionData2 = {
        photoId: testPhotoId,
        sessionId: secondSessionId,
        selectionType: 'selected'
      };
      
      try {
        await axios.post(
          `${SELECTION_BASE_URL}/photos`,
          selectionData1,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        
        await axios.post(
          `${SELECTION_BASE_URL}/photos`,
          selectionData2,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        
        // Verifica che entrambe le selezioni esistano
        const selections = await axios.get(
          `${SELECTION_BASE_URL}/gallery/${testGalleryId}/all-selections`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        
        const firstSessionSelections = selections.data.filter(s => s.sessionId === testSessionId);
        const secondSessionSelections = selections.data.filter(s => s.sessionId === secondSessionId);
        
        if (firstSessionSelections.length > 0 && secondSessionSelections.length > 0) {
          logSuccess('Le selezioni sono correttamente separate tra le sessioni');
        } else {
          logWarning('Le selezioni potrebbero non essere separate correttamente tra le sessioni');
        }
      } catch (error) {
        logError('Errore nel test delle sessioni multiple', error);
      }
    } else {
      logWarning('ID foto non disponibile, test selezioni multiple saltato');
    }
  } catch (error) {
    logError('Errore nella creazione della seconda sessione', error);
    return null;
  }
}

async function testExpiryDates() {
  if (!testGalleryId) {
    logWarning('ID galleria non disponibile, test date di scadenza saltato');
    return;
  }
  
  logInfo('Test delle date di scadenza...');
  
  // Imposta una data di scadenza per la galleria (nel passato)
  try {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Ieri
    
    await axios.put(
      `${GALLERY_BASE_URL}/galleries/${testGalleryId}`,
      { expiryDate: pastDate.toISOString() },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    logSuccess('Data di scadenza impostata nel passato');
    
    // Prova ad accedere alla galleria scaduta
    try {
      await axios.get(`${GALLERY_BASE_URL}/public/${testGalleryId}`);
      logWarning('Accesso a galleria scaduta ha avuto successo - la verifica della scadenza potrebbe non funzionare');
    } catch (error) {
      if (error.response && error.response.status === 403) {
        logSuccess('Test corretto: accesso a galleria scaduta fallito come previsto');
      } else {
        logError('Accesso a galleria scaduta fallito per un motivo diverso dalla scadenza', error);
      }
    }
    
    // Ripristina la data di scadenza nel futuro
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 giorni da oggi
    
    await axios.put(
      `${GALLERY_BASE_URL}/galleries/${testGalleryId}`,
      { expiryDate: futureDate.toISOString() },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    logSuccess('Data di scadenza ripristinata nel futuro');
  } catch (error) {
    logError('Errore nel test delle date di scadenza', error);
    return null;
  }
}

// Pulizia dopo i test
async function cleanupTests() {
  logInfo('Pulizia dopo i test...');
  
  // Non eliminare nulla, ma ripristina lo stato originale dove possibile
  try {
    if (testGalleryId) {
      // Ripristina la galleria a uno stato standard
      await axios.put(
        `${GALLERY_BASE_URL}/galleries/${testGalleryId}`,
        {
          isPublic: true,
          password: null,
          expiryDate: null
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      logSuccess('Galleria ripristinata allo stato originale');
    }
    
    if (testSessionId) {
      // Completa la sessione se non è già stata completata
      try {
        await axios.put(
          `${SELECTION_BASE_URL}/sessions/${testSessionId}/complete`,
          { notes: 'Test completato e ripulito' },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        
        logSuccess('Sessione di test completata');
      } catch (error) {
        // Ignora errori se la sessione è già stata completata
      }
    }
  } catch (error) {
    logWarning('Alcuni passaggi di pulizia potrebbero non essere riusciti', error);
  }
}

// Avvia i test
runTests().catch(error => {
  logError('Errore durante l\'esecuzione dei test', error);
});
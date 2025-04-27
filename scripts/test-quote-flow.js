/**
 * Script di diagnosi completa del flusso preventivo-contratto-evento
 * 
 * Questo script analizza l'intero processo dalla creazione di un preventivo
 * fino alla firma del contratto e trasformazione in evento, verificando:
 * 
 * 1. Creazione del preventivo con moduli fissi e variabili
 * 2. Manipolazione dei campi e salvataggio
 * 3. Invio al cliente
 * 4. Visualizzazione e interazione del cliente
 * 5. Firma e accettazione
 * 6. Conversione in contratto ed evento
 * 7. Gestione finanziaria (acconti, pagamenti, scadenze)
 * 8. Assegnazione collaboratori
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Configurazione
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5000',
  adminUser: {
    username: 'ImageStudio',
    password: 'password'
  },
  testClient: {
    firstName: 'Test',
    lastName: 'Cliente' + Date.now(),
    email: `test.cliente${Date.now()}@example.com`,
    phone: '3334445556'
  },
  screenshotsDir: path.join(__dirname, '../test-results/quote-flow'),
  reportFile: path.join(__dirname, '../test-results/quote-flow-report.json')
};

// Assicurati che le directory esistano
if (!fs.existsSync(config.screenshotsDir)) {
  fs.mkdirSync(config.screenshotsDir, { recursive: true });
}

// Inizializza il report
const report = {
  testName: 'Quote Flow Diagnostic',
  startTime: new Date().toISOString(),
  endTime: null,
  steps: [],
  errors: [],
  warnings: [],
  successRate: 0,
  financialConsistency: null
};

// Funzione di utility per aggiungere uno step al report
function addStep(name, status, details = {}) {
  const step = {
    name,
    status, // 'success', 'warning', 'error'
    time: new Date().toISOString(),
    details
  };
  report.steps.push(step);
  
  if (status === 'error') {
    report.errors.push({ step: name, ...details });
  } else if (status === 'warning') {
    report.warnings.push({ step: name, ...details });
  }
  
  console.log(`[${status.toUpperCase()}] ${name}`);
  if (details.message) {
    console.log(`  → ${details.message}`);
  }
}

// Funzione di utility per cattturare screenshot
async function takeScreenshot(page, name) {
  const filename = `${Date.now()}-${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
  const filepath = path.join(config.screenshotsDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

// Stampa il report in JSON
function saveReport() {
  report.endTime = new Date().toISOString();
  report.successRate = (report.steps.filter(s => s.status === 'success').length / report.steps.length) * 100;
  fs.writeFileSync(config.reportFile, JSON.stringify(report, null, 2));
  console.log(`\nReport salvato in: ${config.reportFile}`);
  console.log(`Success rate: ${report.successRate.toFixed(2)}%`);
  console.log(`Errori: ${report.errors.length}`);
  console.log(`Warning: ${report.warnings.length}`);
}

// Funzione principale per eseguire i test
async function runTests() {
  const browser = await chromium.launch({ 
    headless: process.env.HEADLESS !== 'false',
    slowMo: 300 // Rallenta le operazioni per migliorare la stabilità
  });
  
  // Contesto di navigazione con viewport ottimizzato
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: config.screenshotsDir }
  });
  
  // Crea una pagina
  const page = await context.newPage();
  
  try {
    await testAdminFlow(page);
    await testClientFlow(page);
    await testFinancialIntegration(page);
  } catch (error) {
    addStep('Runtime Error', 'error', { 
      message: error.message,
      stack: error.stack
    });
    
    // Cattura screenshot finale in caso di errore
    await takeScreenshot(page, 'fatal_error');
  } finally {
    saveReport();
    await context.close();
    await browser.close();
  }
}

/**
 * TEST 1: Flusso Amministratore - Creazione e gestione preventivo
 */
async function testAdminFlow(page) {
  try {
    // Passo 1: Login come amministratore
    await page.goto(`${config.baseUrl}/auth`);
    
    try {
      await page.fill('input[name="username"]', config.adminUser.username);
      await page.fill('input[name="password"]', config.adminUser.password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      
      // Verifica che siamo nella dashboard
      const dashboardTitle = await page.textContent('h1');
      if (dashboardTitle && dashboardTitle.includes('Dashboard')) {
        addStep('Login Amministratore', 'success');
        await takeScreenshot(page, 'admin_login_success');
      } else {
        addStep('Login Amministratore', 'error', { 
          message: 'Login fallito o reindirizzamento non corretto' 
        });
        await takeScreenshot(page, 'admin_login_failure');
        throw new Error('Login fallito');
      }
    } catch (error) {
      addStep('Login Amministratore', 'error', { 
        message: `Errore durante il login: ${error.message}` 
      });
      throw error;
    }
    
    // Passo 2: Navigazione alla pagina di creazione preventivo
    try {
      await page.click('a[href="/quotes"]');
      await page.waitForSelector('a[href="/quotes/new"]');
      await page.click('a[href="/quotes/new"]');
      
      // Verifica che siamo nella pagina di creazione preventivo
      const pageTitle = await page.textContent('h1');
      if (pageTitle && pageTitle.includes('Nuovo Preventivo')) {
        addStep('Accesso Pagina Creazione Preventivo', 'success');
        await takeScreenshot(page, 'new_quote_page');
      } else {
        addStep('Accesso Pagina Creazione Preventivo', 'error', { 
          message: 'Navigazione alla pagina di creazione preventivo fallita' 
        });
        await takeScreenshot(page, 'new_quote_page_error');
        throw new Error('Navigazione fallita');
      }
    } catch (error) {
      addStep('Accesso Pagina Creazione Preventivo', 'error', { 
        message: `Errore durante la navigazione: ${error.message}` 
      });
      throw error;
    }
    
    // Passo 3: Creazione del preventivo - Informazioni di base
    let quoteId;
    
    try {
      // 3.1 Inserimento titolo e dettagli del preventivo
      await page.fill('input[name="title"]', `Test Preventivo Matrimonio ${Date.now()}`);
      await page.fill('textarea[name="description"]', 'Descrizione del preventivo di test per matrimonio');
      
      // 3.2 Selezione del tipo di evento (matrimonio)
      await page.click('select[name="eventType"]');
      await page.selectOption('select[name="eventType"]', 'wedding');
      
      // 3.3 Selezione data evento
      await page.fill('input[name="eventDate"]', '2025-06-15');
      
      // 3.4 Inserimento luogo
      await page.fill('input[name="location"]', 'Villa Belvedere, Roma');
      
      addStep('Compilazione Informazioni Base Preventivo', 'success');
      await takeScreenshot(page, 'quote_basic_info');
      
      // 3.5 Inserimento dati del cliente
      await page.click('button:has-text("Aggiungi Nuovo Cliente")');
      await page.waitForSelector('input[name="firstName"]');
      
      await page.fill('input[name="firstName"]', config.testClient.firstName);
      await page.fill('input[name="lastName"]', config.testClient.lastName);
      await page.fill('input[name="email"]', config.testClient.email);
      await page.fill('input[name="phone"]', config.testClient.phone);
      await page.fill('input[name="address"]', 'Via Test, 123');
      await page.fill('input[name="city"]', 'Roma');
      await page.fill('input[name="postalCode"]', '00100');
      
      // Salva il cliente
      await page.click('button:has-text("Salva Cliente")');
      await page.waitForSelector('div:has-text("Cliente aggiunto con successo")');
      
      addStep('Aggiunta Cliente', 'success');
      await takeScreenshot(page, 'client_added');
      
    } catch (error) {
      addStep('Compilazione Dati Base Preventivo', 'error', { 
        message: `Errore durante la compilazione: ${error.message}` 
      });
      await takeScreenshot(page, 'quote_basic_info_error');
      throw error;
    }
    
    // Passo 4: Aggiunta di moduli al preventivo
    try {
      // 4.1 Aggiungi un modulo fisso
      await page.click('button:has-text("Aggiungi Modulo Fisso")');
      await page.fill('input[name="moduleName"]', 'Pacchetto Matrimonio Base');
      await page.fill('input[name="modulePrice"]', '1500');
      
      // Aggiungi elementi al modulo fisso
      await page.click('button:has-text("Aggiungi Elemento")');
      await page.fill('input[name="items.0.name"]', 'Servizio fotografico cerimonia');
      await page.fill('input[name="items.0.description"]', 'Copertura completa della cerimonia');
      await page.fill('input[name="items.0.quantity"]', '1');
      await page.fill('input[name="items.0.price"]', '800');
      
      await page.click('button:has-text("Aggiungi Elemento")');
      await page.fill('input[name="items.1.name"]', 'Album fotografico standard');
      await page.fill('input[name="items.1.description"]', '30 pagine, copertina rigida');
      await page.fill('input[name="items.1.quantity"]', '1');
      await page.fill('input[name="items.1.price"]', '700');
      
      // Salva il modulo fisso
      await page.click('button[type="submit"]:has-text("Salva Modulo")');
      await page.waitForSelector('div:has-text("Modulo aggiunto con successo")');
      
      addStep('Aggiunta Modulo Fisso', 'success');
      await takeScreenshot(page, 'fixed_module_added');
      
      // 4.2 Aggiungi un modulo variabile
      await page.click('button:has-text("Aggiungi Modulo Variabile")');
      await page.fill('input[name="moduleName"]', 'Servizi Extra');
      
      // Aggiungi elementi al modulo variabile
      await page.click('button:has-text("Aggiungi Prodotto/Servizio")');
      await page.waitForSelector('select[name="serviceId"]');
      
      // Seleziona il primo servizio disponibile dal menu a tendina
      const serviceOptions = await page.$$eval('select[name="serviceId"] option', options => 
        options.filter(opt => opt.value !== '').map(opt => ({ value: opt.value, text: opt.text }))
      );
      
      if (serviceOptions.length > 0) {
        await page.selectOption('select[name="serviceId"]', serviceOptions[0].value);
        await page.fill('input[name="quantity"]', '2');
        await page.click('button:has-text("Aggiungi")');
        
        // Aggiungi un secondo servizio se disponibile
        if (serviceOptions.length > 1) {
          await page.click('button:has-text("Aggiungi Prodotto/Servizio")');
          await page.waitForSelector('select[name="serviceId"]');
          await page.selectOption('select[name="serviceId"]', serviceOptions[1].value);
          await page.fill('input[name="quantity"]', '1');
          await page.click('button:has-text("Aggiungi")');
        }
        
        // Salva il modulo variabile
        await page.click('button:has-text("Salva Modulo")');
        await page.waitForSelector('div:has-text("Modulo aggiunto con successo")');
        
        addStep('Aggiunta Modulo Variabile', 'success');
        await takeScreenshot(page, 'variable_module_added');
      } else {
        addStep('Aggiunta Modulo Variabile', 'warning', { 
          message: 'Nessun servizio disponibile nel database per il test' 
        });
        // Chiudi il modale
        await page.click('button:has-text("Annulla")');
      }
      
    } catch (error) {
      addStep('Aggiunta Moduli', 'error', { 
        message: `Errore durante l'aggiunta dei moduli: ${error.message}` 
      });
      await takeScreenshot(page, 'modules_error');
      throw error;
    }
    
    // Passo 5: Impostazioni finanziarie
    try {
      // 5.1 Imposta sconti
      await page.click('button:has-text("Impostazioni Avanzate")');
      await page.waitForSelector('input[name="discount"]');
      
      // Applica uno sconto del 10%
      await page.fill('input[name="discount"]', '10');
      await page.click('button:has-text("Applica Sconto")');
      
      addStep('Applicazione Sconto', 'success');
      
      // 5.2 Verifica totali
      const subtotalText = await page.textContent('div:has-text("Subtotale:") + div');
      const discountText = await page.textContent('div:has-text("Sconto:") + div');
      const totalText = await page.textContent('div:has-text("Totale:") + div');
      
      // Estrai i valori numerici
      const subtotal = parseFloat(subtotalText.replace(/[^0-9,.]/g, '').replace(',', '.'));
      const discount = parseFloat(discountText.replace(/[^0-9,.]/g, '').replace(',', '.'));
      const total = parseFloat(totalText.replace(/[^0-9,.]/g, '').replace(',', '.'));
      
      // Verifica la correttezza dei calcoli
      const calculatedTotal = subtotal - discount;
      const totalIsCorrect = Math.abs(calculatedTotal - total) < 0.01; // Tolleranza per arrotondamenti
      
      if (totalIsCorrect) {
        addStep('Verifica Calcoli Finanziari', 'success', {
          message: `Subtotale: ${subtotal}€, Sconto: ${discount}€, Totale: ${total}€`
        });
      } else {
        addStep('Verifica Calcoli Finanziari', 'error', {
          message: `Discrepanza nei calcoli. Subtotale: ${subtotal}€, Sconto: ${discount}€, Totale atteso: ${calculatedTotal}€, Totale visualizzato: ${total}€`
        });
      }
      
      await takeScreenshot(page, 'financial_settings');
      
      // 5.3 Imposta rate di pagamento
      await page.click('button:has-text("Imposta Rate")');
      await page.waitForSelector('input[name="installments.0.amount"]');
      
      // Imposta due rate
      await page.fill('input[name="installments.0.amount"]', (total * 0.3).toFixed(2)); // 30% come acconto
      await page.fill('input[name="installments.0.dueDate"]', '2023-12-31');
      await page.fill('input[name="installments.0.description"]', 'Acconto alla firma');
      
      await page.click('button:has-text("Aggiungi Rata")');
      await page.fill('input[name="installments.1.amount"]', (total * 0.7).toFixed(2)); // 70% come saldo
      await page.fill('input[name="installments.1.dueDate"]', '2025-06-01');
      await page.fill('input[name="installments.1.description"]', 'Saldo prima dell\'evento');
      
      await page.click('button:has-text("Salva Rate")');
      await page.waitForSelector('div:has-text("Rate salvate con successo")');
      
      addStep('Impostazione Rate di Pagamento', 'success');
      await takeScreenshot(page, 'payment_installments');
      
    } catch (error) {
      addStep('Impostazioni Finanziarie', 'error', { 
        message: `Errore durante le impostazioni finanziarie: ${error.message}` 
      });
      await takeScreenshot(page, 'financial_settings_error');
      throw error;
    }
    
    // Passo 6: Assegnazione collaboratori
    try {
      await page.click('button:has-text("Assegna Collaboratori")');
      await page.waitForSelector('select[name="collaboratorId"]');
      
      // Seleziona il primo collaboratore disponibile
      const collaboratorOptions = await page.$$eval('select[name="collaboratorId"] option', options => 
        options.filter(opt => opt.value !== '').map(opt => ({ value: opt.value, text: opt.text }))
      );
      
      if (collaboratorOptions.length > 0) {
        await page.selectOption('select[name="collaboratorId"]', collaboratorOptions[0].value);
        await page.selectOption('select[name="role"]', 'fotografo');
        await page.click('button:has-text("Aggiungi Collaboratore")');
        
        // Verifica che il collaboratore sia stato aggiunto
        await page.waitForSelector('div:has-text("Collaboratore assegnato con successo")');
        
        // Se disponibile, aggiungi un secondo collaboratore con ruolo diverso
        if (collaboratorOptions.length > 1) {
          await page.selectOption('select[name="collaboratorId"]', collaboratorOptions[1].value);
          await page.selectOption('select[name="role"]', 'videomaker');
          await page.click('button:has-text("Aggiungi Collaboratore")');
          await page.waitForSelector('div:has-text("Collaboratore assegnato con successo")');
        }
        
        addStep('Assegnazione Collaboratori', 'success', {
          message: `Assegnati ${collaboratorOptions.length > 1 ? '2' : '1'} collaboratori`
        });
      } else {
        addStep('Assegnazione Collaboratori', 'warning', {
          message: 'Nessun collaboratore disponibile nel database'
        });
      }
      
      await takeScreenshot(page, 'collaborators_assigned');
      
    } catch (error) {
      addStep('Assegnazione Collaboratori', 'error', { 
        message: `Errore durante l'assegnazione dei collaboratori: ${error.message}` 
      });
      await takeScreenshot(page, 'collaborators_error');
      throw error;
    }
    
    // Passo 7: Salvataggio del preventivo
    try {
      // Salva il preventivo
      await page.click('button:has-text("Salva Preventivo")');
      
      // Attendi il completamento del salvataggio e il reindirizzamento
      await page.waitForNavigation();
      
      // Verifica di essere nella pagina dei dettagli del preventivo
      const isDetailPage = await page.isVisible('h1:has-text("Dettaglio Preventivo")');
      
      if (isDetailPage) {
        // Estrai l'ID del preventivo dall'URL
        const url = page.url();
        quoteId = url.split('/').pop();
        
        addStep('Salvataggio Preventivo', 'success', {
          message: `Preventivo salvato con ID: ${quoteId}`
        });
        await takeScreenshot(page, 'quote_saved');
      } else {
        addStep('Salvataggio Preventivo', 'error', {
          message: 'Preventivo non salvato correttamente o errore di reindirizzamento'
        });
        await takeScreenshot(page, 'quote_save_error');
        throw new Error('Salvataggio preventivo fallito');
      }
      
    } catch (error) {
      addStep('Salvataggio Preventivo', 'error', { 
        message: `Errore durante il salvataggio del preventivo: ${error.message}` 
      });
      await takeScreenshot(page, 'save_quote_error');
      throw error;
    }
    
    // Passo 8: Condivisione del preventivo con il cliente
    try {
      // Click sul pulsante di condivisione
      await page.click('button:has-text("Condividi")');
      await page.waitForSelector('input[type="email"]');
      
      // Inserisci l'email del cliente
      await page.fill('input[type="email"]', config.testClient.email);
      
      // Imposta una scadenza per l'offerta
      await page.fill('input[type="date"]', '2023-12-31');
      
      // Invia il preventivo
      await page.click('button:has-text("Invia")');
      await page.waitForSelector('div:has-text("Preventivo condiviso con successo")');
      
      // Recupera il link pubblico
      const shareUrl = await page.$eval('input[readonly]', input => input.value);
      
      addStep('Condivisione Preventivo', 'success', {
        message: `Preventivo condiviso con ${config.testClient.email}`,
        shareUrl
      });
      
      // Salva l'URL per i test lato cliente
      report.clientShareUrl = shareUrl;
      
      await takeScreenshot(page, 'quote_shared');
      
    } catch (error) {
      addStep('Condivisione Preventivo', 'error', { 
        message: `Errore durante la condivisione: ${error.message}` 
      });
      await takeScreenshot(page, 'share_error');
      throw error;
    }
    
    // Passo 9: Verifica dati preventivo in database
    try {
      // Accedi alla pagina di debug DB se disponibile in ambiente di sviluppo
      await page.goto(`${config.baseUrl}/api/debug/quotes/${quoteId}`);
      
      // Verifica se la pagina è caricata correttamente
      const isJsonResponse = await page.evaluate(() => {
        try {
          const text = document.body.innerText;
          JSON.parse(text);
          return true;
        } catch (e) {
          return false;
        }
      });
      
      if (isJsonResponse) {
        const quoteData = await page.evaluate(() => JSON.parse(document.body.innerText));
        
        // Verifica campi critici
        const checks = {
          hasId: !!quoteData.id,
          hasClient: !!quoteData.clientId,
          hasModules: Array.isArray(quoteData.modules) && quoteData.modules.length > 0,
          hasItems: quoteData.modules && quoteData.modules.some(m => 
            Array.isArray(m.items) && m.items.length > 0
          ),
          hasInstallments: Array.isArray(quoteData.installments) && quoteData.installments.length > 0,
          hasCollaborators: Array.isArray(quoteData.collaborators) && quoteData.collaborators.length > 0,
          hasShareToken: !!quoteData.shareToken,
          hasShareExpiry: !!quoteData.shareExpiry
        };
        
        const allChecksPassed = Object.values(checks).every(c => c);
        
        if (allChecksPassed) {
          addStep('Verifica Dati Preventivo', 'success', {
            message: 'Tutti i dati del preventivo sono presenti e coerenti nel database'
          });
        } else {
          const missingFields = Object.entries(checks)
            .filter(([_, val]) => !val)
            .map(([key]) => key);
          
          addStep('Verifica Dati Preventivo', 'warning', {
            message: `Alcuni dati potrebbero essere mancanti: ${missingFields.join(', ')}`
          });
        }
        
        await takeScreenshot(page, 'quote_db_data');
      } else {
        addStep('Verifica Dati Preventivo', 'warning', {
          message: 'Non è possibile accedere ai dati raw del database in questo ambiente'
        });
      }
      
    } catch (error) {
      addStep('Verifica Dati Preventivo', 'warning', { 
        message: `Errore durante la verifica dei dati: ${error.message}` 
      });
    }
    
    return { quoteId, shareUrl: report.clientShareUrl };
    
  } catch (error) {
    addStep('Test Admin Flow', 'error', { 
      message: `Errore fatale durante il test admin: ${error.message}`,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * TEST 2: Flusso Cliente - Visualizzazione, accettazione e firma del preventivo
 */
async function testClientFlow(page) {
  if (!report.clientShareUrl) {
    addStep('Test Client Flow', 'error', { 
      message: 'URL di condivisione non disponibile, impossibile testare il flusso cliente' 
    });
    return;
  }
  
  try {
    // Passo 1: Accesso alla pagina pubblica del preventivo
    await page.goto(report.clientShareUrl);
    
    // Verifica che la pagina sia caricata correttamente
    const pageTitle = await page.textContent('h1');
    if (pageTitle && (pageTitle.includes('Preventivo') || pageTitle.includes('Offerta'))) {
      addStep('Accesso Pagina Pubblica Preventivo', 'success');
      await takeScreenshot(page, 'public_quote_page');
    } else {
      addStep('Accesso Pagina Pubblica Preventivo', 'error', { 
        message: 'Pagina preventivo non caricata correttamente' 
      });
      await takeScreenshot(page, 'public_quote_error');
      throw new Error('Errore caricamento pagina pubblica');
    }
    
    // Passo 2: Verifica visualizzazione corretta dei dati
    try {
      // Verifica presenza sezioni principali
      const sections = {
        clientInfo: await page.isVisible('div:has-text("Informazioni Cliente")'),
        quoteDetails: await page.isVisible('div:has-text("Dettagli Preventivo")'),
        modules: await page.isVisible('div:has-text("Moduli")'),
        financialInfo: await page.isVisible('div:has-text("Informazioni Finanziarie")'),
        paymentSchedule: await page.isVisible('div:has-text("Piano di Pagamento")'),
        contractClauses: await page.isVisible('div:has-text("Clausole Contrattuali")')
      };
      
      const missingSections = Object.entries(sections)
        .filter(([_, visible]) => !visible)
        .map(([key]) => key);
      
      if (missingSections.length === 0) {
        addStep('Verifica Sezioni Pagina Pubblica', 'success');
      } else {
        addStep('Verifica Sezioni Pagina Pubblica', 'warning', { 
          message: `Sezioni mancanti: ${missingSections.join(', ')}` 
        });
      }
      
      // Verifica dati finanziari
      const totalText = await page.textContent('div:has-text("Totale:") + div');
      const hasTotal = totalText && parseFloat(totalText.replace(/[^0-9,.]/g, '').replace(',', '.')) > 0;
      
      if (hasTotal) {
        addStep('Verifica Dati Finanziari', 'success');
      } else {
        addStep('Verifica Dati Finanziari', 'warning', { 
          message: 'Dati finanziari mancanti o con valori non validi' 
        });
      }
      
    } catch (error) {
      addStep('Verifica Visualizzazione Preventivo', 'error', { 
        message: `Errore durante la verifica: ${error.message}` 
      });
      await takeScreenshot(page, 'public_quote_data_error');
    }
    
    // Passo 3: Accettazione e firma del preventivo
    try {
      // Scorri fino al pulsante di accettazione
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      // Controlla se è presente il pulsante di accettazione
      const hasAcceptButton = await page.isVisible('button:has-text("Accetta")');
      
      if (hasAcceptButton) {
        // Click sul pulsante di accettazione
        await page.click('button:has-text("Accetta")');
        
        // Attendi il popup di firma
        await page.waitForSelector('div:has-text("Firma Preventivo")');
        
        // Firma (simulata disegnando sul canvas)
        const signaturePad = await page.$('canvas');
        if (signaturePad) {
          const boundingBox = await signaturePad.boundingBox();
          await page.mouse.move(
            boundingBox.x + boundingBox.width / 4,
            boundingBox.y + boundingBox.height / 2
          );
          await page.mouse.down();
          await page.mouse.move(
            boundingBox.x + boundingBox.width * 3/4,
            boundingBox.y + boundingBox.height / 2
          );
          await page.mouse.up();
          
          await takeScreenshot(page, 'signature');
          
          // Conferma firma
          await page.click('button:has-text("Conferma Firma")');
          
          // Attendi la conferma
          try {
            await page.waitForSelector('div:has-text("Preventivo accettato con successo")', { timeout: 10000 });
            addStep('Firma Preventivo', 'success');
          } catch (error) {
            addStep('Firma Preventivo', 'warning', { 
              message: 'Firma completata ma nessun messaggio di conferma visualizzato' 
            });
          }
          
          await takeScreenshot(page, 'quote_accepted');
        } else {
          addStep('Firma Preventivo', 'error', { 
            message: 'Canvas per la firma non trovato' 
          });
        }
      } else {
        addStep('Firma Preventivo', 'warning', { 
          message: 'Pulsante di accettazione non trovato, potrebbe essere necessario aggiornare il test' 
        });
      }
      
    } catch (error) {
      addStep('Firma Preventivo', 'error', { 
        message: `Errore durante la firma: ${error.message}` 
      });
      await takeScreenshot(page, 'signature_error');
    }
    
    // Passo 4: Verifica trasformazione in contratto
    try {
      // Torna alla dashboard amministratore
      await page.goto(`${config.baseUrl}/quotes`);
      
      // Verifica se il preventivo è ora segnato come accettato
      await page.waitForSelector('table');
      
      // Cerca il preventivo nella tabella
      const quoteStatuses = await page.$$eval('table tr', rows => {
        return rows.map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length > 0) {
            return {
              title: cells[0]?.textContent?.trim() || '',
              status: cells.find(cell => 
                cell.textContent?.includes('Firmato') || 
                cell.textContent?.includes('Accettato')
              )?.textContent?.trim() || ''
            };
          }
          return null;
        }).filter(Boolean);
      });
      
      const acceptedQuote = quoteStatuses.find(q => 
        q.title.toLowerCase().includes('test preventivo matrimonio') &&
        (q.status.toLowerCase().includes('firmato') || q.status.toLowerCase().includes('accettato'))
      );
      
      if (acceptedQuote) {
        addStep('Verifica Stato Preventivo', 'success', {
          message: 'Preventivo correttamente marcato come accettato/firmato'
        });
      } else {
        addStep('Verifica Stato Preventivo', 'warning', {
          message: 'Preventivo non trovato o non marcato come accettato/firmato'
        });
      }
      
      await takeScreenshot(page, 'quote_list_after_acceptance');
      
    } catch (error) {
      addStep('Verifica Stato Preventivo', 'error', { 
        message: `Errore durante la verifica: ${error.message}` 
      });
      await takeScreenshot(page, 'quote_status_error');
    }
    
  } catch (error) {
    addStep('Test Client Flow', 'error', { 
      message: `Errore fatale durante il test client: ${error.message}`,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * TEST 3: Integrazione Finanziaria - Verifica coerenza tra preventivo, contratto ed eventi
 */
async function testFinancialIntegration(page) {
  try {
    // Passo 1: Verifica che il preventivo sia stato convertito in contratto
    await page.goto(`${config.baseUrl}/contracts`);
    
    // Verifica esistenza del contratto
    const hasNewContract = await page.isVisible('table tr td:has-text("Test Preventivo Matrimonio")');
    
    if (hasNewContract) {
      addStep('Verifica Conversione in Contratto', 'success');
      await takeScreenshot(page, 'contract_list');
      
      // Ottieni l'ID del contratto
      const contractId = await page.$eval('table tr:has-text("Test Preventivo Matrimonio")', row => {
        // Trova il link al dettaglio contratto e estrai l'ID
        const detailLink = row.querySelector('a[href*="/contracts/"]');
        return detailLink ? detailLink.getAttribute('href').split('/').pop() : null;
      });
      
      if (contractId) {
        // Naviga ai dettagli del contratto
        await page.click(`a[href="/contracts/${contractId}"]`);
        
        // Verifica pagina dettaglio contratto
        const contractTitle = await page.textContent('h1');
        if (contractTitle && contractTitle.includes('Contratto')) {
          addStep('Accesso Dettaglio Contratto', 'success');
          await takeScreenshot(page, 'contract_details');
          
          // Passo 2: Verifica pagamenti e transazioni finanziarie
          const hasPayments = await page.isVisible('div:has-text("Pagamenti")');
          const hasFinancialInfo = await page.isVisible('div:has-text("Informazioni Finanziarie")');
          
          if (hasPayments && hasFinancialInfo) {
            addStep('Verifica Sezioni Finanziarie', 'success');
            
            // Verifica corrispondenza con rate del preventivo
            const installmentRows = await page.$$eval('table tr', rows => {
              return rows.filter(row => row.querySelector('td')).map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                return {
                  amount: cells[0]?.textContent?.trim() || '',
                  dueDate: cells[1]?.textContent?.trim() || '',
                  status: cells[3]?.textContent?.trim() || ''
                };
              });
            });
            
            if (installmentRows.length >= 2) {
              addStep('Verifica Rate Pagamento', 'success', {
                message: `Trovate ${installmentRows.length} rate di pagamento`
              });
            } else {
              addStep('Verifica Rate Pagamento', 'warning', {
                message: `Trovate solo ${installmentRows.length} rate, erano attese almeno 2`
              });
            }
          } else {
            addStep('Verifica Sezioni Finanziarie', 'warning', {
              message: 'Sezioni finanziarie mancanti nel dettaglio contratto'
            });
          }
          
          // Passo 3: Verifica creazione evento
          const hasEventSection = await page.isVisible('div:has-text("Evento Associato")');
          
          if (hasEventSection) {
            // Controlla se esiste un link all'evento
            const hasEventLink = await page.isVisible('a[href*="/events/"]');
            
            if (hasEventLink) {
              const eventId = await page.$eval('a[href*="/events/"]', link => 
                link.getAttribute('href').split('/').pop()
              );
              
              addStep('Verifica Creazione Evento', 'success', {
                message: `Evento creato con ID: ${eventId}`
              });
              
              // Naviga all'evento
              await page.click('a[href*="/events/"]');
              
              // Verifica dettagli evento
              const eventTitle = await page.textContent('h1');
              if (eventTitle && eventTitle.includes('Evento')) {
                addStep('Accesso Dettaglio Evento', 'success');
                await takeScreenshot(page, 'event_details');
                
                // Verifica che i collaboratori siano stati assegnati correttamente
                const hasCollaboratorsSection = await page.isVisible('div:has-text("Collaboratori")');
                
                if (hasCollaboratorsSection) {
                  const collaboratorRows = await page.$$eval('table:has(th:has-text("Collaboratore")) tbody tr', rows => rows.length);
                  
                  if (collaboratorRows > 0) {
                    addStep('Verifica Assegnazione Collaboratori', 'success', {
                      message: `${collaboratorRows} collaboratori assegnati all'evento`
                    });
                  } else {
                    addStep('Verifica Assegnazione Collaboratori', 'warning', {
                      message: 'Nessun collaboratore assegnato all\'evento'
                    });
                  }
                } else {
                  addStep('Verifica Assegnazione Collaboratori', 'warning', {
                    message: 'Sezione collaboratori non trovata nella pagina evento'
                  });
                }
                
                // Verifica che le informazioni dell'evento corrispondano al preventivo
                const eventInfo = await page.$$eval('div.grid div.flex', divs => {
                  return divs.map(div => div.textContent);
                });
                
                const hasLocation = eventInfo.some(info => 
                  info.toLowerCase().includes('villa belvedere') || 
                  info.toLowerCase().includes('roma')
                );
                
                const hasDate = eventInfo.some(info => 
                  info.includes('2025') && info.includes('06') && info.includes('15')
                );
                
                if (hasLocation && hasDate) {
                  addStep('Verifica Dati Evento', 'success', {
                    message: 'I dati dell\'evento corrispondono ai dati del preventivo'
                  });
                } else {
                  addStep('Verifica Dati Evento', 'warning', {
                    message: 'Alcuni dati dell\'evento non corrispondono ai dati del preventivo'
                  });
                }
              } else {
                addStep('Accesso Dettaglio Evento', 'warning', {
                  message: 'Pagina dettaglio evento non caricata correttamente'
                });
              }
            } else {
              addStep('Verifica Creazione Evento', 'warning', {
                message: 'Sezione evento presente ma nessun link all\'evento trovato'
              });
            }
          } else {
            addStep('Verifica Creazione Evento', 'warning', {
              message: 'Nessuna sezione evento trovata nel dettaglio contratto'
            });
          }
        } else {
          addStep('Accesso Dettaglio Contratto', 'error', {
            message: 'Pagina dettaglio contratto non caricata correttamente'
          });
        }
      } else {
        addStep('Identificazione ID Contratto', 'error', {
          message: 'Impossibile identificare l\'ID del contratto'
        });
      }
    } else {
      addStep('Verifica Conversione in Contratto', 'warning', {
        message: 'Nessun contratto trovato per il preventivo di test'
      });
    }
    
    // Passo 4: Verifica sezione collaboratori
    await page.goto(`${config.baseUrl}/collaborators`);
    
    // Seleziona un collaboratore (primo della lista)
    const hasCollaborators = await page.isVisible('table tbody tr');
    
    if (hasCollaborators) {
      // Clicca sul primo collaboratore
      await page.click('table tbody tr td:first-child a');
      
      // Verifica che siamo nella pagina del dettaglio collaboratore
      await page.waitForSelector('h1:has-text("Dettaglio Collaboratore")');
      
      // Verifica se l'evento è stato assegnato nella scheda collaboratore
      await page.click('button:has-text("Eventi")');
      const eventiAssegnati = await page.$$eval('table tr td:first-child', cells => 
        cells.map(cell => cell.textContent)
      );
      
      const hasMaTrimonioEvento = eventiAssegnati.some(text => 
        text && text.toLowerCase().includes('matrimonio')
      );
      
      if (hasMaTrimonioEvento) {
        addStep('Verifica Eventi nei Collaboratori', 'success', {
          message: 'Evento del preventivo correttamente visualizzato nella sezione collaboratori'
        });
        await takeScreenshot(page, 'collaborator_events');
      } else {
        addStep('Verifica Eventi nei Collaboratori', 'warning', {
          message: 'Evento del preventivo non trovato nella sezione collaboratori'
        });
      }
    } else {
      addStep('Verifica Collaboratori', 'warning', {
        message: 'Nessun collaboratore trovato nel sistema'
      });
    }
    
    // Report finale sull'integrazione finanziaria
    const errorCount = report.errors.filter(e => 
      e.step.includes('Finanziar') || 
      e.step.includes('Pagament') || 
      e.step.includes('Rate')
    ).length;
    
    const warningCount = report.warnings.filter(w => 
      w.step.includes('Finanziar') || 
      w.step.includes('Pagament') || 
      w.step.includes('Rate')
    ).length;
    
    if (errorCount === 0 && warningCount === 0) {
      report.financialConsistency = 'high';
      addStep('Analisi Integrazione Finanziaria', 'success', {
        message: 'Integrazione finanziaria completa e coerente'
      });
    } else if (errorCount === 0 && warningCount > 0) {
      report.financialConsistency = 'medium';
      addStep('Analisi Integrazione Finanziaria', 'warning', {
        message: `Integrazione finanziaria buona ma con ${warningCount} piccole inconsistenze`
      });
    } else {
      report.financialConsistency = 'low';
      addStep('Analisi Integrazione Finanziaria', 'error', {
        message: `Integrazione finanziaria problematica con ${errorCount} errori e ${warningCount} warning`
      });
    }
    
  } catch (error) {
    addStep('Test Integrazione Finanziaria', 'error', { 
      message: `Errore fatale durante i test finanziari: ${error.message}`,
      stack: error.stack
    });
    report.financialConsistency = 'unknown';
    throw error;
  }
}

// Esegui il test
runTests().catch(console.error);

module.exports = { runTests };
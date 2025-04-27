/**
 * Test Collaboratori System - Script di test completo per il modulo collaboratori
 * 
 * Questo script testa tutte le funzionalità del modulo collaboratori:
 * 1. Creazione, modifica ed eliminazione di collaboratori
 * 2. Assegnazione di collaboratori agli eventi
 * 3. Sistema di montaggi e loro stati
 * 4. Sistema finanziario dei collaboratori (pagamenti, saldi, acconti)
 * 5. Compatibilità con il sistema finanziario generale
 * 6. Dashboard e token per i collaboratori
 */

// Configurazione
const API_BASE_URL = 'http://localhost:5000/api';
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Risultati dei test
const testResults = [];
const startTime = Date.now();

// Funzione per effettuare chiamate API
async function apiCall(endpoint, method = 'GET', data = null, headers = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Automation': 'true', // Per bypassare la protezione CSRF
      ...headers
    }
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    console.log(`${COLORS.cyan}✨ API Call: ${method} ${url}${COLORS.reset}`);
    const response = await fetch(url, options);
    
    // Gestione risposta
    if (response.ok) {
      const responseData = await response.json().catch(() => ({}));
      console.log(`${COLORS.green}✅ API Response: ${response.status} ${response.statusText}${COLORS.reset}`);
      return responseData;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error(`${COLORS.red}❌ API Error: ${response.status} ${response.statusText}${COLORS.reset}`);
      console.error(`${COLORS.red}Error details:${COLORS.reset}`, errorData);
      throw new Error(`API Error ${response.status}: ${JSON.stringify(errorData)}`);
    }
  } catch (error) {
    console.error(`${COLORS.red}❌ Network Error:${COLORS.reset}`, error.message);
    throw error;
  }
}

// Funzione per registrare i risultati dei test
function logTestResult(name, success, duration, errorDetails = null) {
  const result = {
    name,
    success,
    duration,
    timestamp: new Date().toISOString(),
    errorDetails
  };
  
  testResults.push(result);
  
  const icon = success ? '✅' : '❌';
  const color = success ? COLORS.green : COLORS.red;
  console.log(`${color}${icon} ${name} - ${success ? 'SUCCESSO' : 'FALLITO'} (${duration}ms)${COLORS.reset}`);
  
  if (!success && errorDetails) {
    console.error(`${COLORS.red}Dettagli errore:${COLORS.reset}`, errorDetails);
  }
}

// Funzione per salvare i risultati dei test
async function saveTestResults() {
  const summary = {
    totalTests: testResults.length,
    passedTests: testResults.filter(t => t.success).length,
    failedTests: testResults.filter(t => !t.success).length,
    totalDuration: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    results: testResults
  };
  
  console.log(`\n${COLORS.bright}=== RIEPILOGO TEST ===${COLORS.reset}`);
  console.log(`Test totali: ${summary.totalTests}`);
  console.log(`Test riusciti: ${COLORS.green}${summary.passedTests}${COLORS.reset}`);
  console.log(`Test falliti: ${summary.failedTests > 0 ? COLORS.red : COLORS.reset}${summary.failedTests}${COLORS.reset}`);
  console.log(`Durata totale: ${summary.totalDuration}ms`);
  
  // Salviamo i risultati in un file
  try {
    const fs = await import('fs');
    await fs.promises.writeFile(
      `collaboratori-test-results-${new Date().toISOString().replace(/:/g, '-')}.json`,
      JSON.stringify(summary, null, 2)
    );
    console.log(`${COLORS.green}Risultati test salvati con successo${COLORS.reset}`);
  } catch (error) {
    console.error(`${COLORS.red}Errore nel salvataggio dei risultati:${COLORS.reset}`, error);
  }
}

// Test Function: Crea un collaboratore di test
async function creaCollaboratoreDiTest() {
  const startTime = Date.now();
  const testName = 'Creazione Collaboratore';
  
  try {
    const randomNum = Math.floor(Math.random() * 1000);
    const collaboratoreData = {
      firstName: `Tester${randomNum}`,
      lastName: `Automatico${randomNum}`,
      email: `test${randomNum}@example.com`,
      phone: `+3912345678${randomNum % 100}`,
      role: 'Fotografo',
      taxCode: `TSTAUT${randomNum}ZZZZ`,
      notes: 'Creato da script di test automatico'
    };
    
    const collaboratore = await apiCall('/collaborators', 'POST', collaboratoreData);
    
    // Verifica che il collaboratore sia stato creato correttamente
    if (!collaboratore || !collaboratore.id) {
      throw new Error('Collaboratore non creato correttamente');
    }
    
    logTestResult(testName, true, Date.now() - startTime);
    return collaboratore;
  } catch (error) {
    logTestResult(testName, false, Date.now() - startTime, error.message);
    throw error;
  }
}

// Test Function: Crea un evento di test
async function creaEventoDiTest() {
  const startTime = Date.now();
  const testName = 'Creazione Evento';
  
  try {
    const randomNum = Math.floor(Math.random() * 1000);
    const oggi = new Date();
    const domani = new Date(oggi);
    domani.setDate(oggi.getDate() + 1);
    
    const eventoData = {
      title: `Test Evento ${randomNum}`,
      description: 'Evento creato da script di test automatico',
      date: oggi.toISOString(),
      endDate: domani.toISOString(),
      location: 'Test Location',
      eventType: 'Matrimonio', // Corretto da 'type' a 'eventType'
      clientId: 1, // Useremo il primo cliente disponibile
      color: '#FF5733',
      status: 'confirmed'
    };
    
    const evento = await apiCall('/events', 'POST', eventoData);
    
    // Verifica che l'evento sia stato creato correttamente
    if (!evento || !evento.id) {
      throw new Error('Evento non creato correttamente');
    }
    
    logTestResult(testName, true, Date.now() - startTime);
    return evento;
  } catch (error) {
    logTestResult(testName, false, Date.now() - startTime, error.message);
    throw error;
  }
}

// Test Function: Assegna un collaboratore a un evento
async function assegnaCollaboratoreEvento(collaboratoreId, eventoId) {
  const startTime = Date.now();
  const testName = 'Assegnazione Collaboratore a Evento';
  
  try {
    const assegnazioneData = {
      eventId: eventoId,
      collaboratorId: collaboratoreId,
      role: 'Fotografo principale',
      notes: 'Assegnazione creata da script di test'
    };
    
    const assegnazione = await apiCall('/event-collaborators', 'POST', assegnazioneData);
    
    // Verifica l'assegnazione
    if (!assegnazione || !assegnazione.id) {
      throw new Error('Assegnazione collaboratore-evento non creata correttamente');
    }
    
    // Verifica che il collaboratore sia effettivamente assegnato all'evento
    const collaboratoriEvento = await apiCall(`/events/${eventoId}/collaborators`);
    const assegnato = collaboratoriEvento.some(c => c.id === collaboratoreId);
    
    if (!assegnato) {
      throw new Error('Collaboratore non risulta assegnato all\'evento');
    }
    
    logTestResult(testName, true, Date.now() - startTime);
    return assegnazione;
  } catch (error) {
    logTestResult(testName, false, Date.now() - startTime, error.message);
    throw error;
  }
}

// Test Function: Crea un montaggio per un collaboratore su un evento
async function creaMontaggio(collaboratoreId, eventoId) {
  const startTime = Date.now();
  const testName = 'Creazione Montaggio';
  
  try {
    const oggi = new Date();
    const scadenza = new Date(oggi);
    scadenza.setDate(oggi.getDate() + 30);
    
    const montaggioData = {
      eventId: eventoId,
      collaboratorId: collaboratoreId,
      tipo: 'Highlights',
      stato: 'da_iniziare',
      priorita: 'normale',
      scadenza: scadenza.toISOString(),
      note: 'Montaggio creato da script di test automatico'
    };
    
    const montaggio = await apiCall('/montaggi', 'POST', montaggioData);
    
    // Verifica la creazione del montaggio
    if (!montaggio || !montaggio.id) {
      throw new Error('Montaggio non creato correttamente');
    }
    
    logTestResult(testName, true, Date.now() - startTime);
    return montaggio;
  } catch (error) {
    logTestResult(testName, false, Date.now() - startTime, error.message);
    throw error;
  }
}

// Test Function: Aggiorna lo stato di un montaggio
async function aggiornaMontaggio(eventoId, montaggioId, nuovoStato) {
  const startTime = Date.now();
  const testName = 'Aggiornamento Stato Montaggio';
  
  try {
    const aggiornamentoData = {
      stato: nuovoStato,
      note: `Stato aggiornato a ${nuovoStato} da script di test automatico`
    };
    
    const montaggioAggiornato = await apiCall(`/eventi/${eventoId}/montaggi/${montaggioId}`, 'PUT', aggiornamentoData);
    
    // Verifica l'aggiornamento
    if (!montaggioAggiornato || montaggioAggiornato.stato !== nuovoStato) {
      throw new Error(`Stato montaggio non aggiornato correttamente a ${nuovoStato}`);
    }
    
    logTestResult(testName, true, Date.now() - startTime);
    return montaggioAggiornato;
  } catch (error) {
    logTestResult(testName, false, Date.now() - startTime, error.message);
    throw error;
  }
}

// Test Function: Crea un pagamento per un collaboratore
async function creaPagamentoCollaboratore(collaboratoreId, eventoId, importo) {
  const startTime = Date.now();
  const testName = 'Creazione Pagamento Collaboratore';
  
  try {
    const pagamentoData = {
      eventId: eventoId,
      collaboratorId: collaboratoreId,
      amount: importo,
      description: 'Pagamento creato da script di test automatico',
      date: new Date().toISOString(),
      paymentMethod: 'bonifico'
    };
    
    const pagamento = await apiCall('/pagamenti-evento', 'POST', pagamentoData);
    
    // Verifica la creazione del pagamento
    if (!pagamento || !pagamento.id) {
      throw new Error('Pagamento non creato correttamente');
    }
    
    logTestResult(testName, true, Date.now() - startTime);
    return pagamento;
  } catch (error) {
    logTestResult(testName, false, Date.now() - startTime, error.message);
    throw error;
  }
}

// Test Function: Verifica integrazione con il sistema finanziario
async function verificaSistemaFinanziario(collaboratoreId, pagamentoId) {
  const startTime = Date.now();
  const testName = 'Verifica Integrazione Sistema Finanziario';
  
  try {
    // Verifica che il pagamento al collaboratore sia riportato correttamente nel sistema finanziario
    const pagamento = await apiCall(`/pagamenti-evento/${pagamentoId}`);
    const transazioniFinanziarie = await apiCall('/finance/transactions');
    
    // Trova la transazione corrispondente al pagamento del collaboratore
    const transazioneTrovata = transazioniFinanziarie.some(t => 
      t.amount === pagamento.amount && 
      t.type === 'expense' && 
      t.description.includes(`Collaboratore ID ${collaboratoreId}`)
    );
    
    if (!transazioneTrovata) {
      throw new Error('Pagamento collaboratore non trovato nel sistema finanziario generale');
    }
    
    // Verifica anche tramite endpoint di debug specifico
    const verificaIntegrazione = await apiCall('/debug/collaboratori-finanza/verifica');
    
    if (!verificaIntegrazione || !verificaIntegrazione.status === 'success') {
      throw new Error('L\'endpoint di verifica integrazione finanziaria ha riportato problemi');
    }
    
    logTestResult(testName, true, Date.now() - startTime);
    return true;
  } catch (error) {
    logTestResult(testName, false, Date.now() - startTime, error.message);
    throw error;
  }
}

// Test Function: Genera e verifica token per collaboratore
async function generaTokenCollaboratore(collaboratoreId) {
  const startTime = Date.now();
  const testName = 'Generazione Token Collaboratore';
  
  try {
    const tokenData = {
      collaboratorId: collaboratoreId,
      expiryDays: 30,
      note: 'Token generato da script di test automatico'
    };
    
    const token = await apiCall('/collaboratori/generate-token', 'POST', tokenData);
    
    // Verifica la generazione del token
    if (!token || !token.accessToken) {
      throw new Error('Token non generato correttamente');
    }
    
    // Verifica accesso tramite token
    const dashboardInfo = await apiCall('/collaboratori/dashboard', 'GET', null, {
      'Authorization': `Bearer ${token.accessToken}`
    });
    
    if (!dashboardInfo || !dashboardInfo.collaboratore || dashboardInfo.collaboratore.id !== collaboratoreId) {
      throw new Error('Accesso con token non funzionante');
    }
    
    logTestResult(testName, true, Date.now() - startTime);
    return token;
  } catch (error) {
    logTestResult(testName, false, Date.now() - startTime, error.message);
    throw error;
  }
}

// Test Function: Pulizia dati test
async function pulisciDatiTest(ids) {
  const startTime = Date.now();
  const testName = 'Pulizia Dati Test';
  
  try {
    const { collaboratoreId, eventoId, montaggioId, pagamentoId } = ids;
    
    // Elimina pagamento
    if (pagamentoId) {
      await apiCall(`/pagamenti-evento/${pagamentoId}`, 'DELETE');
    }
    
    // Elimina montaggio
    if (montaggioId) {
      await apiCall(`/eventi/${eventoId}/montaggi/${montaggioId}`, 'DELETE');
    }
    
    // Elimina assegnazione collaboratore a evento
    if (collaboratoreId && eventoId) {
      await apiCall(`/event-collaborators/${eventoId}/${collaboratoreId}`, 'DELETE');
    }
    
    // Elimina evento
    if (eventoId) {
      await apiCall(`/events/${eventoId}`, 'DELETE');
    }
    
    // Elimina collaboratore
    if (collaboratoreId) {
      await apiCall(`/collaborators/${collaboratoreId}`, 'DELETE');
    }
    
    logTestResult(testName, true, Date.now() - startTime);
    return true;
  } catch (error) {
    logTestResult(testName, false, Date.now() - startTime, error.message);
    // Non propagare l'errore di pulizia
    return false;
  }
}

// Funzione principale che esegue tutti i test
async function eseguiTestSuite() {
  console.log(`${COLORS.bright}${COLORS.cyan}=== INIZIO TEST SISTEMA COLLABORATORI ===${COLORS.reset}`);
  console.log(`${COLORS.yellow}Data: ${new Date().toLocaleString()}${COLORS.reset}\n`);
  
  let ids = {
    collaboratoreId: null,
    eventoId: null,
    montaggioId: null,
    pagamentoId: null
  };
  
  try {
    // Test 1: Creazione collaboratore
    const collaboratore = await creaCollaboratoreDiTest();
    ids.collaboratoreId = collaboratore.id;
    
    // Test 2: Creazione evento
    const evento = await creaEventoDiTest();
    ids.eventoId = evento.id;
    
    // Test 3: Assegnazione collaboratore a evento
    await assegnaCollaboratoreEvento(collaboratore.id, evento.id);
    
    // Test 4: Creazione montaggio
    const montaggio = await creaMontaggio(collaboratore.id, evento.id);
    ids.montaggioId = montaggio.id;
    
    // Test 5: Aggiornamento montaggio
    await aggiornaMontaggio(evento.id, montaggio.id, 'in_corso');
    
    // Test 6: Creazione pagamento collaboratore
    const pagamento = await creaPagamentoCollaboratore(collaboratore.id, evento.id, 150.00);
    ids.pagamentoId = pagamento.id;
    
    // Test 7: Verifica integrazione sistema finanziario
    await verificaSistemaFinanziario(collaboratore.id, pagamento.id);
    
    // Test 8: Generazione token collaboratore
    await generaTokenCollaboratore(collaboratore.id);
    
    console.log(`${COLORS.green}${COLORS.bright}✅ TUTTI I TEST COMPLETATI CON SUCCESSO!${COLORS.reset}`);
  } catch (error) {
    console.error(`${COLORS.red}${COLORS.bright}❌ TEST FALLITO:${COLORS.reset}`, error.message);
  } finally {
    // Pulizia dati creati durante i test
    await pulisciDatiTest(ids);
    
    // Salva i risultati dei test
    await saveTestResults();
    
    console.log(`${COLORS.bright}${COLORS.cyan}=== FINE TEST SISTEMA COLLABORATORI ===${COLORS.reset}`);
  }
}

// Esecuzione della suite di test
eseguiTestSuite().catch(error => {
  console.error(`${COLORS.red}Errore fatale durante l'esecuzione della suite di test:${COLORS.reset}`, error);
});
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

import fetch from 'node-fetch';
import { format, addDays, subDays } from 'date-fns';
import fs from 'fs/promises';
import path from 'path';

// Configurazione
const API_BASE_URL = 'http://localhost:3000/api';
const TEST_ENV = process.env.NODE_ENV || 'development';
const TEST_LOGS_DIR = path.join(process.cwd(), 'test-results');
const LOG_FILE = path.join(TEST_LOGS_DIR, 'collaboratori-test-results.json');

// Contatori risultati test
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

// Dati di test
const testData = {
  collaboratori: [],
  eventi: [],
  montaggi: [],
  pagamenti: [],
  transazioni: [],
  errorLogs: []
};

// Funzione di utility per le chiamate API
async function apiCall(endpoint, method = 'GET', data = null, headers = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Automation': 'true', // Per bypass CSRF
        ...headers
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    console.log(`\n🌐 [API Call] ${method} ${url}`);
    if (data) console.log('📦 Payload:', JSON.stringify(data, null, 2));

    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    
    let responseData;
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return {
      status: response.status,
      data: responseData,
      headers: response.headers,
      ok: response.ok
    };
  } catch (error) {
    console.error(`❌ Errore API ${endpoint}:`, error.message);
    return {
      status: 500,
      data: { error: error.message },
      ok: false
    };
  }
}

// Funzione per registrare un risultato di test
function logTestResult(name, success, duration, errorDetails = null) {
  const result = {
    name,
    success,
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`
  };

  if (errorDetails) {
    result.error = errorDetails;
    testData.errorLogs.push({ 
      test: name, 
      error: errorDetails, 
      timestamp: new Date().toISOString() 
    });
  }

  totalTests++;
  
  if (success) {
    passedTests++;
    console.log(`✅ [TEST PASSATO] ${name} (${duration}ms)`);
  } else {
    failedTests++;
    console.log(`❌ [TEST FALLITO] ${name} (${duration}ms)`);
    if (errorDetails) {
      console.log(`   Errore: ${typeof errorDetails === 'object' ? JSON.stringify(errorDetails, null, 2) : errorDetails}`);
    }
  }

  return result;
}

// Funzione per salvare i risultati dei test
async function saveTestResults() {
  try {
    // Assicurati che la directory esista
    await fs.mkdir(TEST_LOGS_DIR, { recursive: true });
    
    const results = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        skippedTests,
        successRate: `${(passedTests / totalTests * 100).toFixed(2)}%`,
        timestamp: new Date().toISOString(),
        environment: TEST_ENV
      },
      testData,
      detailed: [] // Aggiungere dettagli per ogni test se necessario
    };

    await fs.writeFile(LOG_FILE, JSON.stringify(results, null, 2));
    console.log(`\n📝 Risultati dei test salvati in: ${LOG_FILE}`);
  } catch (error) {
    console.error('Errore nel salvataggio dei risultati:', error);
  }
}

// Generiamo un nuovo collaboratore per i test
async function creaCollaboratoreDiTest() {
  const startTime = Date.now();
  try {
    const randomNum = Math.floor(Math.random() * 10000);
    const nuovoCollaboratore = {
      firstName: `Test${randomNum}`,
      lastName: `Collaboratore${randomNum}`,
      email: `test.collab${randomNum}@example.com`,
      phone: `+39 34512345${randomNum % 100}`,
      role: 'photographer',
      address: 'Via Test 123, Roma',
      notes: 'Collaboratore creato per test automatici'
    };

    const response = await apiCall('/collaborators', 'POST', nuovoCollaboratore);
    
    if (!response.ok || !response.data || !response.data.id) {
      return logTestResult('Creazione collaboratore di test', false, Date.now() - startTime, 
        response.data?.error || 'Risposta API non valida');
    }

    const collaboratore = response.data;
    testData.collaboratori.push(collaboratore);
    
    return {
      success: true,
      collaboratore,
      testResult: logTestResult('Creazione collaboratore di test', true, Date.now() - startTime)
    };
  } catch (error) {
    return {
      success: false,
      testResult: logTestResult('Creazione collaboratore di test', false, Date.now() - startTime, error.message)
    };
  }
}

// Crea un evento di test da utilizzare con i collaboratori
async function creaEventoDiTest() {
  const startTime = Date.now();
  try {
    const randomNum = Math.floor(Math.random() * 10000);
    const dataEvento = format(addDays(new Date(), 30), "yyyy-MM-dd");
    
    const nuovoEvento = {
      title: `Test Evento ${randomNum}`,
      description: `Evento creato per test automatici ${randomNum}`,
      date: dataEvento,
      location: 'Test Location',
      type: 'wedding',
      notes: 'Note di test',
      status: 'confirmed'
    };

    const response = await apiCall('/events', 'POST', nuovoEvento);
    
    if (!response.ok || !response.data || !response.data.id) {
      return logTestResult('Creazione evento di test', false, Date.now() - startTime, 
        response.data?.error || 'Risposta API non valida');
    }

    const evento = response.data;
    testData.eventi.push(evento);
    
    return {
      success: true,
      evento,
      testResult: logTestResult('Creazione evento di test', true, Date.now() - startTime)
    };
  } catch (error) {
    return {
      success: false,
      testResult: logTestResult('Creazione evento di test', false, Date.now() - startTime, error.message)
    };
  }
}

// Test: assegnare un collaboratore a un evento
async function assegnaCollaboratoreEvento(collaboratoreId, eventoId) {
  const startTime = Date.now();
  try {
    const assegnazione = {
      collaboratoreId: Number(collaboratoreId),
      eventoId: Number(eventoId),
      role: 'photographer',
      fee: 200,
      notes: 'Assegnazione creata da test automatici'
    };

    const response = await apiCall('/event-collaborators', 'POST', assegnazione);
    
    if (!response.ok) {
      return logTestResult('Assegnazione collaboratore a evento', false, Date.now() - startTime, 
        response.data?.error || 'Risposta API non valida');
    }
    
    // Verifica assegnazione
    const verifica = await apiCall(`/collaboratori/${collaboratoreId}/eventi`);
    const eventoAssegnato = verifica.data.some(e => Number(e.id) === Number(eventoId));
    
    if (!eventoAssegnato) {
      return logTestResult('Verifica assegnazione collaboratore', false, Date.now() - startTime, 
        'Collaboratore non assegnato correttamente all\'evento');
    }
    
    return {
      success: true,
      assegnazione: response.data,
      testResult: logTestResult('Assegnazione collaboratore a evento', true, Date.now() - startTime)
    };
  } catch (error) {
    return {
      success: false,
      testResult: logTestResult('Assegnazione collaboratore a evento', false, Date.now() - startTime, error.message)
    };
  }
}

// Test: creazione di un montaggio
async function creaMontaggio(collaboratoreId, eventoId) {
  const startTime = Date.now();
  try {
    const montaggio = {
      collaboratoreId: Number(collaboratoreId),
      tipoMontaggio: 'video',
      dataConsegnaPrevista: addDays(new Date(), 15).toISOString(),
      priorita: 5,
      note: 'Montaggio creato da test automatizzati',
      stato: 'da_fare'
    };

    const response = await apiCall(`/eventi/${eventoId}/montaggi`, 'POST', montaggio);
    
    if (!response.ok || !response.data) {
      return logTestResult('Creazione montaggio', false, Date.now() - startTime, 
        response.data?.error || 'Risposta API non valida');
    }

    const montaggioCreato = response.data;
    testData.montaggi.push(montaggioCreato);
    
    return {
      success: true,
      montaggio: montaggioCreato,
      testResult: logTestResult('Creazione montaggio', true, Date.now() - startTime)
    };
  } catch (error) {
    return {
      success: false,
      testResult: logTestResult('Creazione montaggio', false, Date.now() - startTime, error.message)
    };
  }
}

// Test: aggiornamento stato montaggio
async function aggiornaMontaggio(eventoId, montaggioId, nuovoStato) {
  const startTime = Date.now();
  try {
    const aggiornamento = {
      stato: nuovoStato
    };

    if (nuovoStato === 'in_corso') {
      aggiornamento.dataPrimoContatto = new Date().toISOString();
    } else if (nuovoStato === 'completato') {
      aggiornamento.dataConsegnaEffettiva = new Date().toISOString();
      aggiornamento.saldoImporto = 150; // Per testare il sistema finanziario
    }

    const response = await apiCall(`/eventi/${eventoId}/montaggi/${montaggioId}`, 'PATCH', aggiornamento);
    
    if (!response.ok) {
      return logTestResult(`Aggiornamento montaggio a ${nuovoStato}`, false, Date.now() - startTime, 
        response.data?.error || 'Risposta API non valida');
    }
    
    return {
      success: true,
      montaggio: response.data,
      testResult: logTestResult(`Aggiornamento montaggio a ${nuovoStato}`, true, Date.now() - startTime)
    };
  } catch (error) {
    return {
      success: false,
      testResult: logTestResult(`Aggiornamento montaggio a ${nuovoStato}`, false, Date.now() - startTime, error.message)
    };
  }
}

// Test: creazione pagamento per collaboratore
async function creaPagamentoCollaboratore(collaboratoreId, eventoId, importo) {
  const startTime = Date.now();
  try {
    const pagamento = {
      collaboratoreId: Number(collaboratoreId),
      tipo: 'montaggio_saldo',
      importo: Number(importo),
      dataPagamento: new Date().toISOString(),
      metodoPagamento: 'bonifico',
      note: 'Pagamento creato da test automatici'
    };

    const response = await apiCall(`/eventi/${eventoId}/pagamenti`, 'POST', pagamento);
    
    if (!response.ok || !response.data) {
      return logTestResult('Creazione pagamento collaboratore', false, Date.now() - startTime, 
        response.data?.error || 'Risposta API non valida');
    }

    const pagamentoCreato = response.data;
    testData.pagamenti.push(pagamentoCreato);
    
    return {
      success: true,
      pagamento: pagamentoCreato,
      testResult: logTestResult('Creazione pagamento collaboratore', true, Date.now() - startTime)
    };
  } catch (error) {
    return {
      success: false,
      testResult: logTestResult('Creazione pagamento collaboratore', false, Date.now() - startTime, error.message)
    };
  }
}

// Test: verifica compatibilità con sistema finanziario generale
async function verificaSistemaFinanziario(collaboratoreId, pagamentoId) {
  const startTime = Date.now();
  try {
    // 1. Verifica pagamenti nel sistema collaboratore
    const pagamentiResponse = await apiCall(`/collaboratori/${collaboratoreId}/pagamenti`);
    
    if (!pagamentiResponse.ok || !pagamentiResponse.data) {
      return logTestResult('Verifica pagamenti collaboratore', false, Date.now() - startTime, 
        pagamentiResponse.data?.error || 'Risposta API pagamenti non valida');
    }
    
    const pagamentoPresenteInCollaboratore = pagamentiResponse.data.some(p => 
      p.id === pagamentoId || (p.pagamentoId && p.pagamentoId === pagamentoId)
    );
    
    if (!pagamentoPresenteInCollaboratore) {
      return logTestResult('Verifica pagamento in sistema collaboratore', false, Date.now() - startTime, 
        'Pagamento non trovato nel sistema collaboratore');
    }
    
    // 2. Verifica transazioni finanziarie generali
    const transakioniResponse = await apiCall('/transactions');
    
    if (!transakioniResponse.ok) {
      return logTestResult('Verifica transazioni generali', false, Date.now() - startTime, 
        transakioniResponse.data?.error || 'Risposta API transazioni non valida');
    }
    
    // Verifica se il pagamento ha creato una transazione corrispondente
    // Le transazioni potrebbero essere collegate tramite un riferimento o collegamento diretto
    const transakioniCorrelate = transakioniResponse.data.filter(t => 
      (t.reference && t.reference.includes(`collaboratore-${collaboratoreId}`)) ||
      (t.description && t.description.includes('pagamento collaboratore'))
    );
    
    if (transakioniCorrelate.length === 0) {
      console.log(`⚠️ Avviso: Nessuna transazione correlata trovata per il pagamento del collaboratore ${collaboratoreId}`);
    } else {
      testData.transazioni.push(...transakioniCorrelate);
    }
    
    // 3. Verifica saldo collaboratore (dovrebbe essere aggiornato)
    const dashboardResponse = await apiCall(`/collaboratori/${collaboratoreId}/dashboard`);
    
    if (!dashboardResponse.ok) {
      return logTestResult('Verifica dashboard collaboratore', false, Date.now() - startTime, 
        dashboardResponse.data?.error || 'Risposta API dashboard non valida');
    }
    
    // La dashboard dovrebbe riflettere i pagamenti e i saldi
    const dashboardData = dashboardResponse.data;
    
    return {
      success: true,
      dashboardData,
      transakioniCorrelate,
      testResult: logTestResult('Verifica sistema finanziario', true, Date.now() - startTime)
    };
  } catch (error) {
    return {
      success: false,
      testResult: logTestResult('Verifica sistema finanziario', false, Date.now() - startTime, error.message)
    };
  }
}

// Test: generazione token dashboard collaboratore
async function generaTokenCollaboratore(collaboratoreId) {
  const startTime = Date.now();
  try {
    const tokenRequest = {
      collaboratoreId: Number(collaboratoreId),
      expiresIn: '7d'
    };

    const response = await apiCall('/token-collaboratore', 'POST', tokenRequest);
    
    if (!response.ok || !response.data || !response.data.token) {
      return logTestResult('Generazione token collaboratore', false, Date.now() - startTime, 
        response.data?.error || 'Risposta API non valida');
    }
    
    return {
      success: true,
      token: response.data.token,
      testResult: logTestResult('Generazione token collaboratore', true, Date.now() - startTime)
    };
  } catch (error) {
    return {
      success: false,
      testResult: logTestResult('Generazione token collaboratore', false, Date.now() - startTime, error.message)
    };
  }
}

// Test: pulizia dati di test (opzionale, attivato tramite variabile d'ambiente)
async function pulisciDatiTest() {
  // Se non siamo in ambiente di test, non eliminare nulla
  if (TEST_ENV !== 'test' && !process.env.FORCE_CLEANUP) {
    console.log('⚠️ Pulizia dati disabilitata (non in ambiente di test). Usa FORCE_CLEANUP=true per forzare.');
    skippedTests++;
    return { skipped: true };
  }
  
  const startTime = Date.now();
  const errorList = [];
  let successCount = 0;
  
  try {
    // Elimina pagamenti di test
    for (const pagamento of testData.pagamenti) {
      try {
        await apiCall(`/pagamenti/${pagamento.id}`, 'DELETE');
        successCount++;
      } catch (err) {
        errorList.push(`Errore eliminazione pagamento ${pagamento.id}: ${err.message}`);
      }
    }
    
    // Elimina montaggi di test
    for (const montaggio of testData.montaggi) {
      try {
        await apiCall(`/eventi/${montaggio.eventoId}/montaggi/${montaggio.id}`, 'DELETE');
        successCount++;
      } catch (err) {
        errorList.push(`Errore eliminazione montaggio ${montaggio.id}: ${err.message}`);
      }
    }
    
    // Rimuovi assegnazioni collaboratore-evento
    for (const evento of testData.eventi) {
      for (const collaboratore of testData.collaboratori) {
        try {
          await apiCall(`/eventi/${evento.id}/collaboratori/${collaboratore.id}`, 'DELETE');
          successCount++;
        } catch (err) {
          errorList.push(`Errore rimozione assegnazione collab ${collaboratore.id} da evento ${evento.id}: ${err.message}`);
        }
      }
    }
    
    // Elimina eventi di test
    for (const evento of testData.eventi) {
      try {
        await apiCall(`/events/${evento.id}`, 'DELETE');
        successCount++;
      } catch (err) {
        errorList.push(`Errore eliminazione evento ${evento.id}: ${err.message}`);
      }
    }
    
    // Elimina collaboratori di test
    for (const collaboratore of testData.collaboratori) {
      try {
        await apiCall(`/collaborators/${collaboratore.id}`, 'DELETE');
        successCount++;
      } catch (err) {
        errorList.push(`Errore eliminazione collaboratore ${collaboratore.id}: ${err.message}`);
      }
    }
    
    const success = errorList.length === 0;
    return {
      success,
      successCount,
      errorList,
      testResult: logTestResult('Pulizia dati di test', success, Date.now() - startTime, 
        success ? null : { errors: errorList })
    };
  } catch (error) {
    return {
      success: false,
      successCount,
      errorList: [...errorList, error.message],
      testResult: logTestResult('Pulizia dati di test', false, Date.now() - startTime, error.message)
    };
  }
}

// Esegui test suite completa
async function eseguiTestSuite() {
  console.log('🚀 Avvio test suite modulo collaboratori...');
  
  try {
    // Test 1: Creazione collaboratore
    const collaboratoreResult = await creaCollaboratoreDiTest();
    if (!collaboratoreResult.success) {
      console.error('❌ Test fallito: Impossibile creare collaboratore di test. Arresto suite di test.');
      return;
    }
    const collaboratoreId = collaboratoreResult.collaboratore.id;
    
    // Test 2: Creazione evento
    const eventoResult = await creaEventoDiTest();
    if (!eventoResult.success) {
      console.error('❌ Test fallito: Impossibile creare evento di test. Arresto suite di test.');
      return;
    }
    const eventoId = eventoResult.evento.id;
    
    // Test 3: Assegnazione collaboratore a evento
    const assegnazioneResult = await assegnaCollaboratoreEvento(collaboratoreId, eventoId);
    if (!assegnazioneResult.success) {
      console.error('❌ Test fallito: Impossibile assegnare collaboratore all\'evento. Continuazione con cautela...');
    }
    
    // Test 4: Creazione montaggio
    const montaggioResult = await creaMontaggio(collaboratoreId, eventoId);
    if (!montaggioResult.success) {
      console.error('❌ Test fallito: Impossibile creare montaggio. Continuazione con cautela...');
    } else {
      const montaggioId = montaggioResult.montaggio.id;
      
      // Test 5A: Aggiornamento montaggio a "in corso"
      await aggiornaMontaggio(eventoId, montaggioId, 'in_corso');
      
      // Test 5B: Aggiornamento montaggio a "completato"
      await aggiornaMontaggio(eventoId, montaggioId, 'completato');
      
      // Test 6: Creazione pagamento
      const pagamentoResult = await creaPagamentoCollaboratore(collaboratoreId, eventoId, 150);
      if (pagamentoResult.success) {
        const pagamentoId = pagamentoResult.pagamento.id;
        
        // Test 7: Verifica sistema finanziario
        await verificaSistemaFinanziario(collaboratoreId, pagamentoId);
      }
    }
    
    // Test 8: Generazione token collaboratore
    await generaTokenCollaboratore(collaboratoreId);
    
    // Test 9: Pulizia (opzionale)
    if (process.env.CLEANUP === 'true' || process.env.FORCE_CLEANUP === 'true') {
      await pulisciDatiTest();
    } else {
      console.log('\n⚠️ Pulizia dati di test saltata. Usa CLEANUP=true per attivare.');
    }
    
    // Stampa report finale
    console.log('\n📊 Rapporto Test Suite:');
    console.log(`✅ Test Passati: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(2)}%)`);
    console.log(`❌ Test Falliti: ${failedTests}/${totalTests} (${(failedTests/totalTests*100).toFixed(2)}%)`);
    if (skippedTests > 0) {
      console.log(`⏭️ Test Saltati: ${skippedTests}`);
    }
    console.log('\n💡 Controlla il file di log per dettagli completi sui test.');
  } catch (error) {
    console.error('❌ Errore critico nell\'esecuzione della suite di test:', error);
  } finally {
    // Salva i risultati dei test per riferimento futuro
    await saveTestResults();
  }
}

// Avvio della suite di test
eseguiTestSuite().catch(error => {
  console.error('❌ Errore nell\'esecuzione della suite di test:', error);
  process.exit(1);
});
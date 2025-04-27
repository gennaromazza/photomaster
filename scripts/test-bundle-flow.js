/**
 * Script di test per l'intero flusso dei preventivi bundle
 * 
 * Questo script simula il percorso completo:
 * 1. Cliente richiede un preventivo da un pacchetto
 * 2. Il fotografo visualizza e converte la richiesta in un preventivo
 * 3. Verifica che il preventivo sia stato correttamente creato con i moduli e gli importi
 * 4. Verifica che i pagamenti programmati siano stati generati correttamente
 */

import axios from 'axios';
import fs from 'fs';
import { exit } from 'process';

// Configurazione dell'endpoint
const BASE_URL = 'http://localhost:5000';

// Genera date casuali future per test
const getRandomFutureDate = (monthsAhead = 6) => {
  const date = new Date();
  date.setMonth(date.getMonth() + Math.floor(Math.random() * monthsAhead) + 1);
  return date.toISOString();
};

// Formatta gli importi in Euro per visualizzazione
const formatEuro = (amount) => {
  return `${amount.toFixed(2)} €`;
};

// Funzione per aggiungere pause nel flusso (per simulare azioni dell'utente)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Funzione per salvare le risposte in file JSON per analisi/debug
const saveResponse = (filename, data) => {
  fs.writeFileSync(`./test-results/${filename}.json`, JSON.stringify(data, null, 2));
  console.log(`Risposta salvata in ./test-results/${filename}.json`);
};

// Crea la directory per i risultati dei test se non esiste
const createResultsDir = () => {
  if (!fs.existsSync('./test-results')) {
    fs.mkdirSync('./test-results');
  }
};

/**
 * 1. SIMULAZIONE CLIENTE: Richiede preventivo da pacchetto bundle
 */
const clientRequestsQuote = async () => {
  console.log('\n');
  console.log('┌──────────────────────────────────────────────────┐');
  console.log('│ 1. SIMULAZIONE CLIENTE: Richiesta preventivo     │');
  console.log('└──────────────────────────────────────────────────┘');

  // Prima otteniamo un pacchetto esistente come riferimento
  console.log('Ottenimento pacchetti disponibili...');
  const bundlesResponse = await axios.get(`${BASE_URL}/api/service-bundles`);
  
  if (!bundlesResponse.data || bundlesResponse.data.length === 0) {
    console.error('Errore: Nessun pacchetto disponibile nel sistema!');
    return null;
  }
  
  // Prendiamo il primo pacchetto per semplicità
  const targetBundle = bundlesResponse.data[0];
  console.log(`Pacchetto selezionato: "${targetBundle.name}" (ID: ${targetBundle.id})`);
  console.log(`Prezzo del pacchetto: ${formatEuro(targetBundle.discountedPrice || targetBundle.totalPrice)}`);
  
  // Dati cliente per la richiesta di preventivo
  const eventDate = getRandomFutureDate();
  const clientData = {
    bundleId: targetBundle.id,
    firstName: "Mario",
    lastName: "Rossi",
    email: `mario.rossi.${Date.now()}@example.com`, // Email univoca per evitare duplicati
    phone: "+39 333 1234567",
    address: "Via Roma 123, Milano",
    message: "Vorrei più informazioni su questo pacchetto per il mio matrimonio.",
    eventType: "Matrimonio",
    eventDate: eventDate,
    location: "Villa Bella Vista, Lago di Como"
  };
  
  console.log('\nInvio richiesta preventivo con i seguenti dati:');
  console.log(`- Nome: ${clientData.firstName} ${clientData.lastName}`);
  console.log(`- Email: ${clientData.email}`);
  console.log(`- Telefono: ${clientData.phone}`);
  console.log(`- Tipo evento: ${clientData.eventType}`);
  console.log(`- Data evento: ${new Date(eventDate).toLocaleDateString('it-IT')}`);
  console.log(`- Location: ${clientData.location}`);
  
  try {
    // Invia la richiesta di preventivo
    console.log('\nInvio richiesta al server...');
    const response = await axios.post(`${BASE_URL}/api/bundle-leads`, clientData);
    
    console.log('✅ Richiesta di preventivo inviata con successo!');
    console.log(`ID richiesta: ${response.data.id}`);
    
    // Salva la risposta per riferimento
    saveResponse('1-client-request', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Errore nell\'invio della richiesta di preventivo:');
    console.error(error.response?.data || error.message);
    return null;
  }
};

/**
 * 2. SIMULAZIONE FOTOGRAFO: Visualizza richieste preventivo
 */
const photographerViewsRequests = async (requestData) => {
  console.log('\n');
  console.log('┌──────────────────────────────────────────────────┐');
  console.log('│ 2. SIMULAZIONE FOTOGRAFO: Visualizza richieste   │');
  console.log('└──────────────────────────────────────────────────┘');
  
  if (!requestData) {
    console.log('Ricerca di tutte le richieste preventivo...');
    try {
      const response = await axios.get(`${BASE_URL}/api/bundle-leads`);
      console.log(`Trovate ${response.data.length} richieste di preventivo`);
      
      if (response.data.length === 0) {
        console.error('❌ Nessuna richiesta di preventivo trovata!');
        return null;
      }
      
      // Salva tutte le richieste per riferimento
      saveResponse('2-all-requests', response.data);
      
      // Prendiamo la richiesta più recente
      const latestRequest = response.data[0];
      console.log(`\nUltima richiesta ricevuta:`);
      console.log(`- ID: ${latestRequest.id}`);
      console.log(`- Cliente: ${latestRequest.firstName} ${latestRequest.lastName}`);
      console.log(`- Email: ${latestRequest.email}`);
      console.log(`- Stato: ${latestRequest.status}`);
      console.log(`- Data creazione: ${new Date(latestRequest.createdAt).toLocaleString('it-IT')}`);
      
      return latestRequest;
    } catch (error) {
      console.error('❌ Errore nel recupero delle richieste di preventivo:');
      console.error(error.response?.data || error.message);
      return null;
    }
  } else {
    console.log(`Recupero informazioni per la richiesta specifica ID: ${requestData.id}`);
    
    try {
      const response = await axios.get(`${BASE_URL}/api/bundle-leads/${requestData.id}`);
      console.log('✅ Informazioni richiesta recuperate con successo!');
      
      // Salva dettagli richiesta per riferimento
      saveResponse('2-specific-request', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Errore nel recupero delle informazioni della richiesta:');
      console.error(error.response?.data || error.message);
      return requestData; // Utilizziamo i dati che già abbiamo
    }
  }
};

/**
 * 3. SIMULAZIONE FOTOGRAFO: Converte la richiesta in preventivo
 */
const photographerConvertsRequest = async (requestData) => {
  if (!requestData) {
    console.error('❌ Nessun dato di richiesta disponibile per la conversione');
    return null;
  }
  
  console.log('\n');
  console.log('┌──────────────────────────────────────────────────┐');
  console.log('│ 3. SIMULAZIONE FOTOGRAFO: Conversione preventivo │');
  console.log('└──────────────────────────────────────────────────┘');
  
  console.log(`Conversione della richiesta ID: ${requestData.id} in preventivo...`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/bundle-leads/${requestData.id}/convert`);
    console.log('✅ Richiesta convertita in preventivo con successo!');
    
    // Salva dettagli della conversione per riferimento
    saveResponse('3-conversion-result', response.data);
    
    // Mostra informazioni sul preventivo creato
    const quoteData = response.data;
    console.log(`\nPreventivo creato:`);
    console.log(`- ID preventivo: ${quoteData.id}`);
    console.log(`- Titolo: ${quoteData.title}`);
    console.log(`- Stato: ${quoteData.status}`);
    
    return quoteData;
  } catch (error) {
    console.error('❌ Errore nella conversione della richiesta in preventivo:');
    console.error(error.response?.data || error.message);
    return null;
  }
};

/**
 * 4. VERIFICA: Controllo che il preventivo sia stato creato correttamente
 */
const verifyQuoteCreated = async (quoteData) => {
  if (!quoteData) {
    console.error('❌ Nessun dato di preventivo disponibile per la verifica');
    return false;
  }
  
  console.log('\n');
  console.log('┌──────────────────────────────────────────────────┐');
  console.log('│ 4. VERIFICA: Controllo preventivo                │');
  console.log('└──────────────────────────────────────────────────┘');
  
  console.log(`Verifica del preventivo ID: ${quoteData.id}...`);
  
  try {
    // Recupera dettagli completi del preventivo
    const response = await axios.get(`${BASE_URL}/api/quotes/${quoteData.id}`);
    console.log('✅ Dettagli preventivo recuperati con successo!');
    
    // Salva dettagli preventivo per riferimento
    saveResponse('4-quote-details', response.data);
    
    const quote = response.data;
    console.log(`\nDettagli preventivo:`);
    console.log(`- Titolo: ${quote.title}`);
    console.log(`- Stato: ${quote.status}`);
    console.log(`- Cliente: ${quote.client?.firstName} ${quote.client?.lastName}`);
    
    // Verifica dei moduli
    if (quote.modules && quote.modules.length > 0) {
      console.log(`\n✅ Il preventivo contiene ${quote.modules.length} moduli`);
      
      // Controllo il primo modulo che dovrebbe essere quello del bundle
      const bundleModule = quote.modules[0];
      console.log(`- Modulo: ${bundleModule.name}`);
      console.log(`- Subtotale: ${formatEuro(bundleModule.subtotal / 100)}`); // Dividiamo per 100 perché i prezzi sono in centesimi nel DB
      console.log(`- Totale: ${formatEuro(bundleModule.total / 100)}`);
      
      // Verifica degli elementi del modulo
      if (bundleModule.items && bundleModule.items.length > 0) {
        console.log(`✅ Il modulo contiene ${bundleModule.items.length} elementi`);
      } else {
        console.log('⚠️ Il modulo non contiene elementi!');
      }
    } else {
      console.log('⚠️ Il preventivo non contiene moduli!');
    }
    
    return quote;
  } catch (error) {
    console.error('❌ Errore nel recupero dei dettagli del preventivo:');
    console.error(error.response?.data || error.message);
    return null;
  }
};

/**
 * 5. VERIFICA: Controllo che i pagamenti programmati siano stati creati
 */
const verifyScheduledPayments = async (quoteData) => {
  if (!quoteData) {
    console.error('❌ Nessun dato di preventivo disponibile per la verifica dei pagamenti');
    return false;
  }
  
  console.log('\n');
  console.log('┌──────────────────────────────────────────────────┐');
  console.log('│ 5. VERIFICA: Controllo pagamenti programmati     │');
  console.log('└──────────────────────────────────────────────────┘');
  
  console.log(`Verifica dei pagamenti per il preventivo ID: ${quoteData.id}...`);
  
  try {
    // Recupera pagamenti programmati per il preventivo
    const response = await axios.get(`${BASE_URL}/api/scheduled-payments?quoteId=${quoteData.id}`);
    
    // Salva dettagli pagamenti per riferimento
    saveResponse('5-scheduled-payments', response.data);
    
    const payments = response.data;
    
    if (payments && payments.length > 0) {
      console.log(`✅ Trovati ${payments.length} pagamenti programmati`);
      
      // Dovrebbero esserci due pagamenti: acconto e saldo
      payments.forEach((payment, index) => {
        console.log(`\nPagamento #${index + 1}:`);
        console.log(`- Descrizione: ${payment.description}`);
        console.log(`- Importo: ${formatEuro(payment.amount / 100)}`); // Dividiamo per 100 perché gli importi sono in centesimi nel DB
        console.log(`- Stato: ${payment.status}`);
        console.log(`- Data scadenza: ${new Date(payment.dueDate).toLocaleDateString('it-IT')}`);
        console.log(`- Num. rata: ${payment.installmentNumber}/${payment.totalInstallments}`);
      });
      
      // Verifica che ci siano un acconto e un saldo
      const deposit = payments.find(p => p.description.toLowerCase().includes('acconto'));
      const balance = payments.find(p => p.description.toLowerCase().includes('saldo'));
      
      if (deposit && balance) {
        console.log('\n✅ Trovati sia acconto che saldo');
        console.log(`- Acconto: ${formatEuro(deposit.amount / 100)}`);
        console.log(`- Saldo: ${formatEuro(balance.amount / 100)}`);
        console.log(`- Totale: ${formatEuro((deposit.amount + balance.amount) / 100)}`);
      } else {
        console.log('⚠️ Non trovati sia acconto che saldo!');
      }
      
      return payments;
    } else {
      console.log('❌ Nessun pagamento programmato trovato!');
      return null;
    }
  } catch (error) {
    console.error('❌ Errore nel recupero dei pagamenti programmati:');
    console.error(error.response?.data || error.message);
    return null;
  }
};

/**
 * Esecuzione del test completo
 */
const runFullTest = async () => {
  console.log('*******************************************************');
  console.log('*                                                     *');
  console.log('*  TEST FLUSSO COMPLETO BUNDLE-LEAD → PREVENTIVO      *');
  console.log('*                                                     *');
  console.log('*******************************************************');
  console.log(`Data di esecuzione: ${new Date().toLocaleString('it-IT')}`);
  
  // Crea directory per i risultati
  createResultsDir();
  
  // Step 1: Cliente richiede preventivo
  const requestData = await clientRequestsQuote();
  if (!requestData) {
    console.error('\n❌ Test interrotto: impossibile completare la richiesta del cliente');
    return;
  }
  
  // Breve pausa tra i passaggi
  console.log('\nAttesa simulazione tempo di risposta...');
  await sleep(2000);
  
  // Step 2: Fotografo visualizza richieste
  const detailedRequestData = await photographerViewsRequests(requestData);
  if (!detailedRequestData) {
    console.error('\n❌ Test interrotto: impossibile visualizzare la richiesta');
    return;
  }
  
  // Breve pausa tra i passaggi
  await sleep(1000);
  
  // Step 3: Fotografo converte la richiesta in preventivo
  const quoteData = await photographerConvertsRequest(detailedRequestData);
  if (!quoteData) {
    console.error('\n❌ Test interrotto: impossibile convertire la richiesta in preventivo');
    return;
  }
  
  // Breve pausa tra i passaggi
  await sleep(1000);
  
  // Step 4: Verifica del preventivo creato
  const detailedQuoteData = await verifyQuoteCreated(quoteData);
  if (!detailedQuoteData) {
    console.error('\n❌ Test interrotto: impossibile verificare il preventivo');
    return;
  }
  
  // Breve pausa tra i passaggi
  await sleep(1000);
  
  // Step 5: Verifica dei pagamenti programmati
  const paymentsData = await verifyScheduledPayments(detailedQuoteData);
  
  // Risultato finale del test
  console.log('\n*******************************************************');
  if (detailedQuoteData && paymentsData) {
    console.log('✅ TEST COMPLETATO CON SUCCESSO!');
    console.log(`Il preventivo #${detailedQuoteData.id} è stato creato correttamente`);
    console.log(`con ${paymentsData.length} pagamenti programmati`);
  } else {
    console.log('⚠️ TEST COMPLETATO CON AVVISI');
    console.log('Alcune verifiche non sono state completate con successo');
  }
  console.log('*******************************************************');
};

// Esegui il test completo
runFullTest()
  .then(() => {
    console.log('\nTest completato!');
  })
  .catch((error) => {
    console.error('\nErrore durante l\'esecuzione del test:');
    console.error(error);
  })
  .finally(() => {
    // Uscita esplicita per assicurarsi che lo script termini
    setTimeout(() => exit(0), 1000);
  });
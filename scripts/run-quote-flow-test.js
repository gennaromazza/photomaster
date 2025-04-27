/**
 * Script di diagnosi semplificato del flusso preventivo-contratto-evento
 * 
 * Questo script analizza l'intero processo usando chiamate API dirette invece di browser automation
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';

// Ottieni dirname con ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurazione
const config = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
  apiPrefix: '/api',
  reportFile: path.join(__dirname, '../test-results/quote-flow-test-results.json'),
  outputDir: path.join(__dirname, '../test-results')
};

// Assicurati che le directory esistano
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// Inizializza il report
const report = {
  testName: 'Quote Flow Diagnostic',
  startTime: new Date().toISOString(),
  endTime: null,
  steps: [],
  errors: [],
  warnings: [],
  successRate: 0
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

// Funzione per chiamate API con promise
function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${config.baseUrl}${config.apiPrefix}${path}`);
    const isHttps = url.protocol === 'https:';
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };
    
    const req = (isHttps ? https : http).request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({
              status: res.statusCode,
              data: responseData ? JSON.parse(responseData) : null
            });
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Funzione per salvare il report
function saveReport() {
  report.endTime = new Date().toISOString();
  report.successRate = (report.steps.filter(s => s.status === 'success').length / report.steps.length) * 100;
  fs.writeFileSync(config.reportFile, JSON.stringify(report, null, 2));
  console.log(`\nReport salvato in: ${config.reportFile}`);
  console.log(`Success rate: ${report.successRate.toFixed(2)}%`);
  console.log(`Errori: ${report.errors.length}`);
  console.log(`Warning: ${report.warnings.length}`);
}

// Esegui i test
async function runTests() {
  try {
    // Test 1: Verifica struttura delle tabelle
    await testDatabaseStructure();
    
    // Test 2: Verifica flusso preventivo-contratto
    await testQuoteToContractFlow();
    
    // Test 3: Verifica integrazione con collaboratori
    await testCollaboratorsIntegration();
    
    // Test 4: Verifica sistema finanziario
    await testFinancialSystem();
    
  } catch (error) {
    addStep('Runtime Error', 'error', { 
      message: error.message,
      stack: error.stack
    });
  } finally {
    saveReport();
  }
}

/**
 * TEST 1: Verifica struttura delle tabelle e relazioni nel database
 */
async function testDatabaseStructure() {
  try {
    // Verifica esistenza tabelle principali
    let tables = [];
    
    try {
      // Usa l'endpoint debug se disponibile
      const result = await apiRequest('GET', '/debug/tables');
      tables = result.data || [];
    } catch (error) {
      // Fallback: imposta una lista di tabelle attese
      tables = [
        'quotes', 'quote_modules', 'quote_module_items', 'quote_items',
        'contracts', 'events', 'event_collaborators', 'eventiCollaboratori',
        'clients', 'collaborators', 'transactions', 'scheduled_payments'
      ];
      addStep('Check Tabelle Database', 'warning', {
        message: 'Impossibile ottenere le tabelle tramite API, usando lista predefinita'
      });
    }
    
    // Verifica relazioni tra tabelle (tramite API preventivi)
    try {
      const quotes = await apiRequest('GET', '/quotes');
      
      if (Array.isArray(quotes.data) && quotes.data.length > 0) {
        // Prendi un preventivo esistente per verificare le relazioni
        const quoteId = quotes.data[0].id;
        
        try {
          // Verifica dettagli preventivo e relazioni
          const quoteDetails = await apiRequest('GET', `/quotes/${quoteId}`);
          
          // Verifica la struttura del preventivo
          const hasModules = Array.isArray(quoteDetails.data.modules) && quoteDetails.data.modules.length > 0;
          const hasClient = quoteDetails.data.client && quoteDetails.data.client.id;
          const hasInstallments = Array.isArray(quoteDetails.data.installments);
          
          if (hasModules && hasClient && hasInstallments) {
            addStep('Verifica Relazioni Database', 'success', {
              message: 'Relazioni tra preventivo, moduli, cliente e rate correttamente configurate'
            });
          } else {
            let missing = [];
            if (!hasModules) missing.push('moduli');
            if (!hasClient) missing.push('client');
            if (!hasInstallments) missing.push('rate');
            
            addStep('Verifica Relazioni Database', 'warning', {
              message: `Relazioni incomplete: mancano ${missing.join(', ')}`
            });
          }
        } catch (error) {
          addStep('Verifica Relazioni Database', 'error', {
            message: `Errore nel recupero del preventivo: ${error.message}`
          });
        }
      } else {
        addStep('Verifica Relazioni Database', 'warning', {
          message: 'Nessun preventivo esistente per verificare le relazioni'
        });
      }
    } catch (error) {
      addStep('Verifica Relazioni Database', 'error', {
        message: `Errore nel recupero dei preventivi: ${error.message}`
      });
    }
    
  } catch (error) {
    addStep('Test Struttura Database', 'error', {
      message: `Errore durante il test: ${error.message}`
    });
  }
}

/**
 * TEST 2: Verifica flusso da preventivo a contratto e evento
 */
async function testQuoteToContractFlow() {
  try {
    // Verifica flusso creazione preventivo
    try {
      // Ottieni i clienti esistenti
      const clientsResponse = await apiRequest('GET', '/clients');
      let clientId;
      
      if (Array.isArray(clientsResponse.data) && clientsResponse.data.length > 0) {
        // Usa un cliente esistente
        clientId = clientsResponse.data[0].id;
        addStep('Selezione Cliente', 'success', {
          message: `Utilizzato cliente esistente ID: ${clientId}`
        });
      } else {
        // Crea un nuovo cliente
        const newClient = {
          firstName: 'Test',
          lastName: 'Cliente' + Date.now(),
          email: `test.cliente${Date.now()}@example.com`,
          phone: '3334445556',
          address: 'Via Test 123',
          city: 'Roma',
          postalCode: '00100'
        };
        
        try {
          const clientResponse = await apiRequest('POST', '/clients', newClient);
          clientId = clientResponse.data.id;
          addStep('Creazione Cliente', 'success', {
            message: `Nuovo cliente creato con ID: ${clientId}`
          });
        } catch (error) {
          addStep('Creazione Cliente', 'error', {
            message: `Errore nella creazione del cliente: ${error.message}`
          });
          throw error;
        }
      }
      
      // Crea un nuovo preventivo
      const newQuote = {
        title: `Test Preventivo ${Date.now()}`,
        description: 'Preventivo creato dal test automatico',
        clientId: clientId,
        eventType: 'wedding',
        eventDate: '2025-06-15',
        location: 'Villa Test, Roma',
        status: 'draft'
      };
      
      try {
        const quoteResponse = await apiRequest('POST', '/quotes', newQuote);
        const quoteId = quoteResponse.data.id;
        
        addStep('Creazione Preventivo', 'success', {
          message: `Preventivo creato con ID: ${quoteId}`
        });
        
        // Aggiungi un modulo fisso
        const fixedModule = {
          quoteId: quoteId,
          name: 'Pacchetto Base Test',
          type: 'fixed',
          price: 1500,
          items: [
            {
              name: 'Servizio fotografico',
              description: 'Servizio completo',
              quantity: 1,
              price: 800
            },
            {
              name: 'Album standard',
              description: 'Album 30 pagine',
              quantity: 1,
              price: 700
            }
          ]
        };
        
        try {
          const moduleResponse = await apiRequest('POST', `/quotes/${quoteId}/modules`, fixedModule);
          addStep('Aggiunta Modulo Fisso', 'success');
        } catch (error) {
          addStep('Aggiunta Modulo Fisso', 'error', {
            message: `Errore nell'aggiunta del modulo fisso: ${error.message}`
          });
        }
        
        // Verifica conversione in contratto (se possibile)
        try {
          // Prima controlla se ci sono API per modificare lo stato del preventivo
          const updateData = {
            status: 'signed'
          };
          
          await apiRequest('PATCH', `/quotes/${quoteId}`, updateData);
          addStep('Modifica Stato Preventivo', 'success', {
            message: 'Preventivo marcato come firmato'
          });
          
          // Verifica se il preventivo è stato convertito in contratto
          try {
            // Cerca contratti che contengono il titolo del preventivo
            const contractsResponse = await apiRequest('GET', '/contracts');
            
            if (Array.isArray(contractsResponse.data)) {
              const relatedContract = contractsResponse.data.find(c => 
                c.title && c.title.includes('Test Preventivo')
              );
              
              if (relatedContract) {
                addStep('Conversione in Contratto', 'success', {
                  message: `Preventivo convertito in contratto con ID: ${relatedContract.id}`
                });
                
                // Verifica creazione evento
                try {
                  const eventsResponse = await apiRequest('GET', '/events');
                  
                  if (Array.isArray(eventsResponse.data)) {
                    const relatedEvent = eventsResponse.data.find(e => 
                      e.title && e.title.includes('Test Preventivo')
                    );
                    
                    if (relatedEvent) {
                      addStep('Creazione Evento', 'success', {
                        message: `Contratto convertito in evento con ID: ${relatedEvent.id}`
                      });
                    } else {
                      addStep('Creazione Evento', 'warning', {
                        message: 'Evento non trovato o non creato automaticamente'
                      });
                    }
                  }
                } catch (error) {
                  addStep('Verifica Evento', 'error', {
                    message: `Errore nella verifica dell'evento: ${error.message}`
                  });
                }
              } else {
                addStep('Conversione in Contratto', 'warning', {
                  message: 'Contratto non trovato o non creato automaticamente'
                });
              }
            }
          } catch (error) {
            addStep('Verifica Contratto', 'error', {
              message: `Errore nella verifica del contratto: ${error.message}`
            });
          }
        } catch (error) {
          addStep('Modifica Stato Preventivo', 'warning', {
            message: `Non è possibile modificare lo stato del preventivo tramite API: ${error.message}`
          });
        }
        
      } catch (error) {
        addStep('Creazione Preventivo', 'error', {
          message: `Errore nella creazione del preventivo: ${error.message}`
        });
      }
    } catch (error) {
      addStep('Test Flusso Preventivo', 'error', {
        message: `Errore durante il test: ${error.message}`
      });
    }
  } catch (error) {
    addStep('Test Flusso Preventivo-Contratto', 'error', {
      message: `Errore fatale: ${error.message}`
    });
  }
}

/**
 * TEST 3: Verifica integrazione con collaboratori
 */
async function testCollaboratorsIntegration() {
  try {
    // Verifica collaboratori disponibili
    const collaboratorsResponse = await apiRequest('GET', '/collaborators');
    
    if (Array.isArray(collaboratorsResponse.data) && collaboratorsResponse.data.length > 0) {
      addStep('Verifica Collaboratori', 'success', {
        message: `Trovati ${collaboratorsResponse.data.length} collaboratori nel sistema`
      });
      
      // Verifica assegnazione collaboratori agli eventi
      const eventsResponse = await apiRequest('GET', '/events');
      
      if (Array.isArray(eventsResponse.data) && eventsResponse.data.length > 0) {
        const eventId = eventsResponse.data[0].id;
        
        try {
          // Verifica dettagli evento
          const eventDetailsResponse = await apiRequest('GET', `/events/${eventId}`);
          
          // Controlla se l'evento ha collaboratori assegnati
          const hasCollaborators = eventDetailsResponse.data && 
                                  Array.isArray(eventDetailsResponse.data.collaborators) && 
                                  eventDetailsResponse.data.collaborators.length > 0;
          
          if (hasCollaborators) {
            addStep('Verifica Collaboratori Evento', 'success', {
              message: `Evento ID ${eventId} ha ${eventDetailsResponse.data.collaborators.length} collaboratori assegnati`
            });
          } else {
            // Prova ad assegnare un collaboratore all'evento
            const collaboratorId = collaboratorsResponse.data[0].id;
            
            try {
              const assignData = {
                collaboratorId: collaboratorId,
                eventId: eventId,
                role: 'fotografo'
              };
              
              // Prova con diverse API possibili
              try {
                await apiRequest('POST', `/events/${eventId}/collaborators`, assignData);
                addStep('Assegnazione Collaboratore', 'success');
              } catch (error1) {
                try {
                  await apiRequest('POST', `/collaborators/${collaboratorId}/events`, { eventoId: eventId, ruolo: 'fotografo' });
                  addStep('Assegnazione Collaboratore', 'success');
                } catch (error2) {
                  try {
                    await apiRequest('POST', `/collaboratori/${collaboratorId}/eventi`, { eventoId: eventId, ruolo: 'fotografo' });
                    addStep('Assegnazione Collaboratore', 'success');
                  } catch (error3) {
                    addStep('Assegnazione Collaboratore', 'error', {
                      message: 'Impossibile assegnare collaboratori tramite API'
                    });
                  }
                }
              }
            } catch (error) {
              addStep('Assegnazione Collaboratore', 'error', {
                message: `Errore nell'assegnazione: ${error.message}`
              });
            }
          }
          
          // Verifica eventi del collaboratore
          const collaboratorId = collaboratorsResponse.data[0].id;
          
          try {
            // Prova diverse possibili API
            let collaboratorEvents = [];
            
            try {
              const response = await apiRequest('GET', `/collaborators/${collaboratorId}/events`);
              collaboratorEvents = response.data || [];
            } catch (error1) {
              try {
                const response = await apiRequest('GET', `/collaboratori/${collaboratorId}/eventi`);
                collaboratorEvents = response.data || [];
              } catch (error2) {
                addStep('Verifica Eventi Collaboratore', 'warning', {
                  message: 'Impossibile recuperare gli eventi del collaboratore tramite API'
                });
              }
            }
            
            if (collaboratorEvents.length > 0) {
              addStep('Verifica Eventi Collaboratore', 'success', {
                message: `Collaboratore ID ${collaboratorId} ha ${collaboratorEvents.length} eventi assegnati`
              });
            } else {
              addStep('Verifica Eventi Collaboratore', 'warning', {
                message: `Collaboratore ID ${collaboratorId} non ha eventi assegnati`
              });
            }
          } catch (error) {
            addStep('Verifica Eventi Collaboratore', 'error', {
              message: `Errore nella verifica: ${error.message}`
            });
          }
        } catch (error) {
          addStep('Verifica Dettagli Evento', 'error', {
            message: `Errore nel recupero dei dettagli evento: ${error.message}`
          });
        }
      } else {
        addStep('Verifica Eventi', 'warning', {
          message: 'Nessun evento trovato per testare l\'assegnazione di collaboratori'
        });
      }
    } else {
      addStep('Verifica Collaboratori', 'warning', {
        message: 'Nessun collaboratore trovato nel sistema'
      });
    }
  } catch (error) {
    addStep('Test Integrazione Collaboratori', 'error', {
      message: `Errore durante il test: ${error.message}`
    });
  }
}

/**
 * TEST 4: Verifica sistema finanziario
 */
async function testFinancialSystem() {
  try {
    // Verifica struttura finanziaria nei preventivi
    try {
      const quotes = await apiRequest('GET', '/quotes');
      
      if (Array.isArray(quotes.data) && quotes.data.length > 0) {
        const quoteId = quotes.data[0].id;
        
        try {
          const quoteDetails = await apiRequest('GET', `/quotes/${quoteId}`);
          
          // Verifica campi finanziari
          const hasSubtotal = typeof quoteDetails.data.subtotal === 'number' || 
                             typeof quoteDetails.data.subtotal === 'string';
          const hasTotal = typeof quoteDetails.data.total === 'number' || 
                          typeof quoteDetails.data.total === 'string';
          const hasDiscount = typeof quoteDetails.data.discount === 'number' || 
                             typeof quoteDetails.data.discount === 'string';
          
          if (hasSubtotal && hasTotal) {
            addStep('Verifica Campi Finanziari Preventivo', 'success');
          } else {
            let missing = [];
            if (!hasSubtotal) missing.push('subtotal');
            if (!hasTotal) missing.push('total');
            if (!hasDiscount) missing.push('discount');
            
            addStep('Verifica Campi Finanziari Preventivo', 'warning', {
              message: `Campi finanziari mancanti: ${missing.join(', ')}`
            });
          }
          
          // Verifica rate di pagamento
          const hasInstallments = Array.isArray(quoteDetails.data.installments);
          
          if (hasInstallments) {
            addStep('Verifica Rate Pagamento', 'success', {
              message: `Preventivo ha ${quoteDetails.data.installments.length} rate configurate`
            });
          } else {
            addStep('Verifica Rate Pagamento', 'warning', {
              message: 'Nessuna rata di pagamento configurata'
            });
          }
        } catch (error) {
          addStep('Verifica Dettagli Finanziari Preventivo', 'error', {
            message: `Errore nel recupero dei dettagli: ${error.message}`
          });
        }
      } else {
        addStep('Verifica Preventivi', 'warning', {
          message: 'Nessun preventivo trovato per testare i dettagli finanziari'
        });
      }
    } catch (error) {
      addStep('Verifica Preventivi', 'error', {
        message: `Errore nel recupero dei preventivi: ${error.message}`
      });
    }
    
    // Verifica sistema transazioni
    try {
      try {
        const transactionsResponse = await apiRequest('GET', '/transactions');
        
        if (Array.isArray(transactionsResponse.data)) {
          addStep('Verifica Transazioni', 'success', {
            message: `Sistema ha ${transactionsResponse.data.length} transazioni registrate`
          });
        } else {
          addStep('Verifica Transazioni', 'warning', {
            message: 'Nessuna transazione trovata o API non restituisce array'
          });
        }
      } catch (error) {
        addStep('Verifica Transazioni', 'warning', {
          message: `Impossibile accedere alle transazioni: ${error.message}`
        });
      }
      
      // Verifica pagamenti programmati
      try {
        const paymentsResponse = await apiRequest('GET', '/scheduled-payments');
        
        if (Array.isArray(paymentsResponse.data)) {
          addStep('Verifica Pagamenti Programmati', 'success', {
            message: `Sistema ha ${paymentsResponse.data.length} pagamenti programmati`
          });
        } else {
          addStep('Verifica Pagamenti Programmati', 'warning', {
            message: 'Nessun pagamento programmato trovato o API non restituisce array'
          });
        }
      } catch (error) {
        addStep('Verifica Pagamenti Programmati', 'warning', {
          message: `Impossibile accedere ai pagamenti programmati: ${error.message}`
        });
      }
    } catch (error) {
      addStep('Verifica Sistema Transazioni', 'error', {
        message: `Errore durante la verifica: ${error.message}`
      });
    }
    
    // Verifica coerenza pagamenti collaboratori
    try {
      const collaboratorsResponse = await apiRequest('GET', '/collaborators');
      
      if (Array.isArray(collaboratorsResponse.data) && collaboratorsResponse.data.length > 0) {
        const collaboratorId = collaboratorsResponse.data[0].id;
        
        try {
          let collaboratorPayments = [];
          
          try {
            const response = await apiRequest('GET', `/collaboratori/${collaboratorId}/pagamenti`);
            collaboratorPayments = response.data || [];
          } catch (error1) {
            try {
              const response = await apiRequest('GET', `/collaborators/${collaboratorId}/payments`);
              collaboratorPayments = response.data || [];
            } catch (error2) {
              addStep('Verifica Pagamenti Collaboratore', 'warning', {
                message: 'Impossibile recuperare i pagamenti del collaboratore tramite API'
              });
            }
          }
          
          if (collaboratorPayments.length > 0) {
            addStep('Verifica Pagamenti Collaboratore', 'success', {
              message: `Collaboratore ID ${collaboratorId} ha ${collaboratorPayments.length} pagamenti registrati`
            });
          } else {
            addStep('Verifica Pagamenti Collaboratore', 'warning', {
              message: `Collaboratore ID ${collaboratorId} non ha pagamenti registrati`
            });
          }
        } catch (error) {
          addStep('Verifica Pagamenti Collaboratore', 'error', {
            message: `Errore nella verifica: ${error.message}`
          });
        }
      }
    } catch (error) {
      addStep('Verifica Pagamenti Collaboratori', 'error', {
        message: `Errore durante la verifica: ${error.message}`
      });
    }
  } catch (error) {
    addStep('Test Sistema Finanziario', 'error', {
      message: `Errore fatale: ${error.message}`
    });
  }
}

// Avvia i test
console.log('Avvio test del flusso preventivo-contratto-evento...\n');
runTests();
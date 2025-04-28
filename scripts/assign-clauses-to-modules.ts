/**
 * Script per l'assegnazione delle clausole contrattuali ai moduli dei preventivi
 * 
 * Questo script recupera le clausole contrattuali disponibili per il tipo di evento
 * associato a ciascun preventivo e le assegna ai moduli corrispondenti.
 */

import { db } from "../server/db";
import {
  quotes,
  quoteModules,
  contractClauses,
  eq,
  and,
  isNull,
  not
} from "../shared/schema";

async function main() {
  console.log("🔄 Avvio assegnazione clausole contrattuali ai moduli...");
  
  // 1. Recupera tutti i preventivi
  const allQuotes = await db.query.quotes.findMany();
  console.log(`Trovati ${allQuotes.length} preventivi`);
  
  let modulesUpdated = 0;
  let quoteProcessed = 0;
  
  // 2. Per ogni preventivo, recupera i moduli e le clausole applicabili
  for (const quote of allQuotes) {
    try {
      console.log(`\nElaborazione preventivo ID ${quote.id}: ${quote.title}`);
      quoteProcessed++;
      
      // Ottieni i moduli del preventivo
      const modules = await db.query.quoteModules.findMany({
        where: eq(quoteModules.quoteId, quote.id)
      });
      
      if (!modules || modules.length === 0) {
        console.log(`- Nessun modulo trovato per il preventivo ID ${quote.id}`);
        continue;
      }
      
      console.log(`- Trovati ${modules.length} moduli`);
      
      // Trova le clausole applicabili in base al tipo di evento
      const eventType = quote.eventType || null;
      let applicableClauses = [];
      
      // Costruiamo condizioni per trovare clausole appropriate
      let clauseConditions = [];
      
      // 1. Clausole generiche (senza tipo evento o categoria)
      clauseConditions.push(
        and(
          isNull(contractClauses.eventType),
          isNull(contractClauses.categoryId)
        )
      );
      
      // 2. Clausole specifiche per il tipo di evento
      if (eventType) {
        clauseConditions.push(
          and(
            eq(contractClauses.eventType, eventType),
            isNull(contractClauses.categoryId)
          )
        );
        
        // 3. Clausole specifiche per categoria e tipo evento
        if (quote.categoryId) {
          clauseConditions.push(
            and(
              eq(contractClauses.eventType, eventType),
              eq(contractClauses.categoryId, quote.categoryId)
            )
          );
        }
      }
      
      // 4. Clausole specifiche solo per categoria
      if (quote.categoryId) {
        clauseConditions.push(
          and(
            eq(contractClauses.categoryId, quote.categoryId),
            isNull(contractClauses.eventType)
          )
        );
      }
      
      // Recupera tutte le clausole applicabili
      for (const condition of clauseConditions) {
        const clauses = await db.query.contractClauses.findMany({
          where: and(
            condition,
            eq(contractClauses.isActive, true)
          )
        });
        
        if (clauses && clauses.length > 0) {
          applicableClauses = [...applicableClauses, ...clauses];
        }
      }
      
      // Rimuovi duplicati basati sull'ID della clausola
      applicableClauses = applicableClauses.filter((clause, index, self) =>
        index === self.findIndex((c) => c.id === clause.id)
      );
      
      console.log(`- Trovate ${applicableClauses.length} clausole applicabili`);
      
      if (applicableClauses.length === 0) {
        console.log("- Nessuna clausola applicabile trovata, salto al prossimo preventivo");
        continue;
      }
      
      // Prepara i dati delle clausole da salvare nei moduli
      const clausesData = applicableClauses.map(clause => ({
        id: clause.id,
        title: clause.title,
        content: clause.content,
        isRequired: clause.isRequired
      }));
      
      // Aggiorna tutti i moduli del preventivo con le clausole
      for (const module of modules) {
        await db.update(quoteModules)
          .set({
            clauses: clausesData
          })
          .where(eq(quoteModules.id, module.id));
          
        console.log(`- Aggiornato modulo ID ${module.id} con ${clausesData.length} clausole`);
        modulesUpdated++;
      }
    } catch (error) {
      console.error(`Errore durante l'elaborazione del preventivo ID ${quote.id}:`, error);
    }
  }
  
  console.log("\n✅ Assegnazione clausole completata!");
  console.log(`- Preventivi elaborati: ${quoteProcessed}`);
  console.log(`- Moduli aggiornati: ${modulesUpdated}`);
}

// Esegui la funzione principale
main()
  .catch(err => {
    console.error("Errore durante l'esecuzione dello script:", err);
    process.exit(1);
  })
  .finally(async () => {
    // Chiudi la connessione al database
    await db.pool.end();
    console.log("Connessione al database chiusa.");
  });
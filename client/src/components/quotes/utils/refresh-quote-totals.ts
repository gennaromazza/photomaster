/**
 * Classe per il ricalcolo dei totali di un preventivo
 * Gestisce la logica di aggiornamento dei totali in modo isolato e riutilizzabile
 */
export default class RefreshQuoteTotals {
  /**
   * Ricalcola i totali di un preventivo basandosi sui suoi moduli
   * @param quoteId - ID del preventivo da aggiornare
   * @returns Promise che si risolve quando l'aggiornamento è completo
   */
  async execute(quoteId: number): Promise<void> {
    try {
      console.log("Ricalcolo totali preventivo...");
      
      // 1. Recupera tutti i moduli del preventivo
      const modulesResponse = await fetch(`/api/quotes/${quoteId}/modules`);
      if (!modulesResponse.ok) {
        throw new Error(`Errore nel recupero dei moduli: ${modulesResponse.statusText}`);
      }
      
      const modules = await modulesResponse.json();
      
      // 2. Calcola i totali
      let subtotal = 0;
      let total = 0;
      
      // Somma tutti i totali dei moduli
      modules.forEach((module: any) => {
        if (typeof module.subtotal === 'number') {
          subtotal += module.subtotal;
        }
        
        if (typeof module.total === 'number') {
          total += module.total;
        }
      });
      
      console.log(`Nuovi totali calcolati - Subtotale: ${subtotal}, Totale: ${total}`);
      
      // 3. Aggiorna il preventivo con i nuovi totali
      const updateResponse = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subtotal,
          total,
        }),
      });
      
      if (!updateResponse.ok) {
        throw new Error(`Errore nell'aggiornamento dei totali: ${updateResponse.statusText}`);
      }
      
      console.log("[LOG] Aggiornamento totali preventivo - subtotal: " + subtotal + ", total: " + total);
      
      return;
    } catch (error) {
      console.error("Errore durante il ricalcolo dei totali:", error);
      throw error;
    }
  }
}
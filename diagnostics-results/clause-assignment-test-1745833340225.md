# Report Test Assegnazione Clausole
Data: 4/28/2025, 9:42:20 AM

## Riepilogo
- **Contratto**: ID 999
- **Preventivo**: ID 54
- **Totale test**: 10
- **Test passati**: 6 (60%)
- **Test falliti**: 4 (40%)
- **Avvisi**: 0 (0%)

## Test Contratto

✅ **Esistenza contratto**: Contratto ID 999 trovato

✅ **Associazione a preventivo**: Il contratto è associato al preventivo ID 54

✅ **Presenza clausole**: Il contratto ha 3 clausole

✅ **Validità clausole**: Tutte le clausole sono valide e hanno i campi necessari

## Test Moduli

### Modulo "1" (ID: 77)

❌ **Presenza clausole**: Il modulo non ha un array 'clauses' definito nell'API

### Modulo "Test Module 1745828862890" (ID: 93)

❌ **Presenza clausole**: Il modulo non ha un array 'clauses' definito nell'API

## Test Frontend

### Pagina pubblica preventivo (Token: a360a981052b4bc4f1517df4c4b5364d)

✅ **Recupero pagina pubblica**: Pagina pubblica del preventivo recuperata con successo

✅ **Presenza moduli in frontend**: La pagina pubblica ha 2 moduli

❌ **Presenza clausole in frontend**: La pagina pubblica non ha l'oggetto 'contractClauses'

❌ **Associazione clausole ai moduli in frontend**: Nessun modulo nella pagina pubblica ha clausole associate


# Test Assegnazione Clausole

Data: 4/28/2025, 8:36:41 AM

## Informazioni Generali

- **Contratto ID**: 999
- **Preventivo ID**: 54

## Riepilogo

- **Test Totali**: 6
- **Test Passati**: 2 (33%)
- **Test Falliti**: 4 (67%)
- **Avvisi**: 0 (0%)

## Test Moduli

### Modulo: 1 (ID: 77)

| Test | Stato | Dettagli |
|------|-------|----------|
| Presenza clausole | ❌ | Il modulo non ha un array 'clauses' definito nell'API |

### Modulo: Test Module 1745828862890 (ID: 93)

| Test | Stato | Dettagli |
|------|-------|----------|
| Presenza clausole | ❌ | Il modulo non ha un array 'clauses' definito nell'API |

## Test Frontend

### Pagina Pubblica (Token: a360a981052b4bc4f1517df4c4b5364d)

| Test | Stato | Dettagli |
|------|-------|----------|
| Recupero pagina pubblica | ✅ | Pagina pubblica del preventivo recuperata con successo |
| Presenza moduli in frontend | ✅ | La pagina pubblica ha 2 moduli |
| Presenza clausole in frontend | ❌ | La pagina pubblica non ha l'oggetto 'contractClauses' |
| Associazione clausole ai moduli in frontend | ❌ | Nessun modulo nella pagina pubblica ha clausole associate |

## Conclusioni

❌ **Sono stati rilevati 4 test falliti.** Si consiglia di rivedere il sistema di assegnazione clausole.

### Problemi Rilevati

#### Problemi nei Moduli

- **1 (ID: 77)**: Presenza clausole - Il modulo non ha un array 'clauses' definito nell'API
- **Test Module 1745828862890 (ID: 93)**: Presenza clausole - Il modulo non ha un array 'clauses' definito nell'API

#### Problemi nel Frontend

- **Pagina Pubblica (Token: a360a981052b4bc4f1517df4c4b5364d)**: Presenza clausole in frontend - La pagina pubblica non ha l'oggetto 'contractClauses'
- **Pagina Pubblica (Token: a360a981052b4bc4f1517df4c4b5364d)**: Associazione clausole ai moduli in frontend - Nessun modulo nella pagina pubblica ha clausole associate

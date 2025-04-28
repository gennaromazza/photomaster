# Test Assegnazione Automatica Clausole ai Moduli

Data: 4/28/2025, 10:52:41 AM

## Riepilogo

- **Test completati**: 1
- **Test riusciti**: 1
- **Test falliti**: 0

## Dettagli dei Test

### Assegnazione Clausole Preventivo Matrimonio

**Risultato**: ✅ Successo

**Messaggio**: Le clausole sono state assegnate correttamente ai moduli del preventivo

**Dettagli**:
```json
{
  "quoteId": 82,
  "eventType": "Matrimonio",
  "clausesExpected": 1,
  "fixedModuleClausesCount": 1,
  "variableModuleClausesCount": 1,
  "apiResponse": {
    "message": "Clausole assegnate con successo",
    "quoteId": 82,
    "clausesCount": 1,
    "modulesUpdated": 2
  }
}
```

---


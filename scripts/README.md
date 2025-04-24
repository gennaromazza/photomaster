# StudioMaster API Analyzer

Questo strumento analizza il codice del progetto StudioMaster/Photomaster per identificare le incongruenze tra frontend e backend, con particolare attenzione alle API e alle differenze tra endpoint italiani e inglesi durante la fase di standardizzazione.

## Funzionalità

Il sistema analizza:

1. **Endpoint API**: Identifica tutti gli endpoint API definiti nel backend e utilizzati nel frontend
2. **Metodi HTTP**: Registra i metodi (GET, POST, PUT, DELETE) supportati per ogni endpoint
3. **Controller**: Mappa gli endpoint ai rispettivi controller/handler
4. **Utilizzo nel Frontend**: Traccia dove vengono utilizzati gli endpoint nelle applicazioni frontend
5. **Mappature di Traduzione**: Identifica le corrispondenze tra endpoint italiani e inglesi

## Report delle Incongruenze

Lo strumento produce report dettagliati con le seguenti categorie di incongruenze:

- **Endpoint non utilizzati**: Endpoint definiti nel backend ma non utilizzati nel frontend
- **Endpoint non definiti**: Endpoint utilizzati nel frontend ma non definiti nel backend
- **Conflitti italiano-inglese**: Endpoint con versioni sia in italiano che in inglese definiti nel backend

## Utilizzo

```bash
# Eseguire l'analisi completa e generare il report
./scripts/run_analysis.sh

# Eseguire direttamente lo script Python con opzioni personalizzate
python3 scripts/analyze_api_usage.py --root . --output api_analysis_custom.json
```

## Output

Lo strumento genera due tipi di report:

1. **Report JSON** (`api_analysis_report.json`): Contiene tutti i dati completi dell'analisi in formato strutturato
2. **Report Markdown** (`api_analysis_report.md`): Report di sintesi più leggibile con tabelle formattate

## Struttura del Report JSON

Il report contiene le seguenti sezioni principali:

```json
{
  "endpoints": {
    "/api/endpoint": {
      "path": "/api/endpoint",
      "methods": ["GET", "POST"],
      "handlers": ["controllerFunction"],
      "backend_files": {"file.ts": [line_numbers]},
      "frontend_uses": {"component.tsx": [line_numbers]},
      "translation_mapping": {"/api/italiano": "/api/english"}
    }
  },
  "translation_mappings": {"/api/italiano": "/api/english"},
  "inconsistencies": {
    "unused_endpoints": ["/api/unused"],
    "undefined_endpoints": ["/api/undefined"],
    "italian_english_conflicts": ["/api/italiano <-> /api/english"]
  },
  "stats": {
    "total_endpoints": 150,
    "backend_defined": 120,
    "frontend_used": 100,
    "unused_endpoints": 20,
    "undefined_endpoints": 30,
    "italian_english_conflicts": 15
  }
}
```

## Requisiti

- Python 3.6+
- Bash (per lo script di esecuzione)
- jq (opzionale, per la visualizzazione delle statistiche)
#!/bin/bash

# Colori per l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== StudioMaster API Analysis ===${NC}"
echo -e "${CYAN}Questo script analizzerà le API del progetto per trovare incongruenze tra frontend e backend${NC}"
echo -e "${YELLOW}Inizializzazione...${NC}"

# Assicurati che la directory scripts esista
mkdir -p scripts

# Assicurati che lo script python abbia i permessi di esecuzione
chmod +x scripts/analyze_api_usage.py

# Verifica l'installazione di Python
if ! command -v python3 &> /dev/null
then
    echo -e "${RED}Python3 non trovato. Installazione necessaria.${NC}"
    exit 1
fi

# Path al file di output
OUTPUT_DIR="scripts/analysis_output"
mkdir -p $OUTPUT_DIR
OUTPUT_FILE="$OUTPUT_DIR/api_analysis_report.json"
OUTPUT_MD="$OUTPUT_DIR/api_analysis_report.md"

echo -e "${GREEN}Esecuzione dell'analisi...${NC}"
python3 scripts/analyze_api_usage.py --root . --output $OUTPUT_FILE

# Verifica se l'analisi è stata completata con successo
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Analisi completata con successo!${NC}"
    echo -e "${CYAN}Report JSON salvato in: ${NC}$OUTPUT_FILE"
    echo -e "${CYAN}Report Markdown salvato in: ${NC}$OUTPUT_MD"
    
    # Mostra un riassunto delle statistiche dal file JSON
    echo -e "${YELLOW}Caricamento statistiche...${NC}"
    TOTAL_ENDPOINTS=$(jq '.stats.total_endpoints' "$OUTPUT_FILE")
    BACKEND_DEFINED=$(jq '.stats.backend_defined' "$OUTPUT_FILE")
    FRONTEND_USED=$(jq '.stats.frontend_used' "$OUTPUT_FILE")
    UNUSED=$(jq '.stats.unused_endpoints' "$OUTPUT_FILE")
    UNDEFINED=$(jq '.stats.undefined_endpoints' "$OUTPUT_FILE")
    CONFLICTS=$(jq '.stats.italian_english_conflicts' "$OUTPUT_FILE")
    
    echo -e "${BLUE}Statistiche Principali:${NC}"
    echo -e "  - Endpoint totali: ${GREEN}$TOTAL_ENDPOINTS${NC}"
    echo -e "  - Definiti nel backend: ${GREEN}$BACKEND_DEFINED${NC}"
    echo -e "  - Utilizzati nel frontend: ${GREEN}$FRONTEND_USED${NC}"
    echo -e "  - Endpoint non utilizzati: ${YELLOW}$UNUSED${NC}"
    echo -e "  - Endpoint non definiti: ${RED}$UNDEFINED${NC}"
    echo -e "  - Conflitti italiano-inglese: ${YELLOW}$CONFLICTS${NC}"
    
    echo -e "\n${CYAN}Per visualizzare il report completo, apri il file ${OUTPUT_MD}${NC}"
    
    # Opzionalmente, apri il report Markdown (se disponibile su sistemi desktop)
    if command -v code &> /dev/null; then
        echo -e "${YELLOW}Apertura report in editor...${NC}"
        code "$OUTPUT_MD"
    fi
else
    echo -e "${RED}Analisi fallita. Controlla gli errori sopra.${NC}"
fi
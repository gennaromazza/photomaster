#!/bin/bash

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}===============================================${NC}"
echo -e "${CYAN}= Test Sistema Collaboratori                  =${NC}"
echo -e "${CYAN}===============================================${NC}"
echo -e "${YELLOW}Inizializzazione test...${NC}"

# Verifica che il server sia in esecuzione
if ! curl -s http://localhost:5000/api/user > /dev/null; then
  echo -e "${RED}ERRORE: Server non raggiungibile su http://localhost:5000${NC}"
  echo -e "${YELLOW}Assicurati che il server sia avviato prima di eseguire il test.${NC}"
  exit 1
fi

echo -e "${GREEN}Server raggiungibile. Avvio test...${NC}"

# Esegui lo script di test
echo -e "${YELLOW}Esecuzione script test-collaboratori-system.js...${NC}"

# Verifica se Node.js è disponibile
if command -v node &> /dev/null; then
  node scripts/test-collaboratori-system.js
else
  echo -e "${RED}ERRORE: Node.js non trovato. Installalo per eseguire il test.${NC}"
  exit 1
fi

echo -e "${CYAN}===============================================${NC}"
echo -e "${CYAN}= Test completato                            =${NC}"
echo -e "${CYAN}===============================================${NC}"
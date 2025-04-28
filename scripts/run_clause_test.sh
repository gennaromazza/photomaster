#!/bin/bash

# Script per eseguire il test migliorato di assegnazione clausole

echo "🔍 Avvio test migliorato di assegnazione clausole..."
echo ""

# Imposta variabile d'ambiente per la CSRF protection in testing mode
export CSRF_TEST_MODE=true

# Esegui lo script con tsx che supporta sia JS che TS
NODE_OPTIONS="--max-old-space-size=4096" npx tsx ./scripts/test_improved_clause_assignment.ts

# Ripristina l'ambiente
unset CSRF_TEST_MODE

echo ""
echo "Test di assegnazione clausole completato!"
#!/bin/bash

# Script per eseguire solo il test di consistenza dati dei moduli

echo "🔍 Avvio test di consistenza dati dei moduli fissi e variabili..."
echo ""

# Imposta variabile d'ambiente per la CSRF protection in testing mode
export CSRF_TEST_MODE=true

# Esegui lo script di diagnostica con tsx che supporta sia JS che TS
NODE_OPTIONS="--max-old-space-size=4096" npx tsx ./scripts/module-consistency-test.ts

# Ripristina l'ambiente
unset CSRF_TEST_MODE

echo ""
echo "Test di consistenza completato!"
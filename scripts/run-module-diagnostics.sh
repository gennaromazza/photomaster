#!/bin/bash

# Script per eseguire la diagnostica del sistema moduli

echo "🔍 Avvio diagnostica del sistema moduli fissi e variabili..."
echo ""

# Imposta variabile d'ambiente per la CSRF protection in testing mode
export CSRF_TEST_MODE=true

# Esegui lo script di diagnostica
node scripts/test-module-system.js

# Ripristina l'ambiente
unset CSRF_TEST_MODE

echo ""
echo "Diagnostica completata!"
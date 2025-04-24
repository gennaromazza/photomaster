#!/usr/bin/env python3
"""
Script di esempio per dimostrare l'utilizzo di analyze_api_usage.py
Questo script mostra come utilizzare programmaticamente l'analizzatore API
per estrarre informazioni specifiche o personalizzare l'output.
"""

import json
import os
import sys
from analyze_api_usage import ApiAnalyzer

def print_separator():
    print("-" * 80)

def main():
    print("StudioMaster API Analyzer - Example Usage")
    print_separator()
    
    # Inizializza l'analizzatore sul progetto corrente
    root_dir = ".."  # Va nella directory principale del progetto
    analyzer = ApiAnalyzer(root_dir)
    
    # Esegui l'analisi
    print("Analyzing API endpoints...")
    analyzer.analyze()
    print_separator()
    
    # Trova solo endpoints specifici (ad esempio quelli relativi ai collaboratori)
    collaborators_endpoints = {}
    for path, endpoint in analyzer.api_endpoints.items():
        if "collaborator" in path or "collaboratori" in path:
            collaborators_endpoints[path] = endpoint
    
    print(f"Found {len(collaborators_endpoints)} collaborator-related endpoints:")
    for path in sorted(collaborators_endpoints.keys()):
        methods = ", ".join(collaborators_endpoints[path].methods) if collaborators_endpoints[path].methods else "N/A"
        print(f"  - {path} [{methods}]")
    print_separator()
    
    # Trova conflitti tra endpoints italiani e inglesi
    italian_endpoints = {}
    english_endpoints = {}
    
    for path, endpoint in analyzer.api_endpoints.items():
        # Italiano: contiene 'collaboratori', 'eventi', 'pagamenti', ecc.
        if any(italian in path for italian in ['collaboratori', 'eventi', 'pagamenti', 'montaggi']):
            italian_endpoints[path] = endpoint
        # Inglese: contiene 'collaborators', 'events', 'payments', ecc.
        elif any(english in path for english in ['collaborators', 'events', 'payments', 'editing']):
            english_endpoints[path] = endpoint
    
    conflicts = []
    for it_path in italian_endpoints:
        # Cerca una corrispondenza basata sulla traduzione
        for en_path in english_endpoints:
            if (it_path in analyzer.translation_mappings and 
                analyzer.translation_mappings[it_path] == en_path):
                conflicts.append((it_path, en_path))
                break
            
            # Oppure prova un'euristica semplice
            it_segments = it_path.split('/')
            en_segments = en_path.split('/')
            
            if len(it_segments) == len(en_segments):
                match = True
                for i, (it_seg, en_seg) in enumerate(zip(it_segments, en_segments)):
                    # Se è un numero (ID), continua
                    if it_seg.isdigit() and en_seg.isdigit():
                        continue
                    # Se è diverso e non è una semplice traduzione, non è un match
                    if it_seg != en_seg and not (
                        (it_seg == 'collaboratori' and en_seg == 'collaborators') or
                        (it_seg == 'eventi' and en_seg == 'events') or
                        (it_seg == 'pagamenti' and en_seg == 'payments') or
                        (it_seg == 'montaggi' and en_seg == 'editing')
                    ):
                        match = False
                        break
                
                if match:
                    conflicts.append((it_path, en_path))
    
    print(f"Found {len(conflicts)} potential Italian-English endpoint conflicts:")
    for it_path, en_path in conflicts:
        it_methods = ", ".join(italian_endpoints[it_path].methods) if italian_endpoints[it_path].methods else "N/A"
        en_methods = ", ".join(english_endpoints[en_path].methods) if english_endpoints[en_path].methods else "N/A"
        print(f"  - {it_path} [{it_methods}] <-> {en_path} [{en_methods}]")
    print_separator()
    
    # Crea un piano di migrazione suggerito
    print("Migration Plan Suggestion:")
    
    # Caso 1: Endpoint italiano definito ma non quello inglese
    missing_english = []
    for it_path in italian_endpoints:
        # Cerca nella mappa di traduzione
        if it_path in analyzer.translation_mappings:
            en_path = analyzer.translation_mappings[it_path]
            if en_path not in analyzer.api_endpoints:
                missing_english.append((it_path, en_path))
    
    if missing_english:
        print("\nEndpoints that need English implementation:")
        for it_path, en_path in missing_english:
            print(f"  - {it_path} -> {en_path}")
    
    # Caso 2: Endpoints inglesi che non sono utilizzati nel frontend
    unused_english = []
    for en_path, endpoint in english_endpoints.items():
        if not endpoint.frontend_uses:
            unused_english.append(en_path)
    
    if unused_english:
        print("\nEnglish endpoints not used in frontend (need adapter):")
        for en_path in unused_english:
            print(f"  - {en_path}")
    
    # Caso 3: Frontend che usa endpoints italiani
    frontend_italian = []
    for it_path, endpoint in italian_endpoints.items():
        if endpoint.frontend_uses:
            frontend_italian.append((it_path, list(endpoint.frontend_uses.keys())))
    
    if frontend_italian:
        print("\nFrontend components still using Italian endpoints:")
        for it_path, files in frontend_italian:
            print(f"  - {it_path} used in {len(files)} files:")
            for file in files[:3]:  # Mostra solo i primi 3 file
                print(f"      - {file}")
            if len(files) > 3:
                print(f"      - ...and {len(files) - 3} more files")
    
    print_separator()
    
    # Salva i risultati in un file JSON più mirato
    migration_report = {
        "missing_english_endpoints": missing_english,
        "unused_english_endpoints": unused_english,
        "frontend_using_italian": frontend_italian,
        "italian_english_conflicts": conflicts
    }
    
    output_dir = "analysis_output"
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "migration_plan.json")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(migration_report, f, indent=2)
    
    print(f"Migration plan saved to: {output_file}")

if __name__ == "__main__":
    main()
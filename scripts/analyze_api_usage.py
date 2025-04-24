#!/usr/bin/env python3
"""
Script di analisi delle API per il progetto StudioMaster/Photomaster

Questo script estrae e analizza:
1. Gli endpoint API definiti nel backend
2. I metodi HTTP supportati per ciascun endpoint
3. I controller/handler associati agli endpoint
4. Le posizioni nel frontend dove gli endpoint vengono utilizzati
5. Identifica le incongruenze tra backend e frontend

Autore: Replit AI
"""

import os
import re
import json
from typing import Dict, List, Set, Tuple, Any, Optional
from collections import defaultdict
import argparse

# Definizione dei colori ANSI per l'output colorato
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Struttura per memorizzare le informazioni sugli endpoint
class ApiEndpoint:
    def __init__(self, path: str):
        self.path = path
        self.methods: Set[str] = set()
        self.handlers: Set[str] = set()
        self.backend_files: Dict[str, List[int]] = {}  # file -> [line_numbers]
        self.frontend_uses: Dict[str, List[int]] = {}  # file -> [line_numbers]
        self.translation_mapping: Dict[str, str] = {}  # path_italian -> path_english

    def to_dict(self) -> Dict:
        return {
            "path": self.path,
            "methods": list(self.methods),
            "handlers": list(self.handlers),
            "backend_files": self.backend_files,
            "frontend_uses": self.frontend_uses,
            "translation_mapping": self.translation_mapping
        }

    def __str__(self) -> str:
        return f"{self.path} - Methods: {self.methods} - Handlers: {self.handlers}"

class ApiAnalyzer:
    def __init__(self, root_dir: str):
        self.root_dir = root_dir
        self.server_dir = os.path.join(root_dir, "server")
        self.client_dir = os.path.join(root_dir, "client")
        self.shared_dir = os.path.join(root_dir, "shared")
        self.scripts_dir = os.path.join(root_dir, "scripts")
        self.api_endpoints: Dict[str, ApiEndpoint] = {}
        self.translation_mappings: Dict[str, str] = {}
        
        # Modelli di espressioni regolari per l'analisi
        self.express_endpoint_pattern = re.compile(r'(app|router|apiRouter)\.(get|post|put|patch|delete)\([\'"]([^\'"]*)[\'"](,|\))')
        self.controller_pattern = re.compile(r'(app|router|apiRouter)\.(get|post|put|patch|delete)\([\'"][^\'"]*[\'"]\s*,\s*([a-zA-Z0-9_.\[\]]+)')
        
        # Pattern per le chiamate API nel frontend
        self.fetch_pattern = re.compile(r'fetch\([\'"]([^\'"]*)[\'"]')
        self.axios_pattern = re.compile(r'axios\.(get|post|put|patch|delete)\([\'"]([^\'"]*)[\'"]')
        self.api_request_pattern = re.compile(r'apiRequest\([\'"]?(GET|POST|PUT|PATCH|DELETE)[\'"]?\s*,\s*[\'"]([^\'"]*)[\'"]')
        self.adapted_api_request_pattern = re.compile(r'adaptedApiRequest\([\'"]?(GET|POST|PUT|PATCH|DELETE)[\'"]?\s*,\s*[\'"]([^\'"]*)[\'"]')
        self.query_client_pattern = re.compile(r'queryClient\.(invalidateQueries|setQueryData|getQueryData)\(\s*[\{\[]?\s*[\'"]([^\'"]*)[\'"]')
        self.query_key_pattern = re.compile(r'queryKey\s*[:=]\s*\[\s*[\'"]([^\'"]*)[\'"]')
        
        # Pattern per i file di registrazione delle rotte
        self.route_registration_pattern = re.compile(r'app\.use\([\'"]([^\'"]*)[\'"],\s*([a-zA-Z0-9_]+)')
        
        # Pattern per le mappature di traduzione
        self.endpoint_mapping_pattern = re.compile(r'[\'"](\/api\/[^\'"]+)[\'"]:\s*[\'"](\/api\/[^\'"]+)[\'"]')

    def analyze(self) -> Dict[str, ApiEndpoint]:
        """Esegue l'analisi completa del progetto"""
        print(f"{Colors.HEADER}Inizio analisi del progetto StudioMaster{Colors.ENDC}")
        
        # Prima estrai le mappature di traduzione (se presenti)
        self._extract_translation_mappings()
        
        # Analizza il backend per trovare gli endpoint
        self._analyze_backend()
        
        # Analizza il frontend per l'uso degli endpoint
        self._analyze_frontend()
        
        return self.api_endpoints

    def _extract_translation_mappings(self):
        """Estrae le mappature di traduzione da file come api-adapter.ts"""
        print(f"{Colors.CYAN}Ricerca mappature di traduzione...{Colors.ENDC}")
        adapter_files = [
            os.path.join(self.client_dir, "src", "utils", "api-adapter.ts"),
            os.path.join(self.root_dir, "client", "utils", "api-adapter.ts")
        ]
        
        for file_path in adapter_files:
            if os.path.exists(file_path):
                print(f"  Analisi del file di adattamento: {file_path}")
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Cerca blocchi come 'ENDPOINT_MAPPING' o mappature simili
                    matches = self.endpoint_mapping_pattern.findall(content)
                    for italian, english in matches:
                        self.translation_mappings[italian] = english
                        print(f"    Mappatura trovata: {italian} -> {english}")
        
        print(f"  Trovate {len(self.translation_mappings)} mappature di traduzione")

    def _analyze_backend(self):
        """Analizza i file di backend per trovare gli endpoint API"""
        print(f"{Colors.CYAN}Analisi del backend...{Colors.ENDC}")
        
        if not os.path.exists(self.server_dir):
            print(f"{Colors.WARNING}Directory del server non trovata: {self.server_dir}{Colors.ENDC}")
            return
        
        # Analizza i file di routing principali
        for root, _, files in os.walk(self.server_dir):
            for file in files:
                if file.endswith('.ts') or file.endswith('.js'):
                    file_path = os.path.join(root, file)
                    self._parse_backend_file(file_path)
        
    def _parse_backend_file(self, file_path: str):
        """Analizza un singolo file backend per endpoint e controller"""
        relative_path = os.path.relpath(file_path, self.root_dir)
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.readlines()
                
                # Cerca tutti gli endpoint Express
                for i, line in enumerate(content, 1):
                    # Cerca le definizioni di route come app.get('/api/path', handler)
                    for method, path in self._find_express_endpoints(line):
                        if not path.startswith('/api/'):
                            # Ignora le route che non sono API REST
                            continue
                            
                        # Normalizza il percorso
                        path = self._normalize_path(path)
                        
                        # Crea o aggiorna l'endpoint API
                        if path not in self.api_endpoints:
                            self.api_endpoints[path] = ApiEndpoint(path)
                        
                        endpoint = self.api_endpoints[path]
                        endpoint.methods.add(method.upper())
                        
                        # Aggiungi il file backend
                        if relative_path not in endpoint.backend_files:
                            endpoint.backend_files[relative_path] = []
                        endpoint.backend_files[relative_path].append(i)
                        
                        # Cerca il controller/handler
                        handler = self._find_controller(line)
                        if handler:
                            endpoint.handlers.add(handler)
                            
                    # Cerca la registrazione delle rotte
                    route_matches = self.route_registration_pattern.findall(line)
                    for prefix, router_var in route_matches:
                        print(f"  Registrazione router trovata: {prefix} -> {router_var} in {relative_path}")
                
        except Exception as e:
            print(f"{Colors.FAIL}Errore durante l'analisi del file {file_path}: {str(e)}{Colors.ENDC}")
            
    def _find_express_endpoints(self, line: str) -> List[Tuple[str, str]]:
        """Trova gli endpoint Express in una linea di codice"""
        results = []
        matches = self.express_endpoint_pattern.findall(line)
        for match in matches:
            method = match[1]  # get, post, put, ecc.
            path = match[2]    # il percorso dell'endpoint
            results.append((method, path))
        return results
    
    def _find_controller(self, line: str) -> Optional[str]:
        """Trova il controller associato a un endpoint"""
        matches = self.controller_pattern.findall(line)
        if matches:
            return matches[0][2]  # nome del controller/handler
        return None
    
    def _normalize_path(self, path: str) -> str:
        """Normalizza il percorso dell'endpoint, rimuovendo parametri di percorso specifici"""
        # Sostituisci i parametri di percorso con placeholder generici
        # ad es. /api/posts/:id -> /api/posts/{id}
        normalized = re.sub(r':([a-zA-Z0-9_]+)', r'{\1}', path)
        
        # Rimuovi eventuali "?" opzionali dai parametri
        normalized = normalized.replace('?', '')
        
        return normalized
    
    def _analyze_frontend(self):
        """Analizza i file frontend per trovare dove vengono utilizzati gli endpoint API"""
        print(f"{Colors.CYAN}Analisi del frontend...{Colors.ENDC}")
        
        dirs_to_check = [
            self.client_dir,
            self.shared_dir,
            self.scripts_dir
        ]
        
        for base_dir in dirs_to_check:
            if not os.path.exists(base_dir):
                print(f"{Colors.WARNING}Directory non trovata: {base_dir}{Colors.ENDC}")
                continue
                
            for root, _, files in os.walk(base_dir):
                for file in files:
                    if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                        file_path = os.path.join(root, file)
                        self._parse_frontend_file(file_path)
                        
    def _parse_frontend_file(self, file_path: str):
        """Analizza un singolo file frontend per uso delle API"""
        relative_path = os.path.relpath(file_path, self.root_dir)
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.readlines()
                
                for i, line in enumerate(content, 1):
                    # Cerca chiamate fetch
                    for path in self._find_fetch_calls(line):
                        self._record_frontend_usage(path, relative_path, i)
                    
                    # Cerca chiamate axios
                    for path in self._find_axios_calls(line):
                        self._record_frontend_usage(path, relative_path, i)
                    
                    # Cerca chiamate apiRequest
                    for path in self._find_api_request_calls(line):
                        self._record_frontend_usage(path, relative_path, i)
                        
                    # Cerca chiamate adaptedApiRequest
                    for path in self._find_adapted_api_request_calls(line):
                        self._record_frontend_usage(path, relative_path, i)
                    
                    # Cerca invalidazioni queryClient
                    for path in self._find_query_client_calls(line):
                        self._record_frontend_usage(path, relative_path, i)
                    
                    # Cerca queryKey
                    for path in self._find_query_key(line):
                        self._record_frontend_usage(path, relative_path, i)
        
        except Exception as e:
            print(f"{Colors.FAIL}Errore durante l'analisi del file {file_path}: {str(e)}{Colors.ENDC}")
                
    def _find_fetch_calls(self, line: str) -> List[str]:
        """Trova chiamate fetch() in una linea di codice"""
        paths = []
        matches = self.fetch_pattern.findall(line)
        for path in matches:
            if path.startswith('/api/'):
                paths.append(path)
        return paths
    
    def _find_axios_calls(self, line: str) -> List[str]:
        """Trova chiamate axios in una linea di codice"""
        paths = []
        matches = self.axios_pattern.findall(line)
        for _, path in matches:
            if path.startswith('/api/'):
                paths.append(path)
        return paths
    
    def _find_api_request_calls(self, line: str) -> List[str]:
        """Trova chiamate apiRequest in una linea di codice"""
        paths = []
        matches = self.api_request_pattern.findall(line)
        for _, path in matches:
            if path.startswith('/api/'):
                paths.append(path)
        return paths
    
    def _find_adapted_api_request_calls(self, line: str) -> List[str]:
        """Trova chiamate adaptedApiRequest in una linea di codice"""
        paths = []
        matches = self.adapted_api_request_pattern.findall(line)
        for _, path in matches:
            if path.startswith('/api/'):
                paths.append(path)
        return paths
    
    def _find_query_client_calls(self, line: str) -> List[str]:
        """Trova chiamate queryClient in una linea di codice"""
        paths = []
        matches = self.query_client_pattern.findall(line)
        for _, path in matches:
            if path.startswith('/api/'):
                paths.append(path)
        return paths
    
    def _find_query_key(self, line: str) -> List[str]:
        """Trova queryKey in una linea di codice"""
        paths = []
        matches = self.query_key_pattern.findall(line)
        for path in matches:
            if path.startswith('/api/'):
                paths.append(path)
        return paths
    
    def _record_frontend_usage(self, path: str, file_path: str, line_number: int):
        """Registra l'uso di un endpoint API nel frontend"""
        # Normalizza il percorso
        path = self._normalize_path(path)
        
        # Verifica se esiste una traduzione per questo percorso
        translated_path = None
        if path in self.translation_mappings:
            translated_path = self.translation_mappings[path]
        
        # Controlla se l'endpoint esiste già
        if path in self.api_endpoints:
            endpoint = self.api_endpoints[path]
        elif translated_path and translated_path in self.api_endpoints:
            endpoint = self.api_endpoints[translated_path]
            # Aggiungi il mapping di traduzione
            endpoint.translation_mapping[path] = translated_path
        else:
            # Se l'endpoint non esiste nel backend, crealo
            self.api_endpoints[path] = ApiEndpoint(path)
            endpoint = self.api_endpoints[path]
            
            # Se c'è una traduzione, registrala
            if translated_path:
                endpoint.translation_mapping[path] = translated_path
        
        # Aggiungi il file frontend
        if file_path not in endpoint.frontend_uses:
            endpoint.frontend_uses[file_path] = []
        if line_number not in endpoint.frontend_uses[file_path]:
            endpoint.frontend_uses[file_path].append(line_number)
    
    def find_inconsistencies(self) -> Dict[str, List[str]]:
        """Trova le incongruenze tra backend e frontend"""
        inconsistencies = {
            "unused_endpoints": [],
            "undefined_endpoints": [],
            "italian_english_conflicts": [],
            "method_mismatches": []
        }
        
        for path, endpoint in self.api_endpoints.items():
            # Endpoint backend non utilizzati nel frontend
            if not endpoint.frontend_uses and endpoint.backend_files:
                inconsistencies["unused_endpoints"].append(path)
            
            # Endpoint utilizzati nel frontend ma non definiti nel backend
            if endpoint.frontend_uses and not endpoint.backend_files:
                # Controlla se c'è una traduzione che esiste nel backend
                has_valid_translation = False
                for it_path, en_path in endpoint.translation_mapping.items():
                    if en_path in self.api_endpoints and self.api_endpoints[en_path].backend_files:
                        has_valid_translation = True
                        break
                
                if not has_valid_translation:
                    inconsistencies["undefined_endpoints"].append(path)
            
            # Conflitti italiano-inglese
            for it_path, en_path in endpoint.translation_mapping.items():
                if it_path != path:  # Evita di controllare se stesso
                    it_endpoint = None
                    if it_path in self.api_endpoints:
                        it_endpoint = self.api_endpoints[it_path]
                    
                    en_endpoint = None
                    if en_path in self.api_endpoints:
                        en_endpoint = self.api_endpoints[en_path]
                    
                    if it_endpoint and en_endpoint and it_endpoint.backend_files and en_endpoint.backend_files:
                        inconsistencies["italian_english_conflicts"].append(f"{it_path} <-> {en_path}")
        
        return inconsistencies
    
    def generate_report(self) -> Dict[str, Any]:
        """Genera un report completo dell'analisi"""
        inconsistencies = self.find_inconsistencies()
        
        report = {
            "endpoints": {path: endpoint.to_dict() for path, endpoint in self.api_endpoints.items()},
            "translation_mappings": self.translation_mappings,
            "inconsistencies": inconsistencies,
            "stats": {
                "total_endpoints": len(self.api_endpoints),
                "backend_defined": sum(1 for e in self.api_endpoints.values() if e.backend_files),
                "frontend_used": sum(1 for e in self.api_endpoints.values() if e.frontend_uses),
                "unused_endpoints": len(inconsistencies["unused_endpoints"]),
                "undefined_endpoints": len(inconsistencies["undefined_endpoints"]),
                "italian_english_conflicts": len(inconsistencies["italian_english_conflicts"])
            }
        }
        
        return report
    
    def print_results(self):
        """Stampa i risultati dell'analisi in formato leggibile"""
        report = self.generate_report()
        
        print(f"\n{Colors.HEADER}=== REPORT ANALISI API ==={Colors.ENDC}")
        print(f"\n{Colors.BLUE}Statistiche:{Colors.ENDC}")
        print(f"  Totale endpoint trovati: {report['stats']['total_endpoints']}")
        print(f"  Endpoint definiti nel backend: {report['stats']['backend_defined']}")
        print(f"  Endpoint utilizzati nel frontend: {report['stats']['frontend_used']}")
        print(f"  Mappature di traduzione: {len(report['translation_mappings'])}")
        
        print(f"\n{Colors.BLUE}Incongruenze rilevate:{Colors.ENDC}")
        print(f"  Endpoint non utilizzati: {report['stats']['unused_endpoints']}")
        for path in report['inconsistencies']['unused_endpoints'][:10]:  # Mostra solo i primi 10
            endpoint = self.api_endpoints[path]
            backend_files = list(endpoint.backend_files.keys())
            print(f"    - {path} [definito in: {backend_files[0] if backend_files else 'N/A'}]")
        if len(report['inconsistencies']['unused_endpoints']) > 10:
            print(f"    ... e altri {len(report['inconsistencies']['unused_endpoints']) - 10} endpoint")
            
        print(f"  Endpoint non definiti: {report['stats']['undefined_endpoints']}")
        for path in report['inconsistencies']['undefined_endpoints'][:10]:  # Mostra solo i primi 10
            endpoint = self.api_endpoints[path]
            frontend_files = list(endpoint.frontend_uses.keys())
            print(f"    - {path} [usato in: {frontend_files[0] if frontend_files else 'N/A'}]")
        if len(report['inconsistencies']['undefined_endpoints']) > 10:
            print(f"    ... e altri {len(report['inconsistencies']['undefined_endpoints']) - 10} endpoint")
            
        print(f"  Conflitti italiano-inglese: {report['stats']['italian_english_conflicts']}")
        for conflict in report['inconsistencies']['italian_english_conflicts'][:10]:  # Mostra solo i primi 10
            print(f"    - {conflict}")
        if len(report['inconsistencies']['italian_english_conflicts']) > 10:
            print(f"    ... e altri {len(report['inconsistencies']['italian_english_conflicts']) - 10} conflitti")
            
        print(f"\n{Colors.GREEN}Mappature di traduzione trovate:{Colors.ENDC}")
        for it_path, en_path in list(report['translation_mappings'].items())[:10]:  # Mostra solo i primi 10
            print(f"  - {it_path} -> {en_path}")
        if len(report['translation_mappings']) > 10:
            print(f"    ... e altre {len(report['translation_mappings']) - 10} mappature")
            
        print(f"\n{Colors.BLUE}Primi 10 endpoint:{Colors.ENDC}")
        for i, (path, endpoint_dict) in enumerate(list(report['endpoints'].items())[:10]):
            endpoint = self.api_endpoints[path]
            methods = ', '.join(endpoint.methods) if endpoint.methods else 'N/A'
            backend = list(endpoint.backend_files.keys())[0] if endpoint.backend_files else 'N/A'
            frontend = list(endpoint.frontend_uses.keys())[0] if endpoint.frontend_uses else 'N/A'
            print(f"  {i+1}. {path}")
            print(f"     Metodi: {methods}")
            print(f"     Backend: {backend}")
            print(f"     Frontend: {frontend}")
            
            # Mostra eventuali traduzioni
            if endpoint.translation_mapping:
                translations = ', '.join([f"{src} -> {dest}" for src, dest in endpoint.translation_mapping.items()])
                print(f"     Traduzioni: {translations}")
                
        if len(report['endpoints']) > 10:
            print(f"    ... e altri {len(report['endpoints']) - 10} endpoint")
    
    def save_report(self, output_file: str):
        """Salva il report su file"""
        report = self.generate_report()
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
            
        print(f"\n{Colors.GREEN}Report salvato in: {output_file}{Colors.ENDC}")
        
        # Crea anche un rapporto di sintesi delle incongruenze in markdown
        md_output = output_file.replace('.json', '.md')
        with open(md_output, 'w', encoding='utf-8') as f:
            f.write("# Studio Master API Analysis\n\n")
            
            f.write("## Statistics\n\n")
            f.write(f"- Total endpoints: {report['stats']['total_endpoints']}\n")
            f.write(f"- Backend defined: {report['stats']['backend_defined']}\n")
            f.write(f"- Frontend used: {report['stats']['frontend_used']}\n")
            f.write(f"- Translation mappings: {len(report['translation_mappings'])}\n\n")
            
            f.write("## Inconsistencies\n\n")
            
            f.write("### Unused Endpoints\n\n")
            f.write("Endpoints defined in the backend but not used in the frontend:\n\n")
            if report['inconsistencies']['unused_endpoints']:
                f.write("| Endpoint | Defined In |\n")
                f.write("|----------|------------|\n")
                for path in report['inconsistencies']['unused_endpoints']:
                    endpoint = self.api_endpoints[path]
                    backend_files = list(endpoint.backend_files.keys())
                    f.write(f"| `{path}` | {backend_files[0] if backend_files else 'N/A'} |\n")
            else:
                f.write("*No unused endpoints found*\n")
                
            f.write("\n### Undefined Endpoints\n\n")
            f.write("Endpoints used in the frontend but not defined in the backend:\n\n")
            if report['inconsistencies']['undefined_endpoints']:
                f.write("| Endpoint | Used In |\n")
                f.write("|----------|--------|\n")
                for path in report['inconsistencies']['undefined_endpoints']:
                    endpoint = self.api_endpoints[path]
                    frontend_files = list(endpoint.frontend_uses.keys())
                    f.write(f"| `{path}` | {frontend_files[0] if frontend_files else 'N/A'} |\n")
            else:
                f.write("*No undefined endpoints found*\n")
                
            f.write("\n### Italian-English Conflicts\n\n")
            f.write("Endpoints with both Italian and English versions defined in the backend:\n\n")
            if report['inconsistencies']['italian_english_conflicts']:
                f.write("| Italian Endpoint | English Endpoint |\n")
                f.write("|-----------------|------------------|\n")
                for conflict in report['inconsistencies']['italian_english_conflicts']:
                    italian, english = conflict.split(" <-> ")
                    f.write(f"| `{italian}` | `{english}` |\n")
            else:
                f.write("*No Italian-English conflicts found*\n")
                
            f.write("\n## Translation Mappings\n\n")
            if report['translation_mappings']:
                f.write("| Italian Endpoint | English Endpoint |\n")
                f.write("|-----------------|------------------|\n")
                for it_path, en_path in report['translation_mappings'].items():
                    f.write(f"| `{it_path}` | `{en_path}` |\n")
            else:
                f.write("*No translation mappings found*\n")
            
        print(f"{Colors.GREEN}Report di sintesi salvato in: {md_output}{Colors.ENDC}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Analizza le API in un progetto StudioMaster/Photomaster')
    parser.add_argument('--root', '-r', default='.', help='Directory radice del progetto')
    parser.add_argument('--output', '-o', default='api_analysis_report.json', help='File di output per il report')
    
    args = parser.parse_args()
    
    analyzer = ApiAnalyzer(args.root)
    analyzer.analyze()
    analyzer.print_results()
    analyzer.save_report(args.output)
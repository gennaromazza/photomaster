#!/usr/bin/env python3
"""
query_interface.py - Module for querying code analysis results using natural language
Provides an interface to search and explore the codebase using semantic queries
"""

import os
import re
import json
from typing import Dict, List, Any, Set, Optional, Union, Tuple
from pathlib import Path
import typer
from rich.console import Console
from rich.table import Table
from rich.syntax import Syntax
from rich.panel import Panel
from rich.prompt import Prompt
from rich.progress import Progress, SpinnerColumn, TextColumn
import regex as re_extended

app = typer.Typer()
console = Console()

class CodeQuery:
    def __init__(self, analysis_results_path: str, project_root: str):
        """Initialize with the path to the analysis results JSON file"""
        self.results_path = analysis_results_path
        self.project_root = Path(project_root)
        self.analysis_results = self._load_analysis_results()
        self.file_cache: Dict[str, List[str]] = {}
        
    def _load_analysis_results(self) -> Dict[str, Any]:
        """Load analysis results from JSON file"""
        try:
            with open(self.results_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            console.print(f"[red]Error loading analysis results: {e}[/red]")
            return {
                "endpoints": {},
                "functions": {},
                "issues": [],
                "italian_to_english": {}
            }
    
    def query(self, user_query: str) -> List[Dict[str, Any]]:
        """Process a natural language query about the codebase"""
        # Normalize query
        query = user_query.lower().strip()
        
        # Check for specific query patterns
        if "endpoint" in query or "api" in query:
            return self._query_endpoints(query)
        elif "function" in query or "method" in query:
            return self._query_functions(query)
        elif "issue" in query or "problem" in query or "error" in query:
            return self._query_issues(query)
        elif "file" in query or "directory" in query:
            return self._query_files(query)
        elif "missing" in query:
            return self._query_missing_items(query)
        else:
            # Generic query using all data
            return self._generic_query(query)
    
    def _query_endpoints(self, query: str) -> List[Dict[str, Any]]:
        """Query API endpoints"""
        endpoints = self.analysis_results.get("endpoints", {})
        results = []
        
        # Check for method-specific queries
        method_match = re.search(r'\b(get|post|put|patch|delete)\b', query, re.IGNORECASE)
        method = method_match.group(1).upper() if method_match else None
        
        # Check for path-specific queries
        path_match = re.search(r'/\w+(/\w+)*', query)
        path_fragment = path_match.group(0) if path_match else None
        
        # Check for usage-specific queries
        check_unused = "unused" in query or "not used" in query
        check_used = "used" in query and not check_unused
        
        # Check for parameter queries
        param_match = re.search(r'parameter[s]?\s+(\w+)', query)
        param = param_match.group(1) if param_match else None
        
        # Check for Italian/English queries
        check_italian = "italian" in query
        check_english = "english" in query
        
        # Filter endpoints
        for key, endpoint in endpoints.items():
            include = True
            
            if method and not key.startswith(method):
                include = False
            
            if path_fragment and path_fragment not in endpoint.get("path", ""):
                include = False
            
            if check_unused and endpoint.get("is_used", False):
                include = False
            
            if check_used and not endpoint.get("is_used", False):
                include = False
            
            if param:
                params = endpoint.get("parameters", [])
                if param not in params:
                    include = False
            
            if check_italian:
                path = endpoint.get("path", "")
                italian_terms = ["collaboratori", "eventi", "utenti", "clienti", "pagamenti", "montaggi"]
                if not any(term in path for term in italian_terms):
                    include = False
            
            if check_english:
                path = endpoint.get("path", "")
                english_terms = ["collaborators", "events", "users", "clients", "payments", "editing"]
                if not any(term in path for term in english_terms):
                    include = False
            
            if include:
                results.append({
                    "type": "endpoint",
                    "key": key,
                    "data": endpoint
                })
        
        return results
    
    def _query_functions(self, query: str) -> List[Dict[str, Any]]:
        """Query functions"""
        functions = self.analysis_results.get("functions", {})
        results = []
        
        # Check for name-specific queries
        name_match = re.search(r'named\s+(\w+)', query)
        name = name_match.group(1) if name_match else None
        
        # Check for parameter queries
        param_match = re.search(r'parameter[s]?\s+(\w+)', query)
        param = param_match.group(1) if param_match else None
        
        # Check for return queries
        check_missing_return = "missing return" in query or "no return" in query
        
        # Check for similar function queries
        check_similar = "similar" in query or "duplicate" in query
        
        # Check for file queries
        file_match = re.search(r'in file\s+(\S+)', query)
        file_fragment = file_match.group(1) if file_match else None
        
        # Filter functions
        for func_name, func in functions.items():
            include = True
            
            if name and name.lower() not in func_name.lower():
                include = False
            
            if param:
                params = func.get("parameters", [])
                if param not in params:
                    include = False
            
            if check_missing_return and func.get("has_return", True):
                include = False
            
            if check_similar and not func.get("similar_functions", []):
                include = False
            
            if file_fragment and file_fragment not in func.get("file_path", ""):
                include = False
            
            if include:
                results.append({
                    "type": "function",
                    "key": func_name,
                    "data": func
                })
        
        return results
    
    def _query_issues(self, query: str) -> List[Dict[str, Any]]:
        """Query issues"""
        issues = self.analysis_results.get("issues", [])
        results = []
        
        # Check for severity-specific queries
        severity_match = re.search(r'\b(error|warning|info)\b', query, re.IGNORECASE)
        severity = severity_match.group(1).lower() if severity_match else None
        
        # Check for type-specific queries
        issue_types = {
            "try": "try_without_catch",
            "catch": "try_without_catch",
            "if": "if_without_else",
            "else": "if_without_else",
            "switch": "switch_without_default",
            "default": "switch_without_default",
            "validation": "missing_validation",
            "validate": "missing_validation",
            "return": "missing_return",
            "duplicate": "duplicate_function"
        }
        
        issue_type = None
        for keyword, type_name in issue_types.items():
            if keyword in query:
                issue_type = type_name
                break
        
        # Check for file queries
        file_match = re.search(r'in file\s+(\S+)', query)
        file_fragment = file_match.group(1) if file_match else None
        
        # Filter issues
        for issue in issues:
            include = True
            
            if severity and issue.get("severity", "") != severity:
                include = False
            
            if issue_type and issue.get("issue_type", "") != issue_type:
                include = False
            
            if file_fragment and file_fragment not in issue.get("file_path", ""):
                include = False
            
            if include:
                results.append({
                    "type": "issue",
                    "key": issue.get("issue_type", "unknown"),
                    "data": issue
                })
        
        return results
    
    def _query_files(self, query: str) -> List[Dict[str, Any]]:
        """Query files"""
        results = []
        
        # Gather all files mentioned in results
        files = set()
        
        # Add files from endpoints
        for endpoint in self.analysis_results.get("endpoints", {}).values():
            if "file_path" in endpoint:
                files.add(endpoint["file_path"])
        
        # Add files from functions
        for func in self.analysis_results.get("functions", {}).values():
            if "file_path" in func:
                files.add(func["file_path"])
        
        # Add files from issues
        for issue in self.analysis_results.get("issues", []):
            if "file_path" in issue:
                files.add(issue["file_path"])
        
        # Check for directory-specific queries
        dir_match = re.search(r'(server|client|shared|scripts|public)', query, re.IGNORECASE)
        dir_name = dir_match.group(1).lower() if dir_match else None
        
        # Check for extension-specific queries
        ext_match = re.search(r'\.(ts|tsx|js|jsx|css|html|py)', query)
        ext = ext_match.group(1) if ext_match else None
        
        # Filter files
        for file_path in files:
            include = True
            
            if dir_name and dir_name not in file_path.lower():
                include = False
            
            if ext and not file_path.lower().endswith(f".{ext}"):
                include = False
            
            if include:
                results.append({
                    "type": "file",
                    "key": file_path,
                    "data": {"path": file_path}
                })
        
        return results
    
    def _query_missing_items(self, query: str) -> List[Dict[str, Any]]:
        """Query for missing items (endpoints, validations, returns, etc.)"""
        results = []
        
        # Check what's missing
        if "endpoint" in query or "api" in query:
            # Find used but undefined endpoints
            endpoints = self.analysis_results.get("endpoints", {})
            for key, endpoint in endpoints.items():
                if endpoint.get("is_used", False) and not endpoint.get("is_defined", False):
                    results.append({
                        "type": "missing_endpoint",
                        "key": key,
                        "data": endpoint
                    })
        
        if "validation" in query:
            # Find issues with missing validation
            issues = self.analysis_results.get("issues", [])
            for issue in issues:
                if issue.get("issue_type", "") == "missing_validation":
                    results.append({
                        "type": "missing_validation",
                        "key": "validation",
                        "data": issue
                    })
        
        if "return" in query:
            # Find functions missing return statements
            issues = self.analysis_results.get("issues", [])
            for issue in issues:
                if issue.get("issue_type", "") == "missing_return":
                    results.append({
                        "type": "missing_return",
                        "key": "return",
                        "data": issue
                    })
        
        if "catch" in query or "try" in query:
            # Find try blocks without catch
            issues = self.analysis_results.get("issues", [])
            for issue in issues:
                if issue.get("issue_type", "") == "try_without_catch":
                    results.append({
                        "type": "missing_catch",
                        "key": "catch",
                        "data": issue
                    })
        
        if "else" in query:
            # Find if statements without else
            issues = self.analysis_results.get("issues", [])
            for issue in issues:
                if issue.get("issue_type", "") == "if_without_else":
                    results.append({
                        "type": "missing_else",
                        "key": "else",
                        "data": issue
                    })
        
        return results
    
    def _generic_query(self, query: str) -> List[Dict[str, Any]]:
        """Process a generic query that doesn't match specific patterns"""
        results = []
        
        # Check if query contains any known keywords
        keywords = query.split()
        
        # Search endpoints
        endpoints = self.analysis_results.get("endpoints", {})
        for key, endpoint in endpoints.items():
            for keyword in keywords:
                if (
                    keyword in key.lower() or
                    keyword in endpoint.get("path", "").lower() or
                    any(keyword in param.lower() for param in endpoint.get("parameters", []))
                ):
                    results.append({
                        "type": "endpoint",
                        "key": key,
                        "data": endpoint
                    })
                    break
        
        # Search functions
        functions = self.analysis_results.get("functions", {})
        for func_name, func in functions.items():
            for keyword in keywords:
                if (
                    keyword in func_name.lower() or
                    any(keyword in param.lower() for param in func.get("parameters", []))
                ):
                    results.append({
                        "type": "function",
                        "key": func_name,
                        "data": func
                    })
                    break
        
        # Search issues
        issues = self.analysis_results.get("issues", [])
        for issue in issues:
            description = issue.get("description", "").lower()
            for keyword in keywords:
                if keyword in description:
                    results.append({
                        "type": "issue",
                        "key": issue.get("issue_type", "unknown"),
                        "data": issue
                    })
                    break
        
        return results
    
    def search_code(self, pattern: str, directory: str = None) -> List[Dict[str, Any]]:
        """Search for code using regex patterns"""
        results = []
        
        # Determine which directories to search
        search_dirs = []
        if directory:
            search_dirs.append(directory)
        else:
            search_dirs = ["server", "client", "shared", "scripts", "public"]
        
        total_files = 0
        for search_dir in search_dirs:
            dir_path = self.project_root / search_dir
            if dir_path.exists() and dir_path.is_dir():
                for root, _, files in os.walk(dir_path):
                    for file in files:
                        if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                            total_files += 1
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        ) as progress:
            search_task = progress.add_task(f"[cyan]Searching for '{pattern}'", total=total_files)
            files_searched = 0
            
            try:
                regex_pattern = re_extended.compile(pattern)
            except Exception as e:
                console.print(f"[red]Invalid regex pattern: {e}[/red]")
                return []
            
            for search_dir in search_dirs:
                dir_path = self.project_root / search_dir
                if not dir_path.exists() or not dir_path.is_dir():
                    continue
                
                for root, _, files in os.walk(dir_path):
                    for file in files:
                        if not file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                            continue
                        
                        file_path = os.path.join(root, file)
                        
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                            
                            matches = list(regex_pattern.finditer(content))
                            
                            if matches:
                                # Find line numbers for matches
                                lines = content.split('\n')
                                line_offsets = [0]
                                offset = 0
                                for line in lines:
                                    offset += len(line) + 1  # +1 for the newline
                                    line_offsets.append(offset)
                                
                                for match in matches:
                                    start_pos = match.start()
                                    
                                    # Find line number
                                    line_num = 0
                                    for i, offset in enumerate(line_offsets):
                                        if offset > start_pos:
                                            line_num = i
                                            break
                                    
                                    # Get context (3 lines before and after)
                                    start_line = max(0, line_num - 3)
                                    end_line = min(len(lines), line_num + 4)
                                    context = lines[start_line:end_line]
                                    
                                    results.append({
                                        "type": "code_match",
                                        "key": file_path,
                                        "data": {
                                            "file_path": file_path,
                                            "line_number": line_num,
                                            "match": match.group(0),
                                            "context": "\n".join(context)
                                        }
                                    })
                        except Exception as e:
                            console.print(f"[yellow]Error reading file {file_path}: {e}[/yellow]")
                        
                        files_searched += 1
                        progress.update(search_task, completed=files_searched)
        
        return results
    
    def get_file_content(self, file_path: str) -> str:
        """Get the content of a file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            console.print(f"[red]Error reading file {file_path}: {e}[/red]")
            return ""
    
    def display_results(self, results: List[Dict[str, Any]]):
        """Display query results"""
        if not results:
            console.print("[yellow]No results found for your query[/yellow]")
            return
        
        # Group results by type
        results_by_type = {}
        for result in results:
            result_type = result.get("type", "unknown")
            if result_type not in results_by_type:
                results_by_type[result_type] = []
            results_by_type[result_type].append(result)
        
        # Display summary
        console.print(f"\n[bold green]Found {len(results)} results:[/bold green]")
        
        for result_type, type_results in results_by_type.items():
            console.print(f"[bold cyan]{result_type.replace('_', ' ').title()}: {len(type_results)}[/bold cyan]")
        
        console.print("")
        
        # Display detailed results by type
        for result_type, type_results in results_by_type.items():
            self._display_results_by_type(result_type, type_results)
    
    def _display_results_by_type(self, result_type: str, results: List[Dict[str, Any]]):
        """Display results grouped by type"""
        if result_type == "endpoint":
            self._display_endpoint_results(results)
        elif result_type == "function":
            self._display_function_results(results)
        elif result_type == "issue":
            self._display_issue_results(results)
        elif result_type == "file":
            self._display_file_results(results)
        elif result_type == "code_match":
            self._display_code_match_results(results)
        elif result_type.startswith("missing_"):
            self._display_missing_item_results(result_type, results)
        else:
            self._display_generic_results(results)
    
    def _display_endpoint_results(self, results: List[Dict[str, Any]]):
        """Display endpoint results"""
        console.print("\n[bold]API ENDPOINTS[/bold]")
        
        table = Table(show_header=True, header_style="bold")
        table.add_column("Method")
        table.add_column("Path")
        table.add_column("Defined")
        table.add_column("Used")
        table.add_column("Parameters")
        table.add_column("Location")
        
        for result in results:
            endpoint = result.get("data", {})
            method = endpoint.get("method", "").upper()
            path = endpoint.get("path", "")
            defined = "✓" if endpoint.get("is_defined", False) else "✗"
            used = "✓" if endpoint.get("is_used", False) else "✗"
            params = ", ".join(endpoint.get("parameters", []))
            location = f"{endpoint.get('file_path', '')}:{endpoint.get('line_number', '')}"
            
            table.add_row(
                method,
                path,
                defined,
                used,
                params,
                location
            )
        
        console.print(table)
    
    def _display_function_results(self, results: List[Dict[str, Any]]):
        """Display function results"""
        console.print("\n[bold]FUNCTIONS[/bold]")
        
        table = Table(show_header=True, header_style="bold")
        table.add_column("Name")
        table.add_column("Parameters")
        table.add_column("Has Return")
        table.add_column("Async")
        table.add_column("Similar Functions")
        table.add_column("Location")
        
        for result in results:
            func = result.get("data", {})
            name = result.get("key", "")
            params = ", ".join(func.get("parameters", []))
            has_return = "✓" if func.get("has_return", False) else "✗"
            is_async = "✓" if func.get("is_async", False) else "✗"
            similar = ", ".join(func.get("similar_functions", []))
            location = f"{func.get('file_path', '')}:{func.get('line_number', '')}"
            
            table.add_row(
                name,
                params,
                has_return,
                is_async,
                similar,
                location
            )
        
        console.print(table)
    
    def _display_issue_results(self, results: List[Dict[str, Any]]):
        """Display issue results"""
        console.print("\n[bold]ISSUES[/bold]")
        
        for result in results:
            issue = result.get("data", {})
            issue_type = issue.get("issue_type", "unknown").replace("_", " ").title()
            description = issue.get("description", "")
            severity = issue.get("severity", "").upper()
            location = f"{issue.get('file_path', '')}:{issue.get('line_number', '')}"
            code_snippet = issue.get("code_snippet", "")
            fix_suggestion = issue.get("fix_suggestion", "")
            
            panel_content = []
            panel_content.append(f"[bold]{issue_type}[/bold]: {description}")
            panel_content.append(f"[dim]Severity:[/dim] {severity}")
            panel_content.append(f"[dim]Location:[/dim] {location}")
            
            if code_snippet:
                panel_content.append("\n[dim]Code:[/dim]")
                panel_content.append(Syntax(code_snippet, "typescript", theme="monokai", line_numbers=False))
            
            if fix_suggestion:
                panel_content.append(f"[green][dim]Suggestion:[/dim] {fix_suggestion}[/green]")
            
            severity_color = {"ERROR": "red", "WARNING": "yellow", "INFO": "blue"}.get(severity, "white")
            console.print(Panel("\n".join([str(item) for item in panel_content]), border_style=severity_color))
    
    def _display_file_results(self, results: List[Dict[str, Any]]):
        """Display file results"""
        console.print("\n[bold]FILES[/bold]")
        
        table = Table(show_header=True, header_style="bold")
        table.add_column("Path")
        
        for result in results:
            file_path = result.get("key", "")
            table.add_row(file_path)
        
        console.print(table)
    
    def _display_code_match_results(self, results: List[Dict[str, Any]]):
        """Display code match results"""
        console.print("\n[bold]CODE MATCHES[/bold]")
        
        for result in results:
            data = result.get("data", {})
            file_path = data.get("file_path", "")
            line_number = data.get("line_number", 0)
            match = data.get("match", "")
            context = data.get("context", "")
            
            panel_content = []
            panel_content.append(f"[bold]{file_path}:{line_number}[/bold]")
            panel_content.append("\n[dim]Context:[/dim]")
            
            # Highlight the matching part in the context
            highlighted_context = context.replace(match, f"[bold yellow]{match}[/bold yellow]")
            panel_content.append(highlighted_context)
            
            console.print(Panel("\n".join(panel_content)))
    
    def _display_missing_item_results(self, result_type: str, results: List[Dict[str, Any]]):
        """Display missing item results"""
        type_name = result_type.replace("missing_", "").replace("_", " ").title()
        console.print(f"\n[bold]MISSING {type_name.upper()}S[/bold]")
        
        for result in results:
            data = result.get("data", {})
            
            if result_type == "missing_endpoint":
                method = data.get("method", "").upper()
                path = data.get("path", "")
                sources = ", ".join(data.get("sources", []))
                
                panel_content = []
                panel_content.append(f"[bold]{method} {path}[/bold]")
                panel_content.append(f"[dim]Used in:[/dim] {sources}")
                panel_content.append("[green][dim]Suggestion:[/dim] Create endpoint handler[/green]")
                
                console.print(Panel("\n".join(panel_content), border_style="red"))
            else:
                # Handle other missing item types (validations, returns, etc.)
                description = data.get("description", "")
                location = f"{data.get('file_path', '')}:{data.get('line_number', '')}"
                code_snippet = data.get("code_snippet", "")
                fix_suggestion = data.get("fix_suggestion", "")
                
                panel_content = []
                panel_content.append(f"[bold]{description}[/bold]")
                panel_content.append(f"[dim]Location:[/dim] {location}")
                
                if code_snippet:
                    panel_content.append("\n[dim]Code:[/dim]")
                    panel_content.append(Syntax(code_snippet, "typescript", theme="monokai", line_numbers=False))
                
                if fix_suggestion:
                    panel_content.append(f"[green][dim]Suggestion:[/dim] {fix_suggestion}[/green]")
                
                console.print(Panel("\n".join([str(item) for item in panel_content]), border_style="red"))
    
    def _display_generic_results(self, results: List[Dict[str, Any]]):
        """Display generic results"""
        console.print("\n[bold]RESULTS[/bold]")
        
        table = Table(show_header=True, header_style="bold")
        table.add_column("Type")
        table.add_column("Key")
        table.add_column("Details")
        
        for result in results:
            result_type = result.get("type", "unknown")
            key = result.get("key", "")
            
            data = result.get("data", {})
            details = json.dumps(data, indent=2)
            
            table.add_row(
                result_type,
                key,
                details
            )
        
        console.print(table)

def run_query_interface():
    """Run the query interface as an interactive CLI"""
    console.print("[bold cyan]Welcome to the Project Code Query Interface[/bold cyan]")
    console.print("Type your questions about the codebase in natural language.\n")
    console.print("Examples:")
    console.print("- [green]Who uses photoId parameter?[/green]")
    console.print("- [green]Find all GET endpoints that return users[/green]")
    console.print("- [green]Show me all functions missing return statements[/green]")
    console.print("- [green]List all unused API endpoints[/green]")
    console.print("- [green]Where are try blocks without catch?[/green]")
    console.print("\nType [bold cyan]'exit'[/bold cyan] or [bold cyan]'quit'[/bold cyan] to exit.")
    
    # Check if analysis results exist
    analysis_file = "analysis_results.json"
    if not os.path.exists(analysis_file):
        console.print("[yellow]Analysis results not found. Running analysis first...[/yellow]")
        
        from analyzer import ProjectAnalyzer
        analyzer = ProjectAnalyzer(".")
        analysis_results = analyzer.analyze_project()
        
        with open(analysis_file, 'w') as f:
            json.dump({
                "endpoints": {k: v.dict() for k, v in analysis_results["endpoints"].items()},
                "functions": {k: v.dict() for k, v in analysis_results["functions"].items()},
                "issues": [issue.dict() for issue in analysis_results["issues"]],
                "italian_to_english": analysis_results["italian_to_english"]
            }, f, indent=2)
        
        console.print("[green]Analysis complete. Results saved to analysis_results.json[/green]\n")
    
    query_engine = CodeQuery(analysis_file, ".")
    
    while True:
        try:
            user_input = Prompt.ask("\n[bold cyan]Query[/bold cyan]")
            
            if user_input.lower() in ["exit", "quit", "q"]:
                break
            
            if not user_input.strip():
                continue
            
            if user_input.lower().startswith("search "):
                # This is a regex search
                pattern = user_input[7:].strip()
                console.print(f"[yellow]Searching code for pattern: {pattern}[/yellow]")
                
                results = query_engine.search_code(pattern)
                query_engine.display_results(results)
            else:
                # This is a natural language query
                results = query_engine.query(user_input)
                query_engine.display_results(results)
        
        except KeyboardInterrupt:
            console.print("\n[yellow]Operation cancelled[/yellow]")
        except Exception as e:
            console.print(f"[red]Error processing query: {e}[/red]")
    
    console.print("[bold cyan]Thank you for using the Project Code Query Interface[/bold cyan]")

@app.command()
def query(query_string: str = typer.Argument(None, help="Natural language query about the codebase")):
    """Run a single query or start the interactive interface"""
    if query_string:
        # Run a single query
        query_engine = CodeQuery("analysis_results.json", ".")
        results = query_engine.query(query_string)
        query_engine.display_results(results)
    else:
        # Start interactive interface
        run_query_interface()

@app.command()
def search(pattern: str, directory: str = None):
    """Search for code using regex patterns"""
    query_engine = CodeQuery("analysis_results.json", ".")
    results = query_engine.search_code(pattern, directory)
    query_engine.display_results(results)

if __name__ == "__main__":
    app()
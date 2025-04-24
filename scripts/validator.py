#!/usr/bin/env python3
"""
validator.py - Module for validating project structure and code quality
Processes analyzer results to identify issues and inconsistencies
"""

import json
import os
from typing import Dict, List, Any, Set, Optional
from pathlib import Path
from pydantic import BaseModel
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()

class ValidationResult(BaseModel):
    """Model for a validation result"""
    severity: str  # "error", "warning", "info", "suggestion"
    category: str  # "api", "function", "structure", "data", "logic"
    message: str
    details: Optional[str] = None
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    fix_suggestion: Optional[str] = None

class ProjectValidator:
    def __init__(self, analysis_results_path: str):
        """Initialize with the path to the analysis results JSON file"""
        self.results_path = analysis_results_path
        self.analysis_results = self._load_analysis_results()
        self.validation_results: List[ValidationResult] = []
        
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
    
    def validate_project(self) -> List[ValidationResult]:
        """Run all validators and return validation results"""
        # Validate API endpoints
        self._validate_api_endpoints()
        
        # Validate functions and code structure
        self._validate_functions()
        
        # Validate naming conventions and language consistency
        self._validate_naming_conventions()
        
        # Validate project structure
        self._validate_project_structure()
        
        # Process already detected issues
        self._process_analysis_issues()
        
        return self.validation_results
    
    def _validate_api_endpoints(self):
        """Validate API endpoints for consistency and coverage"""
        endpoints = self.analysis_results.get("endpoints", {})
        
        # Check for undefined but used endpoints
        undefined_endpoints = [
            e for k, e in endpoints.items() 
            if e.get("is_used", False) and not e.get("is_defined", False)
        ]
        
        for endpoint in undefined_endpoints:
            sources = endpoint.get("sources", [])
            source_info = f" (used in {len(sources)} files)" if sources else ""
            
            self.validation_results.append(ValidationResult(
                severity="error",
                category="api",
                message=f"API endpoint {endpoint['method'].upper()} {endpoint['path']} is used but not defined{source_info}",
                details=f"This endpoint is referenced in client code but isn't defined in any route handler",
                file_path=endpoint.get("file_path"),
                line_number=endpoint.get("line_number"),
                fix_suggestion=f"Create a route handler for {endpoint['method'].upper()} {endpoint['path']}"
            ))
        
        # Check for defined but unused endpoints
        unused_endpoints = [
            e for k, e in endpoints.items() 
            if e.get("is_defined", False) and not e.get("is_used", False)
        ]
        
        for endpoint in unused_endpoints:
            self.validation_results.append(ValidationResult(
                severity="warning",
                category="api",
                message=f"API endpoint {endpoint['method'].upper()} {endpoint['path']} is defined but not used",
                details=f"This endpoint exists in the backend but is not referenced in client code",
                file_path=endpoint.get("file_path"),
                line_number=endpoint.get("line_number"),
                fix_suggestion="Consider documenting or removing this unused endpoint"
            ))
        
        # Check for parameter consistency in related endpoints
        italian_to_english = self.analysis_results.get("italian_to_english", {})
        
        for italian, english in italian_to_english.items():
            # Find endpoints with these paths
            italian_endpoints = [e for k, e in endpoints.items() if italian in k]
            english_endpoints = [e for k, e in endpoints.items() if english in k]
            
            for i_endpoint in italian_endpoints:
                for e_endpoint in english_endpoints:
                    if i_endpoint.get("method") == e_endpoint.get("method"):
                        # Compare parameters
                        i_params = set(i_endpoint.get("parameters", []))
                        e_params = set(e_endpoint.get("parameters", []))
                        
                        if i_params != e_params:
                            missing_in_english = i_params - e_params
                            missing_in_italian = e_params - i_params
                            
                            details = []
                            if missing_in_english:
                                details.append(f"Parameters in Italian but missing in English: {', '.join(missing_in_english)}")
                            if missing_in_italian:
                                details.append(f"Parameters in English but missing in Italian: {', '.join(missing_in_italian)}")
                            
                            self.validation_results.append(ValidationResult(
                                severity="warning",
                                category="api",
                                message=f"Parameter inconsistency between Italian and English endpoints",
                                details="\n".join(details),
                                file_path=e_endpoint.get("file_path"),
                                line_number=e_endpoint.get("line_number"),
                                fix_suggestion="Ensure parameter consistency between translated endpoints"
                            ))
    
    def _validate_functions(self):
        """Validate functions for common issues"""
        functions = self.analysis_results.get("functions", {})
        
        # Check for functions with similar names
        function_names = list(functions.keys())
        similar_functions = {}
        
        for i, name1 in enumerate(function_names):
            for name2 in function_names[i+1:]:
                # Check for similarity (name differs by only a few characters)
                if name1 != name2 and (
                    name1 in name2 or name2 in name1 or
                    (len(name1) > 5 and len(name2) > 5 and 
                     (name1.lower()[:5] == name2.lower()[:5] or name1.lower()[-5:] == name2.lower()[-5:]))
                ):
                    if name1 not in similar_functions:
                        similar_functions[name1] = []
                    similar_functions[name1].append(name2)
        
        for name, similar_names in similar_functions.items():
            func = functions[name]
            self.validation_results.append(ValidationResult(
                severity="warning",
                category="function",
                message=f"Function '{name}' has similar names to: {', '.join(similar_names)}",
                details="Functions with similar names can lead to confusion",
                file_path=func.get("file_path"),
                line_number=func.get("line_number"),
                fix_suggestion="Consider renaming to better differentiate these functions"
            ))
        
        # Check for functions missing return statements
        for name, func in functions.items():
            if not func.get("has_return", True) and not any(prefix in name.lower() for prefix in ["set", "init", "create", "handle", "render", "update"]):
                # Function doesn't have a return statement and name doesn't suggest it's a void function
                self.validation_results.append(ValidationResult(
                    severity="info",
                    category="function",
                    message=f"Function '{name}' may be missing a return statement",
                    details="The function doesn't contain a return statement, but its name doesn't suggest it's a void function",
                    file_path=func.get("file_path"),
                    line_number=func.get("line_number"),
                    fix_suggestion="Add a return statement or rename to indicate void function"
                ))
    
    def _validate_naming_conventions(self):
        """Validate naming conventions and language consistency"""
        # Check for mixed Italian/English naming in the same file
        endpoints = self.analysis_results.get("endpoints", {})
        
        file_to_languages = {}
        for k, endpoint in endpoints.items():
            file_path = endpoint.get("file_path", "")
            if not file_path:
                continue
            
            # Detect language based on common terms
            language = "unknown"
            path = endpoint.get("path", "")
            
            italian_terms = ["collaboratori", "eventi", "utenti", "clienti", "pagamenti", "montaggi"]
            english_terms = ["collaborators", "events", "users", "clients", "payments", "editing"]
            
            if any(term in path for term in italian_terms):
                language = "italian"
            elif any(term in path for term in english_terms):
                language = "english"
            
            if language != "unknown":
                if file_path not in file_to_languages:
                    file_to_languages[file_path] = set()
                file_to_languages[file_path].add(language)
        
        for file_path, languages in file_to_languages.items():
            if len(languages) > 1:
                self.validation_results.append(ValidationResult(
                    severity="warning",
                    category="naming",
                    message=f"File {file_path} contains mixed Italian and English naming",
                    details="Consistent naming convention helps with code maintenance",
                    file_path=file_path,
                    fix_suggestion="Standardize on either Italian or English naming within each file"
                ))
    
    def _validate_project_structure(self):
        """Validate overall project structure"""
        # This is a placeholder for additional structure validations
        # Currently handled in analyzer.py
        pass
    
    def _process_analysis_issues(self):
        """Process issues already detected by the analyzer"""
        issues = self.analysis_results.get("issues", [])
        
        for issue in issues:
            severity = issue.get("severity", "warning")
            issue_type = issue.get("issue_type", "unknown")
            
            category = "logic"
            if "if" in issue_type or "try" in issue_type or "switch" in issue_type:
                category = "control_flow"
            elif "validation" in issue_type:
                category = "security"
            elif "return" in issue_type:
                category = "function"
            
            self.validation_results.append(ValidationResult(
                severity=severity,
                category=category,
                message=issue.get("description", "Unknown issue"),
                details=issue.get("code_snippet", ""),
                file_path=issue.get("file_path"),
                line_number=issue.get("line_number"),
                fix_suggestion=issue.get("fix_suggestion")
            ))
    
    def generate_report(self) -> str:
        """Generate a readable report of validation results"""
        report = []
        
        # Group by category
        validation_by_category = {}
        for validation in self.validation_results:
            category = validation.category
            if category not in validation_by_category:
                validation_by_category[category] = []
            validation_by_category[category].append(validation)
        
        for category, validations in validation_by_category.items():
            # Group by severity
            by_severity = {
                "error": [],
                "warning": [],
                "info": [],
                "suggestion": []
            }
            
            for v in validations:
                if v.severity in by_severity:
                    by_severity[v.severity].append(v)
                else:
                    by_severity["info"].append(v)
            
            # Generate category report
            category_title = f"== {category.upper()} VALIDATION RESULTS =="
            report.append(category_title)
            report.append("=" * len(category_title))
            report.append("")
            
            for severity in ["error", "warning", "info", "suggestion"]:
                items = by_severity[severity]
                if not items:
                    continue
                
                report.append(f"{severity.upper()}: {len(items)} issues found")
                report.append("-" * 40)
                
                for item in items:
                    report.append(f"* {item.message}")
                    if item.file_path:
                        location = f"{item.file_path}"
                        if item.line_number:
                            location += f":{item.line_number}"
                        report.append(f"  Location: {location}")
                    if item.details:
                        report.append(f"  Details: {item.details}")
                    if item.fix_suggestion:
                        report.append(f"  Suggestion: {item.fix_suggestion}")
                    report.append("")
            
            report.append("")
        
        return "\n".join(report)
    
    def display_report(self):
        """Display the validation report using rich formatting"""
        # Group by category and severity
        validation_by_category = {}
        for validation in self.validation_results:
            category = validation.category
            if category not in validation_by_category:
                validation_by_category[category] = {
                    "error": [],
                    "warning": [],
                    "info": [],
                    "suggestion": []
                }
            
            severity = validation.severity
            if severity not in validation_by_category[category]:
                validation_by_category[category][severity] = []
            
            validation_by_category[category][severity].append(validation)
        
        # Display summary
        console.print("\n[bold cyan]== PROJECT VALIDATION REPORT ==[/bold cyan]")
        
        summary_table = Table(show_header=True, header_style="bold")
        summary_table.add_column("Category")
        summary_table.add_column("Errors", justify="right")
        summary_table.add_column("Warnings", justify="right")
        summary_table.add_column("Info", justify="right")
        summary_table.add_column("Suggestions", justify="right")
        summary_table.add_column("Total", justify="right")
        
        total_errors = 0
        total_warnings = 0
        total_info = 0
        total_suggestions = 0
        
        for category, by_severity in validation_by_category.items():
            error_count = len(by_severity["error"])
            warning_count = len(by_severity["warning"])
            info_count = len(by_severity["info"])
            suggestion_count = len(by_severity["suggestion"])
            total = error_count + warning_count + info_count + suggestion_count
            
            total_errors += error_count
            total_warnings += warning_count
            total_info += info_count
            total_suggestions += suggestion_count
            
            summary_table.add_row(
                category.capitalize(),
                f"[red]{error_count}[/red]" if error_count > 0 else "0",
                f"[yellow]{warning_count}[/yellow]" if warning_count > 0 else "0",
                f"[blue]{info_count}[/blue]" if info_count > 0 else "0",
                f"[green]{suggestion_count}[/green]" if suggestion_count > 0 else "0",
                str(total)
            )
        
        total_all = total_errors + total_warnings + total_info + total_suggestions
        summary_table.add_row(
            "[bold]Total[/bold]",
            f"[bold red]{total_errors}[/bold red]" if total_errors > 0 else "0",
            f"[bold yellow]{total_warnings}[/bold yellow]" if total_warnings > 0 else "0",
            f"[bold blue]{total_info}[/bold blue]" if total_info > 0 else "0",
            f"[bold green]{total_suggestions}[/bold green]" if total_suggestions > 0 else "0",
            f"[bold]{total_all}[/bold]"
        )
        
        console.print(summary_table)
        console.print("")
        
        # Display detailed results
        for category, by_severity in validation_by_category.items():
            console.print(f"\n[bold cyan]== {category.upper()} VALIDATION RESULTS ==[/bold cyan]")
            
            for severity in ["error", "warning", "info", "suggestion"]:
                items = by_severity[severity]
                if not items:
                    continue
                
                severity_color = {
                    "error": "red",
                    "warning": "yellow",
                    "info": "blue",
                    "suggestion": "green"
                }.get(severity, "white")
                
                console.print(f"\n[bold {severity_color}]{severity.upper()}: {len(items)} issues found[/bold {severity_color}]")
                
                for item in items:
                    panel_content = []
                    panel_content.append(f"[bold]{item.message}[/bold]")
                    
                    if item.file_path:
                        location = f"{item.file_path}"
                        if item.line_number:
                            location += f":{item.line_number}"
                        panel_content.append(f"[dim]Location:[/dim] {location}")
                    
                    if item.details:
                        panel_content.append(f"[dim]Details:[/dim] {item.details}")
                    
                    if item.fix_suggestion:
                        panel_content.append(f"[green][dim]Suggestion:[/dim] {item.fix_suggestion}[/green]")
                    
                    console.print(Panel(
                        "\n".join(panel_content),
                        border_style=severity_color,
                        expand=False
                    ))
        
        console.print("\n[bold cyan]== END OF REPORT ==[/bold cyan]")

if __name__ == "__main__":
    validator = ProjectValidator("analysis_results.json")
    results = validator.validate_project()
    validator.display_report()
    
    # Also save the report to a file
    with open("validation_report.txt", "w") as f:
        f.write(validator.generate_report())
#!/usr/bin/env python3
"""
main.py - Main entry point for the PhotoMaster Project Diagnostics System
Orchestrates the analysis, validation, fixing and querying of the codebase
"""

import os
import sys
import json
from pathlib import Path
import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from typing import Optional, List

# Import project modules
from scripts.analyzer import ProjectAnalyzer
from scripts.validator import ProjectValidator
from scripts.fixer import ProjectFixer
from scripts.query_interface import run_query_interface, CodeQuery

app = typer.Typer()
console = Console()

@app.command()
def analyze(
    project_path: str = typer.Option(".", help="Path to the project root"),
    output_file: str = typer.Option("analysis_results.json", help="Output file for analysis results")
):
    """Analyze the project codebase and save results to a JSON file"""
    console.print(Panel("📊 [bold cyan]PhotoMaster Project Diagnostics System - Analyzer[/bold cyan]"))
    console.print(f"Analyzing project at [bold]{project_path}[/bold]")
    
    analyzer = ProjectAnalyzer(project_path)
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
    ) as progress:
        progress_task = progress.add_task("[cyan]Analyzing project...", total=None)
        results = analyzer.analyze_project()
        progress.update(progress_task, completed=True)
    
    # Save results to JSON file
    with open(output_file, 'w') as f:
        json.dump({
            "endpoints": {k: v.dict() for k, v in results["endpoints"].items()},
            "functions": {k: v.dict() for k, v in results["functions"].items()},
            "issues": [issue.dict() for issue in results["issues"]],
            "italian_to_english": results["italian_to_english"]
        }, f, indent=2)
    
    console.print(f"\n✅ Analysis complete! Results saved to [bold]{output_file}[/bold]")
    console.print(f"\nStatistics:")
    console.print(f"- API Endpoints: {len(results['endpoints'])}")
    console.print(f"- Functions: {len(results['functions'])}")
    console.print(f"- Issues detected: {len(results['issues'])}")
    console.print(f"- Italian/English mappings: {len(results['italian_to_english'])}")

@app.command()
def validate(
    analysis_file: str = typer.Option("analysis_results.json", help="Analysis results JSON file"),
    output_file: str = typer.Option("validation_results.json", help="Output file for validation results")
):
    """Validate the project codebase using analysis results"""
    console.print(Panel("🔍 [bold cyan]PhotoMaster Project Diagnostics System - Validator[/bold cyan]"))
    
    if not os.path.exists(analysis_file):
        console.print(f"[red]Error: Analysis file {analysis_file} not found[/red]")
        console.print("Run the 'analyze' command first.")
        return
    
    console.print(f"Validating project using analysis from [bold]{analysis_file}[/bold]")
    
    validator = ProjectValidator(analysis_file)
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
    ) as progress:
        progress_task = progress.add_task("[cyan]Validating project...", total=None)
        results = validator.validate_project()
        progress.update(progress_task, completed=True)
    
    # Save results to JSON file
    with open(output_file, 'w') as f:
        json.dump({
            "results": [result.dict() for result in results]
        }, f, indent=2)
    
    # Display validation report
    validator.display_report()
    
    console.print(f"\n✅ Validation complete! Results saved to [bold]{output_file}[/bold]")
    console.print(f"\nSummary:")
    
    # Count issues by severity
    severity_counts = {"error": 0, "warning": 0, "info": 0, "suggestion": 0}
    for result in results:
        severity = result.severity
        if severity in severity_counts:
            severity_counts[severity] += 1
    
    console.print(f"- Errors: {severity_counts['error']}")
    console.print(f"- Warnings: {severity_counts['warning']}")
    console.print(f"- Info: {severity_counts['info']}")
    console.print(f"- Suggestions: {severity_counts['suggestion']}")

@app.command()
def fix(
    validation_file: str = typer.Option("validation_results.json", help="Validation results JSON file"),
    project_path: str = typer.Option(".", help="Path to the project root"),
    output_file: str = typer.Option("fix_report.txt", help="Output file for fix report"),
    dry_run: bool = typer.Option(True, help="Run in dry-run mode without making changes")
):
    """Generate fixes for issues found during validation"""
    console.print(Panel("🔧 [bold cyan]PhotoMaster Project Diagnostics System - Fixer[/bold cyan]"))
    
    if not os.path.exists(validation_file):
        console.print(f"[red]Error: Validation file {validation_file} not found[/red]")
        console.print("Run the 'validate' command first.")
        return
    
    mode = "dry run" if dry_run else "apply changes"
    console.print(f"Generating fixes using validation from [bold]{validation_file}[/bold] ({mode} mode)")
    
    fixer = ProjectFixer(validation_file, project_path)
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
    ) as progress:
        progress_task = progress.add_task("[cyan]Generating fixes...", total=None)
        fixes = fixer.generate_fixes()
        progress.update(progress_task, completed=True)
    
    # Display fixes
    fixer.display_fixes()
    
    # Apply fixes
    applied = fixer.apply_fixes(dry_run=dry_run)
    
    # Save fix report
    with open(output_file, 'w') as f:
        f.write(fixer.generate_fix_report())
    
    console.print(f"\n✅ Fix generation complete! Report saved to [bold]{output_file}[/bold]")
    console.print(f"\nSummary:")
    console.print(f"- Generated {len(fixes)} fixes")
    
    if not dry_run:
        console.print(f"- Applied fixes to {len(applied)} files")
    else:
        console.print(f"[yellow]Note: Changes were not applied because dry_run=True[/yellow]")
        console.print(f"To apply changes, run with --no-dry-run")

@app.command()
def query(
    query_string: Optional[str] = typer.Argument(None, help="Query string"),
    analysis_file: str = typer.Option("analysis_results.json", help="Analysis results JSON file"),
    project_path: str = typer.Option(".", help="Path to the project root")
):
    """Query the codebase using natural language"""
    console.print(Panel("🔎 [bold cyan]PhotoMaster Project Diagnostics System - Query Interface[/bold cyan]"))
    
    if not os.path.exists(analysis_file):
        console.print(f"[red]Error: Analysis file {analysis_file} not found[/red]")
        console.print("Run the 'analyze' command first.")
        return
    
    if query_string:
        # Run a single query
        query_engine = CodeQuery(analysis_file, project_path)
        results = query_engine.query(query_string)
        query_engine.display_results(results)
    else:
        # Start interactive interface
        run_query_interface()

@app.command()
def search(
    pattern: str = typer.Argument(..., help="Regex pattern to search for"),
    directory: Optional[str] = typer.Option(None, help="Directory to search in"),
    analysis_file: str = typer.Option("analysis_results.json", help="Analysis results JSON file"),
    project_path: str = typer.Option(".", help="Path to the project root")
):
    """Search the codebase using regex patterns"""
    console.print(Panel("🔍 [bold cyan]PhotoMaster Project Diagnostics System - Code Search[/bold cyan]"))
    
    if not os.path.exists(analysis_file):
        console.print(f"[yellow]Warning: Analysis file {analysis_file} not found[/yellow]")
        console.print("Some search features may be limited.")
    
    query_engine = CodeQuery(analysis_file, project_path)
    results = query_engine.search_code(pattern, directory)
    query_engine.display_results(results)

@app.command()
def run_all(
    project_path: str = typer.Option(".", help="Path to the project root"),
    dry_run: bool = typer.Option(True, help="Run fixes in dry-run mode")
):
    """Run the complete analysis pipeline: analyze, validate, and generate fixes"""
    console.print(Panel("🚀 [bold cyan]PhotoMaster Project Diagnostics System - Full Pipeline[/bold cyan]"))
    
    # Step 1: Analyze
    console.print(Panel("[bold]Step 1: Analyzing Project[/bold]"))
    analyze(project_path=project_path)
    
    # Step 2: Validate
    console.print(Panel("[bold]Step 2: Validating Project[/bold]"))
    validate()
    
    # Step 3: Generate fixes
    console.print(Panel("[bold]Step 3: Generating Fixes[/bold]"))
    fix(dry_run=dry_run)
    
    console.print("\n✅ [bold green]Complete pipeline execution finished![/bold green]")
    console.print("You can now use the 'query' command to explore the results.")

@app.callback()
def main():
    """
    PhotoMaster Project Diagnostics System
    
    A comprehensive toolset for analyzing, validating, fixing, and querying the PhotoMaster codebase.
    """
    pass

if __name__ == "__main__":
    app()
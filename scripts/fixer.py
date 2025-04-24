#!/usr/bin/env python3
"""
fixer.py - Module for generating fixes for issues found in the project
Generates code snippets, placeholder implementations, and adds TODOs
"""

import os
import re
import json
from typing import Dict, List, Any, Set, Optional, Tuple
from pathlib import Path
from pydantic import BaseModel, Field
from rich.console import Console
from rich.syntax import Syntax
from rich.panel import Panel

console = Console()

class CodeFix(BaseModel):
    """Model for a code fix"""
    file_path: str
    line_start: int
    line_end: Optional[int] = None
    original_code: str
    new_code: str
    issue_description: str
    fix_type: str  # "add", "replace", "delete", "todo"
    
    def __str__(self) -> str:
        return f"Fix in {self.file_path}:{self.line_start}-{self.line_end or self.line_start}"

class ProjectFixer:
    def __init__(self, validation_results_path: str, project_root: str):
        """Initialize with the path to the validation results JSON file"""
        self.results_path = validation_results_path
        self.project_root = Path(project_root)
        self.validation_results = self._load_validation_results()
        self.fixes: List[CodeFix] = []
        self.file_cache: Dict[str, List[str]] = {}
        
    def _load_validation_results(self) -> Dict[str, Any]:
        """Load validation results from JSON file"""
        try:
            with open(self.results_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            console.print(f"[red]Error loading validation results: {e}[/red]")
            return {"results": []}
    
    def generate_fixes(self) -> List[CodeFix]:
        """Generate fixes for validation issues"""
        results = self.validation_results.get("results", [])
        
        # Group fixes by file for more efficient processing
        fixes_by_file: Dict[str, List[Dict[str, Any]]] = {}
        
        for result in results:
            file_path = result.get("file_path")
            if not file_path or not os.path.exists(file_path):
                continue
                
            if file_path not in fixes_by_file:
                fixes_by_file[file_path] = []
            
            fixes_by_file[file_path].append(result)
        
        # Process files one by one
        for file_path, issues in fixes_by_file.items():
            self._generate_fixes_for_file(file_path, issues)
        
        return self.fixes
    
    def _generate_fixes_for_file(self, file_path: str, issues: List[Dict[str, Any]]):
        """Generate fixes for issues in a single file"""
        content = self._get_file_content(file_path)
        
        for issue in issues:
            severity = issue.get("severity", "")
            category = issue.get("category", "")
            message = issue.get("message", "")
            fix_suggestion = issue.get("fix_suggestion", "")
            line_number = issue.get("line_number", 0)
            
            if not line_number or line_number > len(content):
                continue  # Skip issues without valid line numbers
            
            # Generate appropriate fix based on issue type
            if "API endpoint" in message and "is used but not defined" in message:
                self._generate_api_endpoint_fix(file_path, issue, content)
            elif "try without catch" in message.lower():
                self._add_catch_block(file_path, issue, content)
            elif "if without else" in message.lower():
                self._add_else_branch(file_path, issue, content)
            elif "switch without default" in message.lower():
                self._add_default_case(file_path, issue, content)
            elif "missing validation" in message.lower():
                self._add_validation(file_path, issue, content)
            elif "missing return" in message.lower():
                self._add_return_statement(file_path, issue, content)
            elif "similar" in message.lower() and "function" in message.lower():
                self._add_duplicate_function_comment(file_path, issue, content)
    
    def _generate_api_endpoint_fix(self, file_path: str, issue: Dict[str, Any], content: List[str]):
        """Generate a fix for a missing API endpoint"""
        message = issue.get("message", "")
        
        # Extract method and path from the message
        match = re.search(r'API endpoint ([A-Z]+) (/[^\s]+)', message)
        if not match:
            return
        
        method = match.group(1).lower()
        path = match.group(2)
        
        # Determine target file for the endpoint
        target_file = self._find_best_route_file(path)
        
        if not target_file:
            # Default to routes.ts if no better match
            target_file = "server/routes.ts"
        
        # Generate endpoint code
        endpoint_code = self._generate_endpoint_code(method, path)
        
        # Add the fix
        target_content = self._get_file_content(target_file)
        
        # Find appropriate insertion point
        insertion_line = self._find_insertion_point(target_file, target_content, method, path)
        
        self.fixes.append(CodeFix(
            file_path=target_file,
            line_start=insertion_line,
            line_end=insertion_line,
            original_code="",
            new_code=endpoint_code,
            issue_description=f"Missing API endpoint: {method.upper()} {path}",
            fix_type="add"
        ))
    
    def _find_best_route_file(self, path: str) -> str:
        """Find the best route file for a given API path"""
        path_parts = path.split('/')
        
        if len(path_parts) >= 3 and path_parts[1] == "api":
            resource = path_parts[2]
            
            # Check for common route files
            candidates = [
                f"server/routes/{resource}-routes.ts",
                f"server/routes/{resource}.ts",
                f"server/controllers/{resource}-controller.ts",
                f"server/controllers/{resource}Controller.ts"
            ]
            
            for candidate in candidates:
                if os.path.exists(candidate):
                    return candidate
        
        # Fall back to main routes file
        if os.path.exists("server/routes.ts"):
            return "server/routes.ts"
        
        return ""
    
    def _generate_endpoint_code(self, method: str, path: str) -> str:
        """Generate code for a new API endpoint"""
        resource = path.split('/')[-1]
        
        # Extract parameters from path
        params = re.findall(r':([a-zA-Z0-9_]+)', path)
        param_validations = []
        
        for param in params:
            param_type = "number" if param.endswith("Id") else "string"
            if param_type == "number":
                param_validations.append(f"  const {param} = parseInt(req.params.{param});")
                param_validations.append(f"  if (isNaN({param})) {{")
                param_validations.append(f"    return res.status(400).json({{ message: \"Invalid {param}\" }});")
                param_validations.append(f"  }}")
            else:
                param_validations.append(f"  const {param} = req.params.{param};\n")
        
        param_validation_code = "".join(param_validations)
        
        # Generate the endpoint code
        if method == "get":
            code = f"""
// TODO: Implement {method.upper()} {path} endpoint
apiRouter.{method}("{path}", async (req, res) => {{
  try {{
{param_validation_code}    
    // Fetch the requested data
    // const data = await storage.get{resource.capitalize()}(/* parameters */);
    
    // Send response
    res.json({{ message: "Not implemented yet" }});
  }} catch (err) {{
    console.error("Error in {method.upper()} {path}:", err);
    res.status(500).json({{ message: "Internal server error" }});
  }}
}});
"""
        elif method == "post":
            code = f"""
// TODO: Implement {method.upper()} {path} endpoint
apiRouter.{method}("{path}", async (req, res) => {{
  try {{
{param_validation_code}
    // Validate request body
    // const parseResult = createSchema.safeParse(req.body);
    // if (!parseResult.success) {{
    //   return res.status(400).json({{ message: "Invalid request data" }});
    // }}
    
    // Create the resource
    // const newResource = await storage.create{resource.capitalize()}(/* parameters */);
    
    // Send response
    res.status(201).json({{ message: "Resource created (not implemented)" }});
  }} catch (err) {{
    console.error("Error in {method.upper()} {path}:", err);
    res.status(500).json({{ message: "Internal server error" }});
  }}
}});
"""
        elif method in ["put", "patch"]:
            code = f"""
// TODO: Implement {method.upper()} {path} endpoint
apiRouter.{method}("{path}", async (req, res) => {{
  try {{
{param_validation_code}
    // Validate request body
    // const parseResult = updateSchema.safeParse(req.body);
    // if (!parseResult.success) {{
    //   return res.status(400).json({{ message: "Invalid request data" }});
    // }}
    
    // Update the resource
    // const updatedResource = await storage.update{resource.capitalize()}(/* parameters */);
    
    // Send response
    res.json({{ message: "Resource updated (not implemented)" }});
  }} catch (err) {{
    console.error("Error in {method.upper()} {path}:", err);
    res.status(500).json({{ message: "Internal server error" }});
  }}
}});
"""
        elif method == "delete":
            code = f"""
// TODO: Implement {method.upper()} {path} endpoint
apiRouter.{method}("{path}", async (req, res) => {{
  try {{
{param_validation_code}
    // Delete the resource
    // const success = await storage.delete{resource.capitalize()}(/* parameters */);
    
    // Send response
    res.status(204).send();
  }} catch (err) {{
    console.error("Error in {method.upper()} {path}:", err);
    res.status(500).json({{ message: "Internal server error" }});
  }}
}});
"""
        else:
            # Generic handler for other methods
            code = f"""
// TODO: Implement {method.upper()} {path} endpoint
apiRouter.{method}("{path}", async (req, res) => {{
  try {{
{param_validation_code}
    // Add implementation here
    
    // Send response
    res.json({{ message: "Not implemented yet" }});
  }} catch (err) {{
    console.error("Error in {method.upper()} {path}:", err);
    res.status(500).json({{ message: "Internal server error" }});
  }}
}});
"""
        
        return code
    
    def _find_insertion_point(self, file_path: str, content: List[str], method: str, path: str) -> int:
        """Find the best insertion point for a new API endpoint"""
        # Try to find similar routes for the same resource
        resource = path.split('/')[-1]
        
        for i, line in enumerate(content):
            if re.search(fr'apiRouter\.{method}\s*\(\s*[\'"`][^\'"]+{resource}', line):
                # Find the end of this route handler
                brace_count = line.count("{") - line.count("}")
                end_line = i
                
                if brace_count > 0:
                    for j in range(i + 1, len(content)):
                        brace_count += content[j].count("{") - content[j].count("}")
                        if brace_count <= 0:
                            end_line = j
                            break
                
                return end_line + 1
        
        # If no similar route found, find the end of the routes section
        for i, line in enumerate(content):
            if "return httpServer" in line or "export default" in line:
                # Insert before the end of the file or function
                return max(0, i - 1)
        
        # Default to the end of the file
        return len(content)
    
    def _add_catch_block(self, file_path: str, issue: Dict[str, Any], content: List[str]):
        """Add a catch block to a try statement"""
        line_number = issue.get("line_number", 0)
        if line_number <= 0 or line_number >= len(content):
            return
        
        # Find the end of the try block
        try_line = content[line_number - 1]
        if "try" not in try_line:
            # Search nearby lines for try
            for offset in range(-2, 3):
                check_line = line_number + offset
                if 0 < check_line < len(content) and "try" in content[check_line - 1]:
                    line_number = check_line
                    try_line = content[line_number - 1]
                    break
        
        brace_count = try_line.count("{") - try_line.count("}")
        end_line = line_number
        
        for i in range(line_number, min(line_number + 50, len(content))):
            line = content[i]
            brace_count += line.count("{") - line.count("}")
            
            if brace_count <= 0:
                end_line = i + 1
                break
        
        # Generate catch block
        indentation = re.match(r'^(\s*)', content[line_number - 1]).group(1)
        catch_block = f"{indentation}}} catch (error) {{\n{indentation}  console.error(\"Unhandled error:\", error);\n{indentation}}}"
        
        # Insert the catch block
        self.fixes.append(CodeFix(
            file_path=file_path,
            line_start=end_line,
            line_end=end_line,
            original_code="",
            new_code=catch_block,
            issue_description="Added missing catch block to try statement",
            fix_type="add"
        ))
    
    def _add_else_branch(self, file_path: str, issue: Dict[str, Any], content: List[str]):
        """Add an else branch to an if statement"""
        line_number = issue.get("line_number", 0)
        if line_number <= 0 or line_number >= len(content):
            return
        
        # Find the end of the if block
        if_line = content[line_number - 1]
        brace_count = if_line.count("{") - if_line.count("}")
        end_line = line_number
        has_else_if = False
        
        for i in range(line_number, min(line_number + 30, len(content))):
            line = content[i]
            brace_count += line.count("{") - line.count("}")
            
            if "else if" in line:
                has_else_if = True
            
            if brace_count <= 0:
                end_line = i + 1
                break
        
        # Don't add else if there are else-if branches (it's probably intentional)
        if has_else_if:
            return
        
        # Generate else block
        indentation = re.match(r'^(\s*)', content[line_number - 1]).group(1)
        else_block = f"{indentation}}} else {{\n{indentation}  // TODO: Handle default case\n{indentation}}}"
        
        # Insert the else block
        self.fixes.append(CodeFix(
            file_path=file_path,
            line_start=end_line,
            line_end=end_line,
            original_code="",
            new_code=else_block,
            issue_description="Added missing else branch to if statement",
            fix_type="add"
        ))
    
    def _add_default_case(self, file_path: str, issue: Dict[str, Any], content: List[str]):
        """Add a default case to a switch statement"""
        line_number = issue.get("line_number", 0)
        if line_number <= 0 or line_number >= len(content):
            return
        
        # Find the end of the switch block
        switch_line = content[line_number - 1]
        brace_count = switch_line.count("{") - switch_line.count("}")
        end_line = line_number
        
        for i in range(line_number, min(line_number + 50, len(content))):
            line = content[i]
            brace_count += line.count("{") - line.count("}")
            
            if brace_count <= 0:
                end_line = i
                break
        
        # Generate default case
        indentation = re.match(r'^(\s*)', content[line_number - 1]).group(1) + "  "
        default_case = f"{indentation}default:\n{indentation}  // TODO: Handle unexpected values\n{indentation}  break;"
        
        # Insert the default case before the closing brace
        self.fixes.append(CodeFix(
            file_path=file_path,
            line_start=end_line,
            line_end=end_line,
            original_code="",
            new_code=default_case,
            issue_description="Added missing default case to switch statement",
            fix_type="add"
        ))
    
    def _add_validation(self, file_path: str, issue: Dict[str, Any], content: List[str]):
        """Add input validation to a controller function"""
        line_number = issue.get("line_number", 0)
        if line_number <= 0 or line_number >= len(content):
            return
        
        # Find where to insert validation
        function_start = line_number - 1
        
        # Check if it's a controller function
        is_controller = False
        for i in range(max(0, line_number - 5), min(line_number + 5, len(content))):
            if "req" in content[i] and "res" in content[i]:
                is_controller = True
                break
        
        if not is_controller:
            return
        
        # Find the first line after function declaration with req.body or req.params
        insertion_line = None
        for i in range(function_start, min(function_start + 20, len(content))):
            if "req.body" in content[i] or "req.params" in content[i] or "req.query" in content[i]:
                # Insert before this line
                insertion_line = i
                break
        
        if insertion_line is None:
            # If no clear insertion point, insert after try {
            for i in range(function_start, min(function_start + 10, len(content))):
                if "try {" in content[i]:
                    insertion_line = i + 1
                    break
        
        if insertion_line is None:
            # Still no insertion point, use function start + 1
            insertion_line = function_start + 1
        
        # Determine what kind of validation to add
        validation_type = "body"
        if any("req.params" in content[i] for i in range(function_start, min(function_start + 20, len(content)))):
            validation_type = "params"
        elif any("req.query" in content[i] for i in range(function_start, min(function_start + 20, len(content)))):
            validation_type = "query"
        
        # Generate validation code
        indentation = re.match(r'^(\s*)', content[insertion_line]).group(1)
        
        if validation_type == "body":
            validation_code = f"{indentation}// Input validation\n{indentation}const parseResult = schema.safeParse(req.body);\n{indentation}if (!parseResult.success) {{\n{indentation}  const errorMessage = fromZodError(parseResult.error).message;\n{indentation}  return res.status(400).json({{ message: errorMessage }});\n{indentation}}}\n"
        elif validation_type == "params":
            validation_code = f"{indentation}// Parameter validation\n{indentation}const {{ id }} = req.params;\n{indentation}const numId = parseInt(id);\n{indentation}if (isNaN(numId)) {{\n{indentation}  return res.status(400).json({{ message: \"Invalid ID format\" }});\n{indentation}}}\n"
        else:  # query
            validation_code = f"{indentation}// Query validation\n{indentation}const query = req.query;\n{indentation}// TODO: Add specific query parameter validation\n"
        
        # Insert the validation code
        self.fixes.append(CodeFix(
            file_path=file_path,
            line_start=insertion_line,
            line_end=insertion_line,
            original_code="",
            new_code=validation_code,
            issue_description="Added missing input validation",
            fix_type="add"
        ))
    
    def _add_return_statement(self, file_path: str, issue: Dict[str, Any], content: List[str]):
        """Add a return statement to a function"""
        line_number = issue.get("line_number", 0)
        if line_number <= 0 or line_number >= len(content):
            return
        
        # Find the end of the function
        function_name = ""
        match = re.search(r'function\s+([a-zA-Z0-9_$]+)', content[line_number - 1])
        if match:
            function_name = match.group(1)
        else:
            match = re.search(r'const\s+([a-zA-Z0-9_$]+)\s*=', content[line_number - 1])
            if match:
                function_name = match.group(1)
        
        brace_count = content[line_number - 1].count("{") - content[line_number - 1].count("}")
        end_line = line_number
        
        for i in range(line_number, min(line_number + 100, len(content))):
            line = content[i]
            brace_count += line.count("{") - line.count("}")
            
            if brace_count <= 0:
                end_line = i
                break
        
        # Generate return statement
        indentation = re.match(r'^(\s*)', content[end_line - 1]).group(1)
        return_statement = f"{indentation}// TODO: Add appropriate return value\n{indentation}return undefined;\n"
        
        # Insert the return statement before the closing brace
        self.fixes.append(CodeFix(
            file_path=file_path,
            line_start=end_line,
            line_end=end_line,
            original_code="",
            new_code=return_statement,
            issue_description=f"Added missing return statement to function {function_name}",
            fix_type="add"
        ))
    
    def _add_duplicate_function_comment(self, file_path: str, issue: Dict[str, Any], content: List[str]):
        """Add a comment about a potential duplicate function"""
        line_number = issue.get("line_number", 0)
        if line_number <= 0 or line_number >= len(content):
            return
        
        # Get the function name and similar functions
        function_name = ""
        match = re.search(r'function\s+([a-zA-Z0-9_$]+)', content[line_number - 1])
        if match:
            function_name = match.group(1)
        else:
            match = re.search(r'const\s+([a-zA-Z0-9_$]+)\s*=', content[line_number - 1])
            if match:
                function_name = match.group(1)
        
        similar_names = []
        match = re.search(r'similar names to: ([^"]+)', issue.get("message", ""))
        if match:
            similar_names = [name.strip() for name in match.group(1).split(",")]
        
        if not function_name or not similar_names:
            return
        
        # Generate warning comment
        indentation = re.match(r'^(\s*)', content[line_number - 1]).group(1)
        comment = f"{indentation}// POSSIBLE DUPLICATE: This function is similar to {', '.join(similar_names)}\n"
        
        # Insert the comment before the function
        self.fixes.append(CodeFix(
            file_path=file_path,
            line_start=line_number - 1,
            line_end=line_number - 1,
            original_code="",
            new_code=comment,
            issue_description=f"Added warning about potentially duplicate function {function_name}",
            fix_type="add"
        ))
    
    def apply_fixes(self, dry_run: bool = True) -> Dict[str, List[str]]:
        """Apply fixes to files"""
        if not self.fixes:
            console.print("[yellow]No fixes to apply[/yellow]")
            return {}
        
        # Group fixes by file
        fixes_by_file: Dict[str, List[CodeFix]] = {}
        for fix in self.fixes:
            if fix.file_path not in fixes_by_file:
                fixes_by_file[fix.file_path] = []
            fixes_by_file[fix.file_path].append(fix)
        
        applied_fixes = {}
        
        for file_path, file_fixes in fixes_by_file.items():
            # Sort fixes by line number in reverse order (to avoid invalidating line numbers)
            file_fixes.sort(key=lambda f: f.line_start, reverse=True)
            
            # Apply fixes
            content = self._get_file_content(file_path)
            applied = []
            
            for fix in file_fixes:
                if fix.fix_type == "add":
                    # Insert new code
                    content.insert(fix.line_start, fix.new_code)
                    applied.append(f"Added: {fix.issue_description}")
                elif fix.fix_type == "replace":
                    # Replace code
                    line_end = fix.line_end or fix.line_start
                    content[fix.line_start - 1:line_end] = [fix.new_code]
                    applied.append(f"Replaced: {fix.issue_description}")
                elif fix.fix_type == "delete":
                    # Delete code
                    line_end = fix.line_end or fix.line_start
                    content[fix.line_start - 1:line_end] = []
                    applied.append(f"Deleted: {fix.issue_description}")
                elif fix.fix_type == "todo":
                    # Add TODO comment
                    indent = re.match(r'^(\s*)', content[fix.line_start - 1]).group(1)
                    content.insert(fix.line_start - 1, f"{indent}// TODO: {fix.issue_description}\n")
                    applied.append(f"Added TODO: {fix.issue_description}")
            
            # Update file
            if not dry_run:
                try:
                    with open(file_path, 'w') as f:
                        f.write(''.join(content))
                    console.print(f"[green]Applied {len(applied)} fixes to {file_path}[/green]")
                except Exception as e:
                    console.print(f"[red]Error writing to {file_path}: {e}[/red]")
            
            applied_fixes[file_path] = applied
        
        return applied_fixes
    
    def generate_fix_report(self) -> str:
        """Generate a human-readable report of fixes"""
        if not self.fixes:
            return "No fixes generated"
        
        report = ["== FIX REPORT ==", ""]
        
        # Group fixes by file
        fixes_by_file = {}
        for fix in self.fixes:
            if fix.file_path not in fixes_by_file:
                fixes_by_file[fix.file_path] = []
            fixes_by_file[fix.file_path].append(fix)
        
        # Generate report
        for file_path, file_fixes in fixes_by_file.items():
            report.append(f"File: {file_path}")
            report.append("-" * len(f"File: {file_path}"))
            
            for fix in file_fixes:
                fix_type = fix.fix_type.capitalize()
                location = f"Line {fix.line_start}"
                if fix.line_end and fix.line_end != fix.line_start:
                    location += f"-{fix.line_end}"
                
                report.append(f"{fix_type} at {location}: {fix.issue_description}")
                
                # Show diff
                if fix.fix_type == "add":
                    report.append("  + " + fix.new_code.replace("\n", "\n  + "))
                elif fix.fix_type == "replace":
                    report.append("  - " + fix.original_code.replace("\n", "\n  - "))
                    report.append("  + " + fix.new_code.replace("\n", "\n  + "))
                elif fix.fix_type == "delete":
                    report.append("  - " + fix.original_code.replace("\n", "\n  - "))
                
                report.append("")
            
            report.append("")
        
        return "\n".join(report)
    
    def display_fixes(self):
        """Display fixes in a readable format"""
        if not self.fixes:
            console.print("[yellow]No fixes to display[/yellow]")
            return
        
        # Group fixes by file
        fixes_by_file = {}
        for fix in self.fixes:
            if fix.file_path not in fixes_by_file:
                fixes_by_file[fix.file_path] = []
            fixes_by_file[fix.file_path].append(fix)
        
        console.print("\n[bold cyan]== SUGGESTED FIXES ==[/bold cyan]")
        
        for file_path, file_fixes in fixes_by_file.items():
            console.print(f"\n[bold]File:[/bold] {file_path}")
            
            for fix in file_fixes:
                fix_type = fix.fix_type.capitalize()
                location = f"Line {fix.line_start}"
                if fix.line_end and fix.line_end != fix.line_start:
                    location += f"-{fix.line_end}"
                
                panel_content = []
                panel_content.append(f"[bold]{fix_type} at {location}:[/bold] {fix.issue_description}")
                
                # Show changes
                if fix.new_code:
                    syntax = Syntax(fix.new_code, "typescript", theme="monokai", line_numbers=False)
                    panel_content.append("\n[green]New code:[/green]")
                    panel_content.append(syntax)
                
                console.print(Panel("\n".join([str(item) for item in panel_content]), expand=False))
    
    def _get_file_content(self, file_path: str) -> List[str]:
        """Get file content with caching"""
        if file_path in self.file_cache:
            return self.file_cache[file_path]
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.readlines()
                self.file_cache[file_path] = content
                return content
        except Exception as e:
            console.print(f"[red]Error reading file {file_path}: {e}[/red]")
            return []

if __name__ == "__main__":
    fixer = ProjectFixer("validation_results.json", ".")
    fixes = fixer.generate_fixes()
    fixer.display_fixes()
    
    # Apply fixes in dry run mode
    applied = fixer.apply_fixes(dry_run=True)
    
    # Save fix report
    with open("fix_report.txt", "w") as f:
        f.write(fixer.generate_fix_report())
#!/usr/bin/env python3
"""
analyzer.py - Module for analyzing source code in the project
Scans TypeScript/JavaScript files to extract API endpoints, methods, and code patterns
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List, Set, Optional, Any, Tuple
import regex
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskID
from pydantic import BaseModel, Field

console = Console()

class ApiEndpoint(BaseModel):
    """Model for representing an API endpoint"""
    path: str
    method: str
    file_path: str
    line_number: int
    parameters: List[str] = Field(default_factory=list)
    response_type: Optional[str] = None
    is_defined: bool = False
    is_used: bool = False
    sources: List[str] = Field(default_factory=list)  # Where it's imported/used
    
    def __str__(self) -> str:
        return f"{self.method.upper()} {self.path}"

class FunctionInfo(BaseModel):
    """Model for representing a function definition"""
    name: str
    file_path: str
    line_number: int
    parameters: List[str] = Field(default_factory=list)
    return_type: Optional[str] = None
    is_async: bool = False
    is_used: bool = False
    has_return: bool = False
    body: str = ""
    similar_functions: List[str] = Field(default_factory=list)
    
    def __str__(self) -> str:
        async_prefix = "async " if self.is_async else ""
        return f"{async_prefix}function {self.name}({', '.join(self.parameters)})"

class CodeIssue(BaseModel):
    """Model for representing a code issue"""
    issue_type: str
    file_path: str
    line_number: int
    description: str
    severity: str = "warning"  # "error", "warning", "info"
    code_snippet: str = ""
    fix_suggestion: Optional[str] = None

class ProjectAnalyzer:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.endpoints: Dict[str, ApiEndpoint] = {}
        self.functions: Dict[str, FunctionInfo] = {}
        self.issues: List[CodeIssue] = []
        self.api_usages: Dict[str, List[str]] = {}
        self.italian_to_english_endpoints: Dict[str, str] = {}
        self.file_cache: Dict[str, List[str]] = {}
        
    def analyze_project(self):
        """Main method to analyze the entire project"""
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        ) as progress:
            main_task = progress.add_task("[green]Analyzing project...", total=5)
            
            # Step 1: Collect all relevant files
            files_task = progress.add_task("[cyan]Collecting files...", total=100)
            typescript_files = self._collect_typescript_files(progress, files_task)
            progress.update(main_task, advance=1)
            
            # Step 2: Extract API endpoints defined in the server
            api_task = progress.add_task("[cyan]Extracting API endpoints...", total=len(typescript_files))
            self._extract_api_endpoints(typescript_files, progress, api_task)
            progress.update(main_task, advance=1)
            
            # Step 3: Extract function definitions
            func_task = progress.add_task("[cyan]Extracting function definitions...", total=len(typescript_files))
            self._extract_functions(typescript_files, progress, func_task)
            progress.update(main_task, advance=1)
            
            # Step 4: Extract API usages in client code
            usage_task = progress.add_task("[cyan]Analyzing API usages...", total=len(typescript_files))
            self._analyze_api_usages(typescript_files, progress, usage_task)
            progress.update(main_task, advance=1)
            
            # Step 5: Analyze code for issues
            issues_task = progress.add_task("[cyan]Detecting code issues...", total=len(typescript_files))
            self._detect_code_issues(typescript_files, progress, issues_task)
            progress.update(main_task, advance=1)
        
        # Build relationships
        self._build_relationships()
        
        return {
            "endpoints": self.endpoints,
            "functions": self.functions,
            "issues": self.issues,
            "api_usages": self.api_usages,
            "italian_to_english": self.italian_to_english_endpoints
        }
    
    def _collect_typescript_files(self, progress: Progress, task_id: TaskID) -> List[str]:
        """Collect all TypeScript/JavaScript files in the project"""
        typescript_files = []
        total_dirs = sum(1 for _ in self.project_root.glob("**/"))
        scanned = 0
        
        for root, dirs, files in os.walk(self.project_root):
            # Skip node_modules and other unnecessary directories
            dirs[:] = [d for d in dirs if d not in ["node_modules", ".git", "dist", "build", ".next"]]
            
            for file in files:
                if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                    typescript_files.append(os.path.join(root, file))
            
            scanned += 1
            progress.update(task_id, completed=min(100, int(scanned / total_dirs * 100)))
            
        return typescript_files
    
    def _extract_api_endpoints(self, files: List[str], progress: Progress, task_id: TaskID):
        """Extract API endpoints defined in route files"""
        for file_path in files:
            if "routes" in file_path or "controllers" in file_path:
                self._extract_endpoints_from_file(file_path)
            progress.update(task_id, advance=1)
    
    def _extract_endpoints_from_file(self, file_path: str):
        """Extract API endpoints from a single file"""
        content = self._get_file_content(file_path)
        
        # Express.js route patterns
        route_patterns = [
            # apiRouter.get('/path', ...)
            r'(?:app|router|apiRouter|Router)\.([a-z]+)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            # app.use('/api/path', ...)
            r'app\.use\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            # router.route('/path').get(...)
            r'(?:router|apiRouter)\.route\s*\(\s*[\'"`]([^\'"`]+)[\'"`]\s*\)\.([a-z]+)',
        ]
        
        line_number = 0
        for i, line in enumerate(content):
            line_number = i + 1
            
            for pattern in route_patterns:
                matches = re.finditer(pattern, line)
                for match in matches:
                    if len(match.groups()) == 2:
                        if match.group(1) == 'use':
                            # This is a router mounting point
                            path = match.group(1)
                            method = "use"
                        else:
                            method = match.group(1)
                            path = match.group(2)
                    else:
                        # This is router.route('/path').method()
                        path = match.group(1)
                        method = match.group(2)
                    
                    # Extract any parameter names in the path
                    params = re.findall(r':([a-zA-Z0-9_]+)', path)
                    
                    # Get the full function to extract req.body parameters
                    body_params = self._extract_request_parameters(content, i)
                    
                    # Create API endpoint entry
                    endpoint_key = f"{method.upper()} {path}"
                    if endpoint_key not in self.endpoints:
                        self.endpoints[endpoint_key] = ApiEndpoint(
                            path=path,
                            method=method,
                            file_path=file_path,
                            line_number=line_number,
                            parameters=params + body_params,
                            is_defined=True
                        )
                    else:
                        self.endpoints[endpoint_key].is_defined = True
                        self.endpoints[endpoint_key].file_path = file_path
                        self.endpoints[endpoint_key].line_number = line_number
                        self.endpoints[endpoint_key].parameters.extend(params + body_params)
                        # Remove duplicates
                        self.endpoints[endpoint_key].parameters = list(set(self.endpoints[endpoint_key].parameters))
    
    def _extract_request_parameters(self, content: List[str], line_index: int) -> List[str]:
        """Extract request parameters from the router handler function"""
        params = []
        line_count = min(20, len(content) - line_index)  # Look at up to 20 lines after the route definition
        
        # Extract a block of code to analyze
        code_block = "\n".join(content[line_index:line_index + line_count])
        
        # Extract parameters from req.body
        body_params = re.findall(r'req\.body\.([a-zA-Z0-9_]+)', code_block)
        params.extend(body_params)
        
        # Extract destructured parameters from req.body
        destructuring_matches = re.findall(r'const\s*\{([^}]+)\}\s*=\s*req\.body', code_block)
        for match in destructuring_matches:
            destructured_params = [p.strip() for p in match.split(',')]
            params.extend(destructured_params)
        
        # Extract parameters from req.params
        param_params = re.findall(r'req\.params\.([a-zA-Z0-9_]+)', code_block)
        params.extend(param_params)
        
        # Extract parameters from req.query
        query_params = re.findall(r'req\.query\.([a-zA-Z0-9_]+)', code_block)
        params.extend(query_params)
        
        return list(set(params))  # Remove duplicates
    
    def _extract_functions(self, files: List[str], progress: Progress, task_id: TaskID):
        """Extract functions defined in the project"""
        for file_path in files:
            self._extract_functions_from_file(file_path)
            progress.update(task_id, advance=1)
    
    def _extract_functions_from_file(self, file_path: str):
        """Extract function definitions from a single file"""
        content = self._get_file_content(file_path)
        
        function_patterns = [
            # Regular function declarations
            r'(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)',
            # Arrow functions
            r'(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>'
        ]
        
        in_function_body = False
        current_function = None
        brace_count = 0
        function_body = []
        
        for i, line in enumerate(content):
            line_number = i + 1
            
            if in_function_body:
                function_body.append(line)
                
                # Count braces to determine function body
                open_braces = line.count("{")
                close_braces = line.count("}")
                brace_count += open_braces - close_braces
                
                if brace_count == 0:
                    in_function_body = False
                    if current_function:
                        # Check if function has a return statement
                        has_return = any(re.search(r'return\s+', l) for l in function_body)
                        
                        # Create the function info object
                        function_key = f"{current_function[0]}"
                        self.functions[function_key] = FunctionInfo(
                            name=current_function[0],
                            file_path=file_path,
                            line_number=current_function[2],
                            parameters=current_function[1],
                            is_async=current_function[3],
                            has_return=has_return,
                            body="\n".join(function_body)
                        )
                        
                        function_body = []
                        current_function = None
            
            for pattern in function_patterns:
                matches = re.finditer(pattern, line)
                for match in matches:
                    func_name = match.group(1)
                    params_str = match.group(2)
                    params = [p.strip().split(':')[0].strip() for p in params_str.split(',')] if params_str.strip() else []
                    
                    # Check if function is async
                    is_async = "async" in line[:match.start()]
                    
                    current_function = (func_name, params, line_number, is_async)
                    in_function_body = True
                    brace_count = line[match.end():].count("{") - line[match.end():].count("}")
    
    def _analyze_api_usages(self, files: List[str], progress: Progress, task_id: TaskID):
        """Analyze API usages in client code"""
        for file_path in files:
            if "client" in file_path:
                self._extract_api_usages_from_file(file_path)
            progress.update(task_id, advance=1)
    
    def _extract_api_usages_from_file(self, file_path: str):
        """Extract API usage patterns from a single file"""
        content = self._get_file_content(file_path)
        
        # Look for fetch, axios, and other HTTP request patterns
        api_patterns = [
            # fetch('/api/...')
            r'fetch\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            # axios.get('/api/...')
            r'axios\.([a-z]+)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            # apiRequest('GET', '/api/...')
            r'apiRequest\s*\(\s*[\'"`]([A-Z]+)[\'"`]\s*,\s*[\'"`]([^\'"`]+)[\'"`]',
            # adaptedApiRequest('GET', '/api/...')
            r'adaptedApiRequest\s*\(\s*[\'"`]([A-Z]+)[\'"`]\s*,\s*[\'"`]([^\'"`]+)[\'"`]',
            # queryClient.invalidateQueries(['/api/...'])
            r'queryClient\.invalidateQueries\s*\(\s*\{?\s*queryKey\s*:\s*(?:\[\s*)?[\'"`]([^\'"`]+)[\'"`]',
            # useQuery({ queryKey: ['/api/...'] })
            r'useQuery\s*\(\s*\{?\s*queryKey\s*:\s*(?:\[\s*)?[\'"`]([^\'"`]+)[\'"`]',
        ]
        
        for i, line in enumerate(content):
            for pattern in api_patterns:
                matches = re.finditer(pattern, line)
                for match in matches:
                    if len(match.groups()) == 1:
                        # This is a fetch or queryClient.invalidateQueries pattern
                        path = match.group(1)
                        method = "GET"  # Default to GET
                    elif len(match.groups()) == 2:
                        if match.group(1).upper() in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
                            # This is an apiRequest pattern
                            method = match.group(1).upper()
                            path = match.group(2)
                        else:
                            # This is an axios pattern
                            method = match.group(1).upper()
                            path = match.group(2)
                    
                    # Only process API paths
                    if path.startswith('/api/'):
                        endpoint_key = f"{method} {path}"
                        
                        # Track usage
                        if endpoint_key not in self.api_usages:
                            self.api_usages[endpoint_key] = []
                        
                        usage_info = f"{file_path}:{i+1}"
                        if usage_info not in self.api_usages[endpoint_key]:
                            self.api_usages[endpoint_key].append(usage_info)
                        
                        # Record in endpoints if not already there
                        if endpoint_key not in self.endpoints:
                            self.endpoints[endpoint_key] = ApiEndpoint(
                                path=path,
                                method=method,
                                file_path=file_path,
                                line_number=i+1,
                                is_used=True,
                                sources=[file_path]
                            )
                        else:
                            self.endpoints[endpoint_key].is_used = True
                            if file_path not in self.endpoints[endpoint_key].sources:
                                self.endpoints[endpoint_key].sources.append(file_path)
    
    def _detect_code_issues(self, files: List[str], progress: Progress, task_id: TaskID):
        """Detect various code issues"""
        for file_path in files:
            self._analyze_file_for_issues(file_path)
            progress.update(task_id, advance=1)
    
    def _analyze_file_for_issues(self, file_path: str):
        """Analyze a single file for code issues"""
        content = self._get_file_content(file_path)
        
        # Check for try without catch
        self._check_try_without_catch(file_path, content)
        
        # Check for if without else
        self._check_if_without_else(file_path, content)
        
        # Check for switch without default
        self._check_switch_without_default(file_path, content)
        
        # Check for missing validations in controllers
        if "controllers" in file_path:
            self._check_missing_validations(file_path, content)
        
        # Check for functions missing return statements
        self._check_missing_returns(file_path, content)
        
        # Check for Italian language endpoints
        if file_path.endswith(('.ts', '.tsx')):
            self._detect_italian_endpoints(file_path, content)
    
    def _check_try_without_catch(self, file_path: str, content: List[str]):
        """Check for try blocks without catch or finally"""
        in_try_block = False
        try_start_line = 0
        brace_count = 0
        
        for i, line in enumerate(content):
            line_number = i + 1
            
            if re.search(r'\btry\b\s*{', line) and not in_try_block:
                in_try_block = True
                try_start_line = line_number
                brace_count = line.count("{") - line.count("}")
                continue
            
            if in_try_block:
                brace_count += line.count("{") - line.count("}")
                
                if brace_count == 0:
                    # Try block has ended, check if there's a catch or finally
                    if not any(re.search(r'\b(catch|finally)\b', content[j]) for j in range(i, min(i+3, len(content)))):
                        self.issues.append(CodeIssue(
                            issue_type="try_without_catch",
                            file_path=file_path,
                            line_number=try_start_line,
                            description="Try block without catch or finally",
                            code_snippet="\n".join(content[try_start_line-1:line_number]),
                            fix_suggestion="Add a catch or finally block to handle errors"
                        ))
                    
                    in_try_block = False
    
    def _check_if_without_else(self, file_path: str, content: List[str]):
        """Check for complex if statements without else"""
        for i, line in enumerate(content):
            line_number = i + 1
            
            # Look for if conditions with complex checks
            if re.search(r'\bif\s*\(.*&&.*\)', line) or re.search(r'\bif\s*\(.*\|\|.*\)', line):
                # Look for else within the next few lines
                has_else = False
                for j in range(i+1, min(i+20, len(content))):
                    if re.search(r'\belse\b', content[j]):
                        has_else = True
                        break
                    
                    # If we find another if, we've moved on
                    if re.search(r'\bif\s*\(', content[j]) and j > i+2:
                        break
                
                if not has_else:
                    self.issues.append(CodeIssue(
                        issue_type="complex_if_without_else",
                        file_path=file_path,
                        line_number=line_number,
                        description="Complex if condition without else branch",
                        code_snippet=line,
                        severity="info",
                        fix_suggestion="Consider adding an else branch for this complex condition"
                    ))
    
    def _check_switch_without_default(self, file_path: str, content: List[str]):
        """Check for switch statements without default case"""
        in_switch = False
        switch_start_line = 0
        brace_count = 0
        has_default = False
        
        for i, line in enumerate(content):
            line_number = i + 1
            
            if re.search(r'\bswitch\s*\(', line) and not in_switch:
                in_switch = True
                switch_start_line = line_number
                brace_count = line.count("{") - line.count("}")
                continue
            
            if in_switch:
                if re.search(r'\bdefault\s*:', line):
                    has_default = True
                
                brace_count += line.count("{") - line.count("}")
                
                if brace_count == 0:
                    # Switch block has ended
                    if not has_default:
                        self.issues.append(CodeIssue(
                            issue_type="switch_without_default",
                            file_path=file_path,
                            line_number=switch_start_line,
                            description="Switch statement without default case",
                            code_snippet="\n".join(content[switch_start_line-1:line_number]),
                            fix_suggestion="Add a default case to handle unexpected values"
                        ))
                    
                    in_switch = False
                    has_default = False
    
    def _check_missing_validations(self, file_path: str, content: List[str]):
        """Check for missing input validations in controller functions"""
        for i, line in enumerate(content):
            line_number = i + 1
            
            # Look for controller functions
            if re.search(r'async\s+function\s+[a-zA-Z0-9_$]+', line) or re.search(r'export\s+const\s+[a-zA-Z0-9_$]+\s*=\s*async', line):
                # Check if this function uses req.body or similar
                uses_input = False
                has_validation = False
                
                # Look ahead in the function body
                for j in range(i+1, min(i+30, len(content))):
                    if re.search(r'req\.(body|params|query)', content[j]):
                        uses_input = True
                    
                    # Check for validation
                    if re.search(r'(validate|safeparse|schema|joi|yup|zod|check|valid)', content[j], re.IGNORECASE):
                        has_validation = True
                        break
                    
                    # Function may have ended
                    if re.search(r'^}', content[j].strip()):
                        break
                
                if uses_input and not has_validation:
                    self.issues.append(CodeIssue(
                        issue_type="missing_validation",
                        file_path=file_path,
                        line_number=line_number,
                        description="Controller function uses request data without validation",
                        code_snippet=line,
                        severity="warning",
                        fix_suggestion="Add input validation using a schema validator (zod, joi, etc.)"
                    ))
    
    def _check_missing_returns(self, file_path: str, content: List[str]):
        """Check for functions that may be missing return statements"""
        in_function = False
        function_name = ""
        function_start_line = 0
        brace_count = 0
        has_return = False
        is_void_function = False
        
        for i, line in enumerate(content):
            line_number = i + 1
            
            # Start of function
            func_match = re.search(r'(?:function|const|let|var)\s+([a-zA-Z0-9_$]+)(?:\s*:\s*(?:void|undefined|never))?', line)
            if func_match and ("function" in line or "=>" in line) and not in_function:
                in_function = True
                function_name = func_match.group(1)
                function_start_line = line_number
                brace_count = line.count("{") - line.count("}")
                has_return = False
                is_void_function = "void" in line or "undefined" in line or "never" in line
                continue
            
            if in_function:
                # Check for return statement
                if re.search(r'\breturn\b', line):
                    has_return = True
                
                brace_count += line.count("{") - line.count("}")
                
                if brace_count == 0:
                    # Function has ended
                    if not has_return and not is_void_function and not re.search(r'^\s*(get|set)\s+', content[function_start_line-1]):
                        # Exclude getters, setters, and certain function names
                        excluded_names = ["useEffect", "render", "componentDidMount", "componentDidUpdate"]
                        if not any(name in function_name for name in excluded_names):
                            self.issues.append(CodeIssue(
                                issue_type="missing_return",
                                file_path=file_path,
                                line_number=function_start_line,
                                description=f"Function '{function_name}' may be missing a return statement",
                                code_snippet="\n".join(content[function_start_line-1:line_number]),
                                severity="info",
                                fix_suggestion="Add an explicit return statement or change the return type to void"
                            ))
                    
                    in_function = False
    
    def _detect_italian_endpoints(self, file_path: str, content: List[str]):
        """Detect Italian language endpoints and their English counterparts"""
        content_str = "\n".join(content)
        
        # Find mapping patterns
        mapping_pattern = r'"([^"]+)":\s*"([^"]+)"'
        matches = re.finditer(mapping_pattern, content_str)
        
        for match in matches:
            italian = match.group(1)
            english = match.group(2)
            
            if italian.startswith('/api/') and english.startswith('/api/'):
                # Identify Italian endpoints based on common Italian words
                italian_words = ['collaboratori', 'eventi', 'galleria', 'pagamenti',
                                 'preventivi', 'clienti', 'montaggi', 'utenti']
                
                if any(word in italian for word in italian_words):
                    self.italian_to_english_endpoints[italian] = english
    
    def _build_relationships(self):
        """Build relationships between entities"""
        # Mark endpoints that are both defined and used
        for key, endpoint in self.endpoints.items():
            if key in self.api_usages:
                endpoint.is_used = True
                endpoint.sources = self.api_usages[key]
    
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
    analyzer = ProjectAnalyzer(".")
    results = analyzer.analyze_project()
    
    print(f"Found {len(results['endpoints'])} API endpoints")
    print(f"Found {len(results['functions'])} functions")
    print(f"Detected {len(results['issues'])} code issues")
    
    # Save results to JSON file for further processing
    with open('analysis_results.json', 'w') as f:
        json.dump({
            "endpoints": {k: v.dict() for k, v in results['endpoints'].items()},
            "functions": {k: v.dict() for k, v in results['functions'].items()},
            "issues": [issue.dict() for issue in results['issues']],
            "italian_to_english": results['italian_to_english']
        }, f, indent=2)
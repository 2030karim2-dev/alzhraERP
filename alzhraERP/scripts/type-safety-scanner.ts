#!/usr/bin/env ts-node
/**
 * Type Safety Scanner for Al-Zahra Smart ERP
 * Scans the codebase for type safety issues including:
 * - "as any" assertions
 * - Implicit any types
 * - Missing return types
 * - catch blocks with any
 */

import { Project, Node, SyntaxKind, TypeAssertion, VariableDeclaration, FunctionDeclaration, ParameterDeclaration, CatchClause } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

interface TypeSafetyIssue {
    filePath: string;
    line: number;
    column: number;
    type: 'as_any' | 'implicit_any' | 'missing_return_type' | 'catch_any';
    message: string;
    code: string;
    suggestedFix: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
}

interface ScanReport {
    summary: {
        totalIssues: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    issues: TypeSafetyIssue[];
    filesAffected: string[];
}

class TypeSafetyScanner {
    private project: Project;
    private issues: TypeSafetyIssue[] = [];

    constructor(tsConfigPath: string = './tsconfig.json') {
        this.project = new Project({
            tsConfigFilePath: tsConfigPath,
            skipAddingFilesFromTsConfig: false,
        });
    }

    scan(): ScanReport {
        console.log('🔍 Starting Type Safety Scan...\n');

        const sourceFiles = this.project.getSourceFiles();
        console.log(`📁 Scanning ${sourceFiles.length} files...\n`);

        for (const sourceFile of sourceFiles) {
            // Skip node_modules and generated files
            if (sourceFile.getFilePath().includes('node_modules')) continue;
            if (sourceFile.getFilePath().includes('dist')) continue;

            this.scanFile(sourceFile);
        }

        return this.generateReport();
    }

    private scanFile(sourceFile: import('ts-morph').SourceFile): void {
        const filePath = sourceFile.getFilePath();

        // 1. Scan for "as any" type assertions
        this.scanForAsAny(sourceFile);

        // 2. Scan for implicit any in variable declarations
        this.scanForImplicitAny(sourceFile);

        // 3. Scan for missing return types
        this.scanForMissingReturnTypes(sourceFile);

        // 4. Scan for catch clauses with any
        this.scanForCatchAny(sourceFile);
    }

    private scanForAsAny(sourceFile: import('ts-morph').SourceFile): void {
        const typeAssertions = sourceFile.getDescendantsOfKind(SyntaxKind.TypeAssertionExpression);

        for (const assertion of typeAssertions) {
            const typeNode = assertion.getTypeArgument();
            if (typeNode.getText() === 'any') {
                const { line, column } = sourceFile.getLineAndColumnAtPos(assertion.getStart());
                const parent = assertion.getParent();
                let suggestedFix = 'Replace with specific type';
                let severity: TypeSafetyIssue['severity'] = 'high';

                // Determine context and suggest appropriate fix
                if (parent.getKind() === SyntaxKind.CallExpression) {
                    const callExpr = parent.asKind(SyntaxKind.CallExpression);
                    const expr = callExpr?.getExpression().getText();
                    if (expr?.includes('supabase')) {
                        suggestedFix = 'Use proper Database type from database.types.ts';
                        severity = 'critical';
                    }
                }

                this.issues.push({
                    filePath: sourceFile.getFilePath(),
                    line,
                    column,
                    type: 'as_any',
                    message: 'Explicit "as any" assertion found',
                    code: assertion.getText().substring(0, 100),
                    suggestedFix,
                    severity,
                });
            }
        }
    }

    private scanForImplicitAny(sourceFile: import('ts-morph').SourceFile): void {
        const declarations = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);

        for (const declaration of declarations) {
            const typeNode = declaration.getTypeNode();
            const initializer = declaration.getInitializer();

            // Check if type is implicitly any
            if (!typeNode && initializer) {
                const type = initializer.getType();
                if (type.getText() === 'any') {
                    const { line, column } = sourceFile.getLineAndColumnAtPos(declaration.getStart());

                    this.issues.push({
                        filePath: sourceFile.getFilePath(),
                        line,
                        column,
                        type: 'implicit_any',
                        message: `Variable '${declaration.getName()}' has implicit any type`,
                        code: declaration.getText().substring(0, 100),
                        suggestedFix: `Add explicit type: const ${declaration.getName()}: Type = ...`,
                        severity: 'medium',
                    });
                }
            }
        }
    }

    private scanForMissingReturnTypes(sourceFile: import('ts-morph').SourceFile): void {
        const functions = sourceFile.getFunctions();

        for (const func of functions) {
            // Skip private/internal functions
            if (func.hasExportKeyword()) {
                const returnTypeNode = func.getReturnTypeNode();

                if (!returnTypeNode) {
                    const { line, column } = sourceFile.getLineAndColumnAtPos(func.getStart());
                    const name = func.getName() || 'anonymous';

                    this.issues.push({
                        filePath: sourceFile.getFilePath(),
                        line,
                        column,
                        type: 'missing_return_type',
                        message: `Function '${name}' is missing return type annotation`,
                        code: func.getText().substring(0, 100),
                        suggestedFix: `Add return type: function ${name}(): ReturnType {...}`,
                        severity: 'medium',
                    });
                }
            }
        }
    }

    private scanForCatchAny(sourceFile: import('ts-morph').SourceFile): void {
        const catchClauses = sourceFile.getDescendantsOfKind(SyntaxKind.CatchClause);

        for (const catchClause of catchClauses) {
            const variableDeclaration = catchClause.getVariableDeclaration();
            if (variableDeclaration) {
                const typeNode = variableDeclaration.getTypeNode();

                // Check if catch variable is typed as any or implicit any
                if (!typeNode || typeNode.getText() === 'any') {
                    const { line, column } = sourceFile.getLineAndColumnAtPos(catchClause.getStart());

                    this.issues.push({
                        filePath: sourceFile.getFilePath(),
                        line,
                        column,
                        type: 'catch_any',
                        message: 'Catch clause has implicit or explicit any type',
                        code: catchClause.getText().substring(0, 100),
                        suggestedFix: 'Use: catch (error: unknown) { ... }',
                        severity: 'high',
                    });
                }
            }
        }
    }

    private generateReport(): ScanReport {
        const summary = {
            totalIssues: this.issues.length,
            critical: this.issues.filter(i => i.severity === 'critical').length,
            high: this.issues.filter(i => i.severity === 'high').length,
            medium: this.issues.filter(i => i.severity === 'medium').length,
            low: this.issues.filter(i => i.severity === 'low').length,
        };

        const filesAffected = [...new Set(this.issues.map(i => i.filePath))];

        return {
            summary,
            issues: this.issues,
            filesAffected,
        };
    }

    generateMarkdownReport(report: ScanReport): string {
        let md = `# Type Safety Scan Report\n\n`;
        md += `**Generated:** ${new Date().toISOString()}\n\n`;

        // Summary
        md += `## Summary\n\n`;
        md += `- **Total Issues:** ${report.summary.totalIssues}\n`;
        md += `- **Critical:** ${report.summary.critical} 🔴\n`;
        md += `- **High:** ${report.summary.high} 🟠\n`;
        md += `- **Medium:** ${report.summary.medium} 🟡\n`;
        md += `- **Low:** ${report.summary.low} 🟢\n`;
        md += `- **Files Affected:** ${report.filesAffected.length}\n\n`;

        // Issues by severity
        const severities: TypeSafetyIssue['severity'][] = ['critical', 'high', 'medium', 'low'];

        for (const severity of severities) {
            const issues = report.issues.filter(i => i.severity === severity);
            if (issues.length === 0) continue;

            const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
            md += `## ${icon} ${severity.toUpperCase()} Priority (${issues.length})\n\n`;

            // Group by file
            const byFile = this.groupByFile(issues);

            for (const [filePath, fileIssues] of Object.entries(byFile)) {
                const relativePath = path.relative(process.cwd(), filePath);
                md += `### ${relativePath}\n\n`;

                for (const issue of fileIssues) {
                    md += `- **Line ${issue.line}:${issue.column}** - ${issue.message}\n`;
                    md += `  - Type: \`${issue.type}\`\n`;
                    md += `  - Code: \`${issue.code.replace(/`/g, '\\`')}\`\n`;
                    md += `  - Fix: ${issue.suggestedFix}\n\n`;
                }
            }
        }

        // Action items
        md += `## Action Items\n\n`;
        md += `- [ ] Fix ${report.summary.critical} critical issues immediately\n`;
        md += `- [ ] Fix ${report.summary.high} high priority issues this week\n`;
        md += `- [ ] Fix ${report.summary.medium} medium priority issues next week\n`;
        md += `- [ ] Review ${report.summary.low} low priority issues\n`;

        return md;
    }

    generateHTMLReport(report: ScanReport): string {
        const severities = {
            critical: { color: '#dc2626', label: 'Critical' },
            high: { color: '#ea580c', label: 'High' },
            medium: { color: '#ca8a04', label: 'Medium' },
            low: { color: '#16a34a', label: 'Low' },
        };

        let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Type Safety Report - Al-Zahra ERP</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1f2937; }
    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin: 20px 0; }
    .stat { padding: 15px; border-radius: 8px; text-align: center; }
    .stat.critical { background: #fee2e2; }
    .stat.high { background: #ffedd5; }
    .stat.medium { background: #fef9c3; }
    .stat.low { background: #dcfce7; }
    .stat.total { background: #f3f4f6; }
    .stat-number { font-size: 2em; font-weight: bold; }
    .issue { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 10px 0; }
    .issue-header { display: flex; justify-content: space-between; align-items: center; }
    .severity-badge { padding: 4px 12px; border-radius: 4px; color: white; font-size: 0.85em; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .code-block { background: #1f2937; color: #e5e7eb; padding: 15px; border-radius: 8px; overflow-x: auto; margin: 10px 0; }
    .suggested-fix { background: #ecfdf5; border-left: 4px solid #10b981; padding: 10px 15px; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>🔍 Type Safety Scan Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>

  <div class="summary">
    <div class="stat total">
      <div class="stat-number">${report.summary.totalIssues}</div>
      <div>Total Issues</div>
    </div>
    <div class="stat critical">
      <div class="stat-number">${report.summary.critical}</div>
      <div>Critical</div>
    </div>
    <div class="stat high">
      <div class="stat-number">${report.summary.high}</div>
      <div>High</div>
    </div>
    <div class="stat medium">
      <div class="stat-number">${report.summary.medium}</div>
      <div>Medium</div>
    </div>
    <div class="stat low">
      <div class="stat-number">${report.summary.low}</div>
      <div>Low</div>
    </div>
  </div>

  <h2>Issues</h2>
`;

        for (const issue of report.issues) {
            const sev = severities[issue.severity];
            html += `
  <div class="issue">
    <div class="issue-header">
      <h3>${issue.message}</h3>
      <span class="severity-badge" style="background: ${sev.color}">${sev.label}</span>
    </div>
    <p><strong>File:</strong> ${path.relative(process.cwd(), issue.filePath)}:${issue.line}:${issue.column}</p>
    <p><strong>Type:</strong> <code>${issue.type}</code></p>
    <div class="code-block"><code>${issue.code.replace(/</g, '<').replace(/>/g, '>')}</code></div>
    <div class="suggested-fix">
      <strong>💡 Suggested Fix:</strong> ${issue.suggestedFix}
    </div>
  </div>
`;
        }

        html += `
</body>
</html>`;

        return html;
    }

    private groupByFile(issues: TypeSafetyIssue[]): Record<string, TypeSafetyIssue[]> {
        return issues.reduce((acc, issue) => {
            if (!acc[issue.filePath]) acc[issue.filePath] = [];
            acc[issue.filePath].push(issue);
            return acc;
        }, {} as Record<string, TypeSafetyIssue[]>);
    }
}

// Main execution
if (require.main === module) {
    const scanner = new TypeSafetyScanner();
    const report = scanner.scan();

    // Save reports
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Markdown report
    const mdReport = scanner.generateMarkdownReport(report);
    fs.writeFileSync(path.join(reportsDir, 'type-safety-report.md'), mdReport);

    // HTML report
    const htmlReport = scanner.generateHTMLReport(report);
    fs.writeFileSync(path.join(reportsDir, 'type-safety-report.html'), htmlReport);

    // JSON report
    fs.writeFileSync(path.join(reportsDir, 'type-safety-report.json'), JSON.stringify(report, null, 2));

    console.log('\n✅ Scan complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   Total Issues: ${report.summary.totalIssues}`);
    console.log(`   Critical: ${report.summary.critical} 🔴`);
    console.log(`   High: ${report.summary.high} 🟠`);
    console.log(`   Medium: ${report.summary.medium} 🟡`);
    console.log(`   Low: ${report.summary.low} 🟢`);
    console.log(`\n📁 Reports saved to:`);
    console.log(`   - reports/type-safety-report.md`);
    console.log(`   - reports/type-safety-report.html`);
    console.log(`   - reports/type-safety-report.json`);

    // Exit with error code if critical issues found
    if (report.summary.critical > 0) {
        console.log('\n❌ Critical issues found! Please fix them before proceeding.\n');
        process.exit(1);
    }

    if (report.summary.totalIssues > 0) {
        console.log('\n⚠️  Issues found. Please review the reports.\n');
        process.exit(0);
    }

    console.log('\n✨ No issues found! Codebase is type-safe.\n');
    process.exit(0);
}

export { TypeSafetyScanner, ScanReport, TypeSafetyIssue };
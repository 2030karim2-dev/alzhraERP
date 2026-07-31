#!/usr/bin/env node
/**
 * Simple Type Safety Scanner for Al-Zahra Smart ERP
 * Uses regex to scan for type safety issues
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
    srcDir: './src',
    reportDir: './reports',
    extensions: ['.ts', '.tsx'],
    exclude: ['node_modules', 'dist', '.git', 'coverage'],
};

interface Issue {
    file: string;
    line: number;
    type: 'as_any' | 'catch_any' | 'implicit_any' | 'missing_return_type' | 'todo_fixme';
    message: string;
    code: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
}

interface Report {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    issues: Issue[];
    files: string[];
}

// Patterns to match
const PATTERNS = {
    // Matches: (expression as any) or expression as any
    asAny: /\(\s*\w+\s+as\s+any\s*\)|\w+\s+as\s+any/g,
    // Matches: catch (error: any) or catch (error)
    catchAny: /catch\s*\(\s*(\w+\s*(?::\s*any)?)\s*\)/g,
    // Matches: TODO/FIXME/XXX comments
    todoFixme: /\/\/\s*(TODO|FIXME|XXX|HACK)\s*:?\s*(.+)/gi,
};

function scanFile(filePath: string): Issue[] {
    const issues: Issue[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line: string, index: number) => {
        const lineNum = index + 1;

        // Check for "as any"
        if (PATTERNS.asAny.test(line)) {
            issues.push({
                file: filePath,
                line: lineNum,
                type: 'as_any',
                message: 'Explicit "as any" assertion found',
                code: line.trim(),
                severity: 'critical',
            });
        }

        // Check for catch with any
        if (PATTERNS.catchAny.test(line)) {
            const match = line.match(/catch\s*\(\s*(\w+)\s*:\s*any\s*\)/);
            if (match) {
                issues.push({
                    file: filePath,
                    line: lineNum,
                    type: 'catch_any',
                    message: `Catch clause has explicit any type: ${match[1]}`,
                    code: line.trim(),
                    severity: 'high',
                });
            }
        }

        // Reset regex lastIndex
        PATTERNS.asAny.lastIndex = 0;
        PATTERNS.catchAny.lastIndex = 0;
    });

    return issues;
}

function scanDirectory(dir: string): Issue[] {
    const issues: Issue[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // Skip excluded directories
            if (CONFIG.exclude.includes(entry.name)) continue;
            issues.push(...scanDirectory(fullPath));
        } else if (entry.isFile() && CONFIG.extensions.includes(path.extname(entry.name))) {
            issues.push(...scanFile(fullPath));
        }
    }

    return issues;
}

function generateReport(issues: Issue[]): Report {
    const critical = issues.filter(i => i.severity === 'critical').length;
    const high = issues.filter(i => i.severity === 'high').length;
    const medium = issues.filter(i => i.severity === 'medium').length;
    const low = issues.filter(i => i.severity === 'low').length;

    return {
        total: issues.length,
        critical,
        high,
        medium,
        low,
        issues,
        files: [...new Set(issues.map(i => i.file))],
    };
}

function generateMarkdown(report: Report): string {
    let md = `# Type Safety Scan Report\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n\n`;

    md += `## Summary\n\n`;
    md += `- **Total Issues:** ${report.total}\n`;
    md += `- **Critical:** ${report.critical} 🔴\n`;
    md += `- **High:** ${report.high} 🟠\n`;
    md += `- **Medium:** ${report.medium} 🟡\n`;
    md += `- **Low:** ${report.low} 🟢\n`;
    md += `- **Files Affected:** ${report.files.length}\n\n`;

    // Group by severity
    const severities: Issue['severity'][] = ['critical', 'high', 'medium', 'low'];
    const icons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };

    for (const severity of severities) {
        const issues = report.issues.filter(i => i.severity === severity);
        if (issues.length === 0) continue;

        md += `## ${icons[severity]} ${severity.toUpperCase()} Priority (${issues.length})\n\n`;

        // Group by file
        const byFile = issues.reduce((acc, issue) => {
            if (!acc[issue.file]) acc[issue.file] = [];
            acc[issue.file].push(issue);
            return acc;
        }, {} as Record<string, Issue[]>);

        for (const [file, fileIssues] of Object.entries(byFile)) {
            md += `### ${file}\n\n`;
            for (const issue of fileIssues) {
                md += `- **Line ${issue.line}**: ${issue.message}\n`;
                md += `  \\`\\`${issue.code}\\`\\`\n\n`;
            }
        }
    }

    md += `## Action Items\n\n`;
    md += `- [ ] Fix ${report.critical} critical issues immediately\n`;
    md += `- [ ] Fix ${report.high} high priority issues this week\n`;
    md += `- [ ] Fix ${report.medium} medium priority issues next week\n`;
    md += `- [ ] Review ${report.low} low priority issues\n`;

    return md;
}

function main() {
    console.log('🔍 Scanning for type safety issues...\n');

    const issues = scanDirectory(CONFIG.srcDir);
    const report = generateReport(issues);

    // Create reports directory
    if (!fs.existsSync(CONFIG.reportDir)) {
        fs.mkdirSync(CONFIG.reportDir, { recursive: true });
    }

    // Save reports
    const mdReport = generateMarkdown(report);
    fs.writeFileSync(path.join(CONFIG.reportDir, 'type-safety-report.md'), mdReport);

    fs.writeFileSync(
        path.join(CONFIG.reportDir, 'type-safety-report.json'),
        JSON.stringify(report, null, 2)
    );

    // Print summary
    console.log('📊 Scan Complete!\n');
    console.log(`Total Issues: ${report.total}`);
    console.log(`  🔴 Critical: ${report.critical}`);
    console.log(`  🟠 High: ${report.high}`);
    console.log(`  🟡 Medium: ${report.medium}`);
    console.log(`  🟢 Low: ${report.low}`);
    console.log(`\n📁 Reports saved to:`);
    console.log(`  - reports/type-safety-report.md`);
    console.log(`  - reports/type-safety-report.json`);

    // Print top 10 critical issues
    if (report.critical > 0) {
        console.log('\n🔴 Top Critical Issues:');
        report.issues
            .filter(i => i.severity === 'critical')
            .slice(0, 10)
            .forEach(issue => {
                console.log(`  ${issue.file}:${issue.line} - ${issue.message}`);
            });
    }

    // Exit with error code if critical issues
    if (report.critical > 0) {
        console.log('\n❌ Critical issues found!');
        process.exit(1);
    }

    if (report.total > 0) {
        console.log('\n⚠️  Issues found. Please review the reports.');
        process.exit(0);
    }

    console.log('\n✨ No type safety issues found!');
    process.exit(0);
}

if (require.main === module) {
    main();
}

module.exports = { scanFile, scanDirectory, generateReport };

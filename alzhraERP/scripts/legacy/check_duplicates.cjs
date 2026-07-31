const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\User\\OneDrive\\Desktop\\alzhra smart\\src\\core\\database.types.ts', 'utf8');

const tablesMatch = content.match(/Tables: {([\s\S]*?)}\r?\n\s+Views: {/);
if (!tablesMatch) {
    console.error('Could not find Tables object');
    process.exit(1);
}

const tablesContent = tablesMatch[1];
const tableNames = [];
const lines = tablesContent.split('\n');
for (const line of lines) {
    const match = line.match(/^\s+([a-z_0-9]+): {/);
    if (match) {
        tableNames.push(match[1]);
    }
}

const counts = {};
tableNames.forEach(name => {
    counts[name] = (counts[name] || 0) + 1;
});

const duplicates = Object.keys(counts).filter(name => counts[name] > 1);
if (duplicates.length > 0) {
    console.log('Duplicate tables found:', duplicates);
} else {
    console.log('No duplicate tables found. Total tables:', tableNames.length);
    console.log('Table names:', tableNames.join(', '));
}

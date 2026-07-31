const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\User\\OneDrive\\Desktop\\alzhra smart\\src\\core\\database.types.ts', 'utf8');

let braceCount = 0;
let inTables = false;
let tablesStart = -1;
let tablesEnd = -1;

const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('Tables: {')) {
        inTables = true;
        tablesStart = i + 1;
        braceCount = 1;
        continue;
    }

    if (inTables) {
        for (const char of line) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
        }
        if (braceCount === 0) {
            tablesEnd = i + 1;
            inTables = false;
            console.log(`Tables object starts at line ${tablesStart} and ends at line ${tablesEnd}`);
        }
    }
}

if (inTables) {
    console.log(`Tables object started at line ${tablesStart} but never closed! Current count: ${braceCount}`);
}

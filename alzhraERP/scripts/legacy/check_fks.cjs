const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\User\\OneDrive\\Desktop\\alzhra smart\\src\\core\\database.types.ts', 'utf8');

const matches = content.match(/foreignKeyName: \".*?\"/g) || [];
const counts = {};
matches.forEach(m => counts[m] = (counts[m] || 0) + 1);

const duplicates = Object.keys(counts).filter(k => counts[k] > 1);
if (duplicates.length > 0) {
    console.log('Duplicate foreignKeyName found:');
    duplicates.forEach(k => {
        console.log(`${k}: ${counts[k]} times`);
    });
} else {
    console.log('No duplicate foreignKeyName found.');
}

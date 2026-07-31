const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\User\\OneDrive\\Desktop\\alzhra smart\\src\\core\\database.types.ts', 'utf8');

// 1. Add commas between table/view/function definitions
// Look for } followed by a newline and then an identifier: (with optional union | for functions)
let fixedContent = content.replace(/}\r?\n\s+([a-z0-9_]+): ({|\| {)/g, '},\n      $1: $2');

// 2. Add commas between top-level objects (Tables, Views, Functions, Enums, CompositeTypes)
// These start with Capital letters and are indented with 4-5 spaces
fixedContent = fixedContent.replace(/}\r?\n\s+(Tables|Views|Functions|Enums|CompositeTypes): {/g, '},\n     $1: {');

fs.writeFileSync('c:\\Users\\User\\OneDrive\\Desktop\\alzhra smart\\src\\core\\database.types.ts', fixedContent, 'utf8');
console.log('Fixed all structural commas in database.types.ts');

const fs = require('fs');
const path = require('path');

const inputFile = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\e7301ee4-1842-4b83-a86f-ac9c09c21e68\\.system_generated\\steps\\441\\output.txt';
const outputFile = 'c:\\Users\\User\\OneDrive\\Desktop\\alzhra smart\\src\\core\\database.types.ts';

try {
    if (!fs.existsSync(inputFile)) {
        console.error(`Error: Input file ${inputFile} not found`);
        process.exit(1);
    }

    const content = fs.readFileSync(inputFile, 'utf8');
    if (!content) {
        console.error('Error: Input file is empty');
        process.exit(1);
    }

    const data = JSON.parse(content);
    if (!data.types) {
        console.error('Error: "types" key not found in JSON');
        process.exit(1);
    }

    fs.writeFileSync(outputFile, data.types, 'utf8');
    console.log(`Successfully wrote types to ${outputFile}`);
} catch (err) {
    console.error(`Unexpected error: ${err.message}`);
    process.exit(1);
}

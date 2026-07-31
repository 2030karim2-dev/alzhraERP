import json
import os
import sys

input_file = r'C:\Users\User\.gemini\antigravity\brain\e7301ee4-1842-4b83-a86f-ac9c09c21e68\.system_generated\steps\100\output.txt'
output_file = r'c:\Users\User\OneDrive\Desktop\alzhra smart\src\core\database.types.ts'

try:
    if not os.path.exists(input_file):
        print(f"Error: Input file {input_file} not found")
        sys.exit(1)

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
        if not content:
            print("Error: Input file is empty")
            sys.exit(1)
        data = json.loads(content)

    if 'types' not in data:
        print("Error: 'types' key not found in JSON")
        sys.exit(1)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(data['types'])

    print(f"Successfully wrote types to {output_file}")
except Exception as e:
    print(f"Unexpected error: {str(e)}")
    sys.exit(1)

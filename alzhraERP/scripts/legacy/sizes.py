import os
import sys

def get_large_files():
    files = []
    base_dir = r"c:\Users\User\OneDrive\Desktop\alzhra smart\src"
    
    for root, dirs, filenames in os.walk(base_dir):
        # skip node_modules just in case
        if 'node_modules' in root.split(os.sep):
            continue
            
        for f in filenames:
            if f.endswith('.ts') or f.endswith('.tsx'):
                path = os.path.join(root, f)
                try:
                    files.append((path, os.path.getsize(path)))
                except Exception:
                    pass
                    
    files.sort(key=lambda x: x[1], reverse=True)
    
    with open(r"c:\Users\User\OneDrive\Desktop\alzhra smart\sizes.txt", "w", encoding="utf-8") as f:
        for path, size in files[:50]:
            f.write(f"{size} - {path}\n")

if __name__ == "__main__":
    get_large_files()
    print("Done")

import os
import zipfile

EXCLUDE_DIRS = {
    'node_modules',
    '.git',
    'dist',
    '.aistudio',
    '__pycache__',
    '.cache'
}

def create_project_zip(output_path):
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Prune excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in files:
                # Exclude any zip file or create_zip.py from inside the archive
                if file.endswith('.zip') or file == 'create_zip.py':
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, '.')
                
                # Normalize path and skip hidden system/cache files
                if rel_path.startswith('.aistudio') or ('/.' in rel_path and not rel_path.startswith('./.env') and not rel_path.startswith('./.git')):
                    continue

                zipf.write(full_path, rel_path)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"Created: {output_path} ({size_kb:.1f} KB)")

if __name__ == '__main__':
    targets = [
        'merchantiq-intelligence-platform.zip',
        'review-to-action-merchant-copilot.zip',
        os.path.join('public', 'merchantiq-intelligence-platform.zip'),
        os.path.join('public', 'review-to-action-merchant-copilot.zip')
    ]
    
    for t in targets:
        print(f"Archiving to {t}...")
        create_project_zip(t)
        
    print("All project archives created successfully!")

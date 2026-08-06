import zipfile
import re

with zipfile.ZipFile('bot-upload.zip', 'r') as z:
    code = z.read('main.py').decode('utf-8', errors='ignore')

lines = code.split('\n')
for i in range(560, 1235):
    if lines[i].startswith('# --------'):
        print(f"Line {i+1}: {lines[i]}")

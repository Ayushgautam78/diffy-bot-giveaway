import zipfile

with zipfile.ZipFile('bot-upload.zip', 'r') as z:
    code = z.read('main.py').decode('utf-8', errors='ignore')

for i, line in enumerate(code.split('\n'), 1):
    if 'Crypto' in line or 'Rumble' in line or 'Verification' in line or 'Ticket' in line or 'def get_crypto_price' in line or 'class RumbleRoyale' in line:
        print(f"Line {i}: {line[:100]}")

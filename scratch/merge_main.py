import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Diffy Bot (Differential Degens) — merge helper script
# This script merges features from a source main.py into the Diffy bot main.py

with open(r'c:\Users\pc\Desktop\unemployed bot\main.py', 'r', encoding='utf-8') as f:
    diffy_code = f.read()

with open(r'c:\Users\pc\Desktop\unemployed bot\main.py', 'r', encoding='utf-8') as f:
    unemployed_code = f.read()

# Extract price/crypto section from unemployed_code
price_func_match = re.search(r'(# -------- Live Crypto Price Tracker --------[\s\S]*?)(?=# -------- Message Media & Emojis Resolver --------)', unemployed_code)
price_func_code = price_func_match.group(1) if price_func_match else ""

price_cmd_match = re.search(r'(@bot\.tree\.command\(name="price",[\s\S]*?async def price_slash_cmd[\s\S]*?\n\n)', unemployed_code)
price_cmd_code = price_cmd_match.group(1) if price_cmd_match else ""

# Extract rumble royale section
rumble_func_match = re.search(r'(# -------- Rumble Royale Battle Royale Simulation --------[\s\S]*?)(?=# -------- Support Ticket System --------)', unemployed_code)
rumble_func_code = rumble_func_match.group(1) if rumble_func_match else ""

rumble_cmd_match = re.search(r'(@bot\.tree\.command\(name="royalrumble",[\s\S]*?async def royal_rumble_cmd[\s\S]*?\n\n)', unemployed_code)
rumble_cmd_code = rumble_cmd_match.group(1) if rumble_cmd_match else ""

# Extract ticketpanel & closeticket slash commands
ticketpanel_cmd_match = re.search(r'(@bot\.tree\.command\(name="ticketpanel",[\s\S]*?async def close_alias_cmd[\s\S]*?\n\n)', unemployed_code)
ticketpanel_cmd_code = ticketpanel_cmd_match.group(1) if ticketpanel_cmd_match else ""

# Extract 2-step verification views and slash command
verification_func_match = re.search(r'(# -------- Persistent 2-Step Verification System --------[\s\S]*?)(?=# -------- Support Ticket System --------|\\n\\n# -------- Persistent Ticket System --------)', unemployed_code)
verification_func_code = verification_func_match.group(1) if verification_func_match else ""

verification_cmd_match = re.search(r'(@bot\.tree\.command\(name="setupverification",[\s\S]*?async def setup_verification_cmd[\s\S]*?\n\n@bot\.event)', unemployed_code)
verification_cmd_code = verification_cmd_match.group(1) if verification_cmd_match else ""

print(f"Extracted price func len: {len(price_func_code)}, price cmd len: {len(price_cmd_code)}")
print(f"Extracted rumble func len: {len(rumble_func_code)}, rumble cmd len: {len(rumble_cmd_code)}")
print(f"Extracted ticketpanel cmd len: {len(ticketpanel_cmd_code)}")
print(f"Extracted verification func len: {len(verification_func_code)}, verification cmd len: {len(verification_cmd_code)}")

# Inject helper functions into diffy_code before # -------- Support Ticket System -------- #
insert_pos = diffy_code.find("# -------- Support Ticket System -------- #")
if insert_pos != -1:
    merged_code = diffy_code[:insert_pos] + price_func_code + "\n" + rumble_func_code + "\n" + verification_func_code + "\n" + diffy_code[insert_pos:]
else:
    merged_code = diffy_code + "\n" + price_func_code + "\n" + rumble_func_code + "\n" + verification_func_code

# Inject slash commands before @bot.tree.command(name="sync"
cmd_insert_pos = merged_code.find('@bot.tree.command(name="sync"')
if cmd_insert_pos != -1:
    merged_code = merged_code[:cmd_insert_pos] + price_cmd_code + "\n" + rumble_cmd_code + "\n" + ticketpanel_cmd_code + "\n" + verification_cmd_code + "\n" + merged_code[cmd_insert_pos:]
else:
    merged_code = merged_code + "\n" + price_cmd_code + "\n" + rumble_cmd_code + "\n" + ticketpanel_cmd_code + "\n" + verification_cmd_code

with open(r'c:\Users\pc\Desktop\unemployed bot\main.py', 'w', encoding='utf-8') as f:
    f.write(merged_code)

print("Successfully merged and saved main.py for Diffy Bot (Differential Degens)!")

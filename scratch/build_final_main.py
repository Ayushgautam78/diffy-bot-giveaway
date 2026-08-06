import zipfile
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\pc\Desktop\Arcie bot\main.py', 'r', encoding='utf-8', errors='ignore') as f:
    arcie_code = f.read()

with zipfile.ZipFile('bot-upload.zip', 'r') as z:
    bot_upload_code = z.read('main.py').decode('utf-8', errors='ignore')

# 1. Price/Crypto helper functions from bot_upload_code
price_funcs_match = re.search(r'(# -------- Crypto Price System --------[\s\S]*?)(?=# -------- Football Live Data)', bot_upload_code)
price_funcs = price_funcs_match.group(1) if price_funcs_match else ""

price_cmd_match = re.search(r'(@bot\.tree\.command\(name="price",[\s\S]*?async def price_slash_cmd[\s\S]*?\n\n)', bot_upload_code)
price_cmd = price_cmd_match.group(1) if price_cmd_match else ""

# 2. Rumble Royale helper functions & classes from bot_upload_code
rumble_funcs_match = re.search(r'(# -------- Rumble Royale Game Simulator Engine --------[\s\S]*?)(?=# -------- Support Ticket System --------)', bot_upload_code)
rumble_funcs = rumble_funcs_match.group(1) if rumble_funcs_match else ""

rumble_cmd_match = re.search(r'(@bot\.tree\.command\(name="royalrumble",[\s\S]*?async def royal_rumble_cmd[\s\S]*?\n\n)', bot_upload_code)
rumble_cmd = rumble_cmd_match.group(1) if rumble_cmd_match else ""

# 3. 2-Step Verification System from bot_upload_code
verif_funcs_match = re.search(r'(# -------- Persistent 2-Step Verification System --------[\s\S]*?)(?=# -------- Support Ticket System --------|\n\nif os\.path\.exists\(TICKET_FILE\):)', bot_upload_code)
verif_funcs = verif_funcs_match.group(1) if verif_funcs_match else ""

verif_cmd_match = re.search(r'(@bot\.tree\.command\(name="setupverification",[\s\S]*?async def setup_verification_cmd[\s\S]*?\n\n@bot\.event)', bot_upload_code)
verif_cmd = verif_cmd_match.group(1) if verif_cmd_match else ""

# 4. Ticketpanel & closeticket slash commands from bot_upload_code
ticket_cmds_match = re.search(r'(@bot\.tree\.command\(name="ticketpanel",[\s\S]*?async def close_alias_cmd[\s\S]*?\n\n)', bot_upload_code)
ticket_cmds = ticket_cmds_match.group(1) if ticket_cmds_match else ""

print("Extracted:")
print(f"  Price funcs: {len(price_funcs)}, Price cmd: {len(price_cmd)}")
print(f"  Rumble funcs: {len(rumble_funcs)}, Rumble cmd: {len(rumble_cmd)}")
print(f"  Verif funcs: {len(verif_funcs)}, Verif cmd: {len(verif_cmd)}")
print(f"  Ticket cmds: {len(ticket_cmds)}")

# Merge into arcie_code
insert_pos = arcie_code.find("# -------- Support Ticket System -------- #")
if insert_pos != -1:
    final_code = arcie_code[:insert_pos] + price_funcs + "\n\n" + rumble_funcs + "\n\n" + verif_funcs + "\n\n" + arcie_code[insert_pos:]
else:
    final_code = arcie_code + "\n\n" + price_funcs + "\n\n" + rumble_funcs + "\n\n" + verif_funcs

cmd_insert_pos = final_code.find('@bot.tree.command(name="sync"')
if cmd_insert_pos != -1:
    final_code = final_code[:cmd_insert_pos] + price_cmd + "\n" + rumble_cmd + "\n" + ticket_cmds + "\n" + verif_cmd + "\n" + final_code[cmd_insert_pos:]
else:
    final_code = final_code + "\n" + price_cmd + "\n" + rumble_cmd + "\n" + ticket_cmds + "\n" + verif_cmd

# Register TwoStepVerificationView in on_ready if present
on_ready_pos = final_code.find("bot.add_view(TicketLaunchView())")
if on_ready_pos != -1:
    view_reg = "bot.add_view(TwoStepVerificationView())\n        bot.add_view(VerifyFollowingView())\n        "
    final_code = final_code[:on_ready_pos] + view_reg + final_code[on_ready_pos:]

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(final_code)

print("Saved merged main.py successfully!")

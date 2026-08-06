import sys, re
from collections import Counter

with open("main.py", "r", encoding="utf-8") as f:
    text = f.read()

names = re.findall(r'name\s*=\s*"([^"]+)"', text)
names += re.findall(r"name\s*=\s*'([^']+)'", text)

tree_cmds = []
for line in text.splitlines():
    if "@bot.tree.command" in line:
        m = re.search(r'name=["\']([^"\']+)["\']', line)
        if m:
            tree_cmds.append(m.group(1))

print("Slash commands found:", tree_cmds)
counts = Counter(tree_cmds)
dups = {k: v for k, v in counts.items() if v > 1}
print("Duplicates:", dups)

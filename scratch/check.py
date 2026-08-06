import sys
with open(r'c:\Users\pc\Desktop\Arcie bot\main.py', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

cmds = ['price', 'royalrumble', 'purgeuser', 'reactionrole', 'multirrole', 'embed', 'announce', 'setwelcome', 'testwelcome', 'sharelink', 'delete', 'stats', 'serverinfo', 'userinfo', 'ticketpanel', 'setupverification', 'sync']
for cmd in cmds:
    found = f'name="{cmd}"' in text or f'def {cmd}' in text or f'.{cmd}' in text
    print(f'{cmd}: {found}')

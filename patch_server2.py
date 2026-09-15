import re
with open('server.ts', 'r') as f:
    content = f.read()

content = re.sub(r'You are a helpful chat assistant with perfect memory\..*?\[Image Description\]\(image_url\)\.', 'You are a helpful chat assistant with perfect memory.', content, flags=re.MULTILINE | re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)

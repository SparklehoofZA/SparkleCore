import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Remove generateSceneImage method and its invocation
# Let's find exactly what to remove
# 1. System instruction in App.tsx
old_sys = 'You are a helpful chat assistant with perfect memory. You can generate images using the generate_image tool when the user asks for a picture or when describing a vivid scene that warrants an illustration. When you use the tool, ALWAYS ensure the image prompt explicitly requests a vibrant anime cartoon style. ALWAYS include the image URL in your response using markdown format: ![Image Description](image_url).'
new_sys = 'You are a helpful chat assistant with perfect memory.'
content = content.replace(old_sys, new_sys)

old_sys2 = 'You can generate images using the generate_image tool when the user asks for a picture or when describing a vivid scene that warrants an illustration. When you use the tool, ALWAYS ensure the image prompt explicitly requests a vibrant anime cartoon style. ALWAYS include the image URL in your response using markdown format: ![Image Description](image_url).'
content = content.replace(old_sys2, '')

# 2. function handleGenerateScene
content = re.sub(r'const handleGenerateScene = async \(\) => \{.*?\n  \};\n', '', content, flags=re.MULTILINE | re.DOTALL)

# 3. Any button with "handleGenerateScene" or "Generate Scene"
content = re.sub(r'<button[^>]*onClick=\{handleGenerateScene\}[^>]*>.*?</button>', '', content, flags=re.MULTILINE | re.DOTALL)
content = re.sub(r'<button[^>]*>.*?Generate Scene.*?</button>', '', content, flags=re.MULTILINE | re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(content)

import re

with open('server.ts', 'r') as f:
    content = f.read()

# 1. Remove generateImageDeclaration completely
# It's from const generateImageDeclaration = { ... };
content = re.sub(r'const generateImageDeclaration = \{.*?name: "generate_image".*?^\};\n*', '', content, flags=re.MULTILINE | re.DOTALL)

# 2. Remove generateGeminiImage function
# async function generateGeminiImage ...
content = re.sub(r'async function generateGeminiImage.*?^\}\n*', '', content, flags=re.MULTILINE | re.DOTALL)

# 3. Remove /api/images/:filename
content = re.sub(r'app\.get\("/api/images/:filename".*?^\}\);\n*', '', content, flags=re.MULTILINE | re.DOTALL)

# 4. Remove /api/chat/scene
content = re.sub(r'app\.post\("/api/chat/scene".*?^\}\);\n*(const consolidationTimers)', r'\1', content, flags=re.MULTILINE | re.DOTALL)

# 5. Remove tools: [{ functionDeclarations: [generateImageDeclaration] }],
content = re.sub(r'\s*tools: \[\{ functionDeclarations: \[generateImageDeclaration\] \}\],', '', content)

# 6. Simplify while (keepCalling) loop in executeChatRound
# We will just replace it entirely.
# We want to replace the `let keepCalling = true;` down to `await saveHistory(pId, contents);`
old_loop_pattern = r'let keepCalling = true;.*?await saveHistory\(pId, contents\);'
new_loop_code = """
  const candidateModels = [
    selectedModel,
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.7-flash"
  ];

  const { response } = await callGeminiContentWithRetry({
    models: candidateModels,
    contents,
    config: {
      systemInstruction: finalSystemInstruction,
      temperature: Math.min(1.5, Math.max(0.1, genSettings.temperature)),
      topP: genSettings.topP,
      topK: genSettings.topK,
      maxOutputTokens: genSettings.maxTokens,
    },
    maxAttemptsPerModel: 3,
  });

  const responseContent = response.candidates?.[0]?.content;
  if (responseContent) {
    contents.push(responseContent);
  }

  await saveHistory(pId, contents);"""
content = re.sub(old_loop_pattern, new_loop_code.strip(), content, flags=re.MULTILINE | re.DOTALL)

# 7. Clean up baseSystemInstruction
old_system_instruction = r'You are a helpful chat assistant with perfect memory\. You can generate images using the generate_image tool when the user asks for a picture or when describing a vivid scene that warrants an illustration\. When you use the tool, you will receive an image URL back\. ALWAYS include the image URL in your response using markdown format: !\[Image Description\]\(image_url\)\.'
new_system_instruction = 'You are a helpful chat assistant with perfect memory.'
content = content.replace(old_system_instruction, new_system_instruction)

with open('server.ts', 'w') as f:
    f.write(content)

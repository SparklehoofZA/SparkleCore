import os
import re

UI_FILES = [
    'src/roleplayTemplate.ts',
    'src/components/PersonalityModal.tsx',
    'src/components/UserPersonaModal.tsx',
    'src/components/LoreBookManagerModal.tsx',
    'src/components/EventManagerModal.tsx',
    'src/components/ScenarioManagerModal.tsx',
    'src/App.tsx',
    'server.ts'
]

for filepath in UI_FILES:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Generic UI replacements
    content = content.replace('insertRoleplayMacro(\'"character"\',', 'insertRoleplayMacro(\'{{char}}\',')
    content = content.replace('insertRoleplayMacro(\'"user"\',', 'insertRoleplayMacro(\'{{user}}\',')
    content = content.replace('+"character"', '+"{{char}}"')
    content = content.replace('+"user"', '+"{{user}}"')
    content = content.replace('+ "character"', '+ "{{char}}"')
    content = content.replace('+ "user"', '+ "{{user}}"')
    
    # Specific UI text / placeholders
    content = content.replace('"character" ALWAYS refers', '{{char}} ALWAYS refers')
    content = content.replace('"user" ALWAYS refers', '{{user}} ALWAYS refers')
    content = content.replace('e.g. "character" works', 'e.g. {{char}} works')
    content = content.replace('e.g. "character" is', 'e.g. {{char}} is')
    content = content.replace('e.g. "character" stays', 'e.g. {{char}} stays')
    content = content.replace('and "user" walks', 'and {{user}} walks')
    content = re.sub(r'Whenever "user" enters', 'Whenever {{user}} enters', content, flags=re.IGNORECASE)
    content = content.replace('welcomes "user"', 'welcomes {{user}}')
    content = content.replace('serving "user"', 'serving {{user}}')
    content = content.replace('When "user" enters', 'When {{user}} enters')
    content = content.replace('"character" reacts', '{{char}} reacts')
    content = content.replace('when "character" gets', 'when {{char}} gets')
    content = content.replace('where "character" works', 'where {{char}} works')
    content = content.replace('chatting with "character"', 'chatting with {{char}}')
    content = content.replace('"character" knows', '{{char}} knows')
    content = content.replace('that "user" seeks', 'that {{user}} seeks')
    content = content.replace('how "character" should react', 'how {{char}} should react')
    content = content.replace('"character" looks startled while "user"', '{{char}} looks startled while {{user}}')
    content = content.replace('>"character"<', '>{{char}}<')
    content = content.replace('>"user"<', '>{{user}}<')
    content = content.replace('"character" is an old friend of "user"', '{{char}} is an old friend of {{user}}')
    content = content.replace('Insert "character"', 'Insert {{char}}')
    content = content.replace('("character")', '({{char}})')
    content = content.replace('Use <code className="text-amber-400 font-mono">"character"</code> and <code className="text-cyan-400 font-mono">"user"</code>', 'Use <code className="text-amber-400 font-mono">{{char}}</code> and <code className="text-cyan-400 font-mono">{{user}}</code>')

    # Template file replacements
    if 'roleplayTemplate.ts' in filepath:
        content = content.replace('characterMacro: \'"character"\',', 'characterMacro: \'{{char}}\',')
        content = content.replace('personalityMacro: \'"personality"\',', 'personalityMacro: \'{{char}}\',') 
        content = content.replace('userMacro: \'"user"\',', 'userMacro: \'{{user}}\',')
        content = content.replace('exampleScenario: \'"character" works at coffee shop and "user" walks in\',', 'exampleScenario: \'{{char}} works at coffee shop and {{user}} walks in\',')
        content = content.replace('defined as "character" and the active user persona is defined as "user".', 'defined as {{char}} and the active user persona is defined as {{user}}.')

    # Server / App prompts
    content = content.replace('the words "character", "personality", {{char}}, and {{character}}', 'the macros {{char}} and {{character}}, and the words "character" and "personality"')
    content = content.replace('the words "user" and {{user}} (whether quoted or unquoted)', 'the macro {{user}} and the word "user" (whether quoted or unquoted)')
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)


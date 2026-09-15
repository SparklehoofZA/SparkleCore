/**
 * Standard Roleplay Template & Macro Resolver
 * 
 * Standard definition & Conventions:
 * - Active Chat Character: Whenever prompts, scenarios, lorebooks, or settings refer to "character",
 *   "personality", {{char}}, or {{character}}, this ALWAYS refers to the active chat character.
 * - Active User Persona: Whenever prompts, scenarios, lorebooks, or settings refer to "user" or {{user}},
 *   this ALWAYS refers to the active user persona.
 * - Formatting Standard: Spoken dialogue MUST always be enclosed between double quotes (" "),
 *   while thoughts, actions, internal feelings, and narration MUST always be enclosed between asterisks (* *).
 * 
 * Example:
 * *looks up from the counter with a gentle smile* "Welcome in, "user"!" *sets the book down*
 */

export const ROLEPLAY_CONVENTION = {
  characterMacro: '{{char}}',
  personalityMacro: '{{char}}',
  userMacro: '{{user}}',
  exampleScenario: '{{char}} works at coffee shop and {{user}} walks in',
  description: 'In all scenarios, events, lore books, and character details, the active chat character is defined as {{char}} and the active user persona is defined as {{user}}. Spoken words are between " " and thoughts/actions are between * *.',
  dialogueRule: 'Spoken dialogue must be enclosed in double quotes (" ").',
  actionRule: 'Thoughts, actions, gestures, and scene descriptions must be enclosed in asterisks (* *).',
};

/**
 * Resolves roleplay variables ("character", "personality", and "user") in any scenario,
 * system instruction, appearance, character traits, or background text.
 * Binds "character" to the active chat character and "user" to the active user persona.
 */
export function resolveRoleplayVariables(
  text: string | undefined | null,
  characterName: string = "Character",
  userName: string = "User"
): string {
  if (!text) return "";

  const cName = (characterName || "Character").trim();
  const uName = (userName || "User").trim();

  let resolved = text;

  // 1. Quoted and macro possessive forms: "character's", {{char}}'s, "user's", {{user}}'s
  resolved = resolved.replace(/["'“”](character|personality|char)['’]s["'“”]/gi, `${cName}'s`);
  resolved = resolved.replace(/["'“”](character|personality|char)["'“”]['’]s/gi, `${cName}'s`);
  resolved = resolved.replace(/\{\{\s*(character|personality|char)['’]?s\s*\}\}/gi, `${cName}'s`);
  resolved = resolved.replace(/\{\{\s*(character|personality|char)\s*\}\}['’]s/gi, `${cName}'s`);
  resolved = resolved.replace(/\[\s*(character|personality|char)['’]?s\s*\]/gi, `${cName}'s`);

  resolved = resolved.replace(/["'“”]user['’]s["'“”]/gi, `${uName}'s`);
  resolved = resolved.replace(/["'“”]user["'“”]['’]s/gi, `${uName}'s`);
  resolved = resolved.replace(/\{\{\s*user['’]?s\s*\}\}/gi, `${uName}'s`);
  resolved = resolved.replace(/\{\{\s*user\s*\}\}['’]s/gi, `${uName}'s`);
  resolved = resolved.replace(/\[\s*user['’]?s\s*\]/gi, `${uName}'s`);

  // 2. Standard quoted definitions: "character", "personality", and "user"
  resolved = resolved.replace(/["'“”](character|personality|char)["'“”]/gi, cName);
  resolved = resolved.replace(/["'“”]user["'“”]/gi, uName);

  // 3. Bracketed & macro variants: {{character}}, {{char}}, {{personality}}, <character>, <char>, [character], [user]
  resolved = resolved.replace(/\{\{\s*(character|personality|char)\s*\}\}/gi, cName);
  resolved = resolved.replace(/\{\s*(character|personality|char)\s*\}/gi, cName);
  resolved = resolved.replace(/<\s*(character|personality|char)\s*>/gi, cName);
  resolved = resolved.replace(/\[\s*(character|personality|char)\s*\]/gi, cName);

  resolved = resolved.replace(/\{\{\s*user\s*\}\}/gi, uName);
  resolved = resolved.replace(/\{\s*user\s*\}/gi, uName);
  resolved = resolved.replace(/<\s*user\s*>/gi, uName);
  resolved = resolved.replace(/\[\s*user\s*\]/gi, uName);

  // 4. Standalone speaker tags: Character: / User:
  resolved = resolved.replace(/^\s*(character|personality|char):\s*/gim, `${cName}: `);
  resolved = resolved.replace(/^\s*user:\s*/gim, `${uName}: `);

  // 5. Open text possessive forms
  resolved = resolved.replace(/\b(character|personality)['’]s\b/gi, `${cName}'s`);
  resolved = resolved.replace(/\buser['’]s\b/gi, `${uName}'s`);

  // 6. Contextual word-boundary replacements for unquoted user/character/personality when used as actors/subjects
  resolved = resolved.replace(/\b(where|when|while|if) user and (character|personality|char)\b/gi, `where ${uName} and ${cName}`);
  resolved = resolved.replace(/\b(where|when|while|if) (character|personality|char) and user\b/gi, `where ${cName} and ${uName}`);
  resolved = resolved.replace(/\buser and (character|personality|char)\b/gi, `${uName} and ${cName}`);
  resolved = resolved.replace(/\b(character|personality|char) and user\b/gi, `${cName} and ${uName}`);
  resolved = resolved.replace(/\bbetween user and (character|personality|char)\b/gi, `between ${uName} and ${cName}`);
  resolved = resolved.replace(/\bbetween (character|personality|char) and user\b/gi, `between ${cName} and ${uName}`);
  resolved = resolved.replace(/\bwhen user walks in\b/gi, `when ${uName} walks in`);
  resolved = resolved.replace(/\bas user walks in\b/gi, `as ${uName} walks in`);
  resolved = resolved.replace(/\bwhen "user" walks in\b/gi, `when ${uName} walks in`);
  resolved = resolved.replace(/\b(with|to|from|about|for|by|when|as)\s+user\b/gi, `$1 ${uName}`);
  resolved = resolved.replace(/\b(with|to|from|about|for|by|when|as)\s+(character|personality|char)\b/gi, `$1 ${cName}`);
  resolved = resolved.replace(/\buser\s+(is|was|has|had|feels|gets|takes|does|makes|wakes|sleeps|finds|goes|runs|walks|approaches|enters|speaks|asks|smiles|looks|replies|says|stands|sits|steps)\b/gi, `${uName} $1`);
  resolved = resolved.replace(/\b(character|personality|char)\s+(is|was|has|had|feels|gets|takes|does|makes|wakes|sleeps|finds|goes|runs|works|approaches|enters|speaks|asks|smiles|looks|replies|says|stands|sits|steps)\b/gi, `${cName} $2`);

  return resolved;
}

/**
 * Inserts a macro string into a controlled input or textarea at the cursor position
 */
export function insertRoleplayMacro(
  macro: string,
  currentValue: string,
  setValue: (val: string) => void,
  element?: HTMLTextAreaElement | HTMLInputElement | null
) {
  if (element) {
    const start = element.selectionStart ?? currentValue.length;
    const end = element.selectionEnd ?? currentValue.length;
    const nextVal = currentValue.substring(0, start) + macro + currentValue.substring(end);
    setValue(nextVal);
    setTimeout(() => {
      element.focus();
      const newPos = start + macro.length;
      element.setSelectionRange(newPos, newPos);
    }, 0);
  } else {
    const nextVal = currentValue ? `${currentValue} ${macro}` : macro;
    setValue(nextVal);
  }
}

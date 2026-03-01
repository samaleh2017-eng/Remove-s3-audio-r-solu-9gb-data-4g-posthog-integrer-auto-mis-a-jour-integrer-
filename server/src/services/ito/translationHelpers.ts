export function getTranslationBasePrompt(basePrompt: string, targetLanguageCode: string): string {
  const langName = getLanguageNameFromCode(targetLanguageCode)
  return `IMPORTANT: The text you receive is already translated into ${langName}. Your output MUST be entirely in ${langName}. Do NOT change the language. Do NOT re-translate.\n\n${basePrompt}`
}

export function getTranslationTonePrompt(tonePrompt: string, targetLanguageCode: string): string {
  const langName = getLanguageNameFromCode(targetLanguageCode)
  return `CRITICAL LANGUAGE INSTRUCTION:
The input text is a translation into ${langName}.
You MUST produce your ENTIRE output in ${langName}.
All formatting elements — greetings, closings (e.g. "Best regards", "Cordially"), 
metadata, signatures — MUST be written in ${langName}.
Do NOT use any other language in the output.
Do NOT re-translate the content.

${tonePrompt}`
}

export function getLanguageNameFromCode(code: string): string {
  const map: Record<string, string> = {
    'af': 'Afrikaans', 'sq': 'Albanian', 'ar': 'Arabic', 'az': 'Azerbaijani',
    'eu': 'Basque', 'be': 'Belarusian', 'bn': 'Bengali', 'bs': 'Bosnian',
    'bg': 'Bulgarian', 'ca': 'Catalan', 'zh': 'Chinese', 'hr': 'Croatian',
    'cs': 'Czech', 'da': 'Danish', 'nl': 'Dutch', 'en': 'English',
    'et': 'Estonian', 'fi': 'Finnish', 'fr': 'French', 'gl': 'Galician',
    'de': 'German', 'el': 'Greek', 'gu': 'Gujarati', 'he': 'Hebrew',
    'hi': 'Hindi', 'hu': 'Hungarian', 'id': 'Indonesian', 'it': 'Italian',
    'ja': 'Japanese', 'kn': 'Kannada', 'kk': 'Kazakh', 'ko': 'Korean',
    'lv': 'Latvian', 'lt': 'Lithuanian', 'mk': 'Macedonian', 'ms': 'Malay',
    'ml': 'Malayalam', 'mr': 'Marathi', 'no': 'Norwegian', 'fa': 'Persian',
    'pl': 'Polish', 'pt': 'Portuguese', 'pa': 'Punjabi', 'ro': 'Romanian',
    'ru': 'Russian', 'sr': 'Serbian', 'sk': 'Slovak', 'sl': 'Slovenian',
    'es': 'Spanish', 'sw': 'Swahili', 'sv': 'Swedish', 'tl': 'Tagalog',
    'ta': 'Tamil', 'te': 'Telugu', 'th': 'Thai', 'tr': 'Turkish',
    'uk': 'Ukrainian', 'ur': 'Urdu', 'vi': 'Vietnamese', 'cy': 'Welsh',
  }
  return map[code] || code
}

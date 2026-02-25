import { franc } from 'franc-min'
import type { LlmProvider } from '../../clients/llmProvider.js'
import type { IntentTranscriptionOptions } from '../../clients/intentTranscriptionConfig.js'

const ISO3_TO_ISO1: Record<string, string> = {
  afr: 'af', sqi: 'sq', ara: 'ar', aze: 'az', eus: 'eu', bel: 'be',
  ben: 'bn', bos: 'bs', bul: 'bg', cat: 'ca', zho: 'zh', hrv: 'hr',
  ces: 'cs', dan: 'da', nld: 'nl', eng: 'en', est: 'et', fin: 'fi',
  fra: 'fr', glg: 'gl', deu: 'de', ell: 'el', guj: 'gu', heb: 'he',
  hin: 'hi', hun: 'hu', ind: 'id', ita: 'it', jpn: 'ja', kan: 'kn',
  kaz: 'kk', kor: 'ko', lav: 'lv', lit: 'lt', mkd: 'mk', msa: 'ms',
  mal: 'ml', mar: 'mr', nob: 'no', nno: 'no', fas: 'fa', pol: 'pl',
  por: 'pt', pan: 'pa', ron: 'ro', rus: 'ru', srp: 'sr', slk: 'sk',
  slv: 'sl', spa: 'es', swa: 'sw', swe: 'sv', tgl: 'tl', tam: 'ta',
  tel: 'te', tha: 'th', tur: 'tr', ukr: 'uk', urd: 'ur', vie: 'vi',
  cym: 'cy',
}

const LANGUAGE_NAMES: Record<string, string> = {
  af: 'Afrikaans', sq: 'Albanian', ar: 'Arabic', az: 'Azerbaijani',
  eu: 'Basque', be: 'Belarusian', bn: 'Bengali', bs: 'Bosnian',
  bg: 'Bulgarian', ca: 'Catalan', zh: 'Chinese', hr: 'Croatian',
  cs: 'Czech', da: 'Danish', nl: 'Dutch', en: 'English',
  et: 'Estonian', fi: 'Finnish', fr: 'French', gl: 'Galician',
  de: 'German', el: 'Greek', gu: 'Gujarati', he: 'Hebrew',
  hi: 'Hindi', hu: 'Hungarian', id: 'Indonesian', it: 'Italian',
  ja: 'Japanese', kn: 'Kannada', kk: 'Kazakh', ko: 'Korean',
  lv: 'Latvian', lt: 'Lithuanian', mk: 'Macedonian', ms: 'Malay',
  ml: 'Malayalam', mr: 'Marathi', no: 'Norwegian', fa: 'Persian',
  pl: 'Polish', pt: 'Portuguese', pa: 'Punjabi', ro: 'Romanian',
  ru: 'Russian', sr: 'Serbian', sk: 'Slovak', sl: 'Slovenian',
  es: 'Spanish', sw: 'Swahili', sv: 'Swedish', tl: 'Tagalog',
  ta: 'Tamil', te: 'Telugu', th: 'Thai', tr: 'Turkish',
  uk: 'Ukrainian', ur: 'Urdu', vi: 'Vietnamese', cy: 'Welsh',
}

const MIN_TEXT_LENGTH = 20

function detectLanguage(text: string): string | null {
  const clean = text.replace(/[#*_\-=>\[\](){}|`~]/g, ' ').trim()
  if (clean.length < MIN_TEXT_LENGTH) return null
  const iso3 = franc(clean)
  if (iso3 === 'und') return null
  return ISO3_TO_ISO1[iso3] ?? null
}

function languagesMatch(detected: string, expected: string): boolean {
  if (detected === expected) return true
  const similar: Record<string, string[]> = {
    pt: ['gl'],
    gl: ['pt'],
    no: ['da', 'sv'],
    da: ['no'],
    sv: ['no'],
    sr: ['hr', 'bs'],
    hr: ['sr', 'bs'],
    bs: ['sr', 'hr'],
    id: ['ms'],
    ms: ['id'],
  }
  return similar[expected]?.includes(detected) ?? false
}

export interface LanguageGuardOptions {
  expectedLanguage: string
  llmProvider: LlmProvider
  llmOptions: IntentTranscriptionOptions
  userPrompt: string
}

export async function guardLanguage(
  text: string,
  options: LanguageGuardOptions,
): Promise<string> {
  const { expectedLanguage, llmProvider, llmOptions, userPrompt } = options

  const detected = detectLanguage(text)
  if (!detected) {
    console.log('[LanguageGuard] Text too short to detect, accepting as-is')
    return text
  }

  if (languagesMatch(detected, expectedLanguage)) {
    console.log(`[LanguageGuard] Language OK: detected=${detected}, expected=${expectedLanguage}`)
    return text
  }

  const langName = LANGUAGE_NAMES[expectedLanguage] || expectedLanguage
  console.log(
    `[LanguageGuard] MISMATCH: detected=${detected}, expected=${expectedLanguage}. Retrying with forced ${langName}.`,
  )

  const forcedPrompt = `[CRITICAL LANGUAGE OVERRIDE]\nThe previous output was in the WRONG language (${detected} instead of ${expectedLanguage}).\nYou MUST rewrite your ENTIRE output in ${langName}. Every single word must be in ${langName}.\nDo NOT mix languages. Do NOT keep any words from the wrong language.\n\n${userPrompt}`

  const retryResult = await llmProvider.adjustTranscript(forcedPrompt, llmOptions)

  const retryDetected = detectLanguage(retryResult)
  if (retryDetected && !languagesMatch(retryDetected, expectedLanguage)) {
    console.log(`[LanguageGuard] Retry still wrong: detected=${retryDetected}. Accepting anyway.`)
  } else {
    console.log(`[LanguageGuard] Retry succeeded: language is now correct.`)
  }

  return retryResult
}

export function detectTextLanguage(text: string): string | null {
  return detectLanguage(text)
}

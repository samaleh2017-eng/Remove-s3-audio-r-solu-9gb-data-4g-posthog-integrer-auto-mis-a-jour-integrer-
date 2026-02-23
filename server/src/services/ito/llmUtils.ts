export function applyReplacements(
  transcript: string,
  replacements: Array<{ fromText: string; toText: string }>,
): string {
  if (!replacements || replacements.length === 0) return transcript

  let result = transcript
  for (const replacement of replacements) {
    const from = replacement.fromText
    const to = replacement.toText
    if (!from || !to) continue
    if (from.toLowerCase() === to.toLowerCase()) continue

    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
    result = result.replace(regex, to)
  }
  return result
}

export function filterLeakedContext(text: string): string {
  if (!text || !text.trim()) return ''

  const markers = [
    '{START_USER_DETAILS_MARKER}', '{END_USER_DETAILS_MARKER}',
    '{START_WINDOW_TITLE_MARKER}', '{END_WINDOW_TITLE_MARKER}',
    '{START_APP_NAME_MARKER}', '{END_APP_NAME_MARKER}',
    '{START_BROWSER_URL_MARKER}', '{END_BROWSER_URL_MARKER}',
    '{START_BROWSER_DOMAIN_MARKER}', '{END_BROWSER_DOMAIN_MARKER}',
    '{START_CONTEXT_MARKER}', '{END_CONTEXT_MARKER}',
    '{START_USER_COMMAND_MARKER}', '{END_USER_COMMAND_MARKER}',
  ]

  let filtered = text
  for (const marker of markers) {
    filtered = filtered.split(marker).join('')
  }

  const leakedPatterns = [
    /^Name:\s*.+$/gm,
    /^Full\s*name:\s*.+$/gim,
    /^Occupation:\s*.+$/gim,
    /^Company:\s*.+$/gm,
    /^Role:\s*.+$/gm,
    /^Email:\s*.+$/gm,
    /^Phone:\s*.+$/gm,
    /^Address:\s*.+$/gm,
    /^Website:\s*.+$/gm,
    /^LinkedIn:\s*.+$/gm,
    /^Window\s*title:\s*.+$/gim,
    /^App\s*name:\s*.+$/gim,
    /^URL:\s*.+$/gm,
    /^Domain:\s*.+$/gm,
  ]

  for (const pattern of leakedPatterns) {
    filtered = filtered.replace(pattern, '')
  }

  filtered = filtered.trim().replace(/\n{3,}/g, '\n\n')
  return filtered
}

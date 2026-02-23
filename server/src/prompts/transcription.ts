/**
 * Estimates token count using rough approximation (1 token ≈ 4 characters)
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Creates a transcription prompt that stays within the 224 token limit.
 * 
 * IMPORTANT: The Whisper prompt parameter is conditioning context, not an instruction.
 * It should look like a natural transcript snippet containing the vocabulary words,
 * so Whisper is biased to recognize them without hallucinating them.
 * If vocabulary would exceed the token limit, it is truncated.
 * An empty prompt is returned when there is no vocabulary.
 */
export function createTranscriptionPrompt(vocabulary: string[]): string {
  const maxTokens = 224
  // No vocabulary → empty prompt (no conditioning bias)
  if (vocabulary.length === 0) {
    console.log('Transcription prompt: 0 estimated tokens (no vocabulary)')
    return ''
  }

  // Format vocabulary as a natural comma-separated list
  // Whisper uses this as context to bias recognition toward these words
  let vocabString = vocabulary.join(', ')
  let wasTruncated = false

  const availableChars = maxTokens * 4 - 10 // rough token estimate with buffer

  if (vocabString.length > availableChars) {
    const originalLength = vocabString.length
    vocabString = vocabString
      .substring(0, availableChars)
      .replace(/,\s*[^,]*$/, '') // Remove incomplete last term
    wasTruncated = true
    console.log(
      `Vocabulary truncated from ${originalLength} to ${vocabString.length} characters to stay within token limit`,
    )
  }

  if (vocabString.trim() === '') {
    console.log('Transcription prompt: 0 estimated tokens (vocabulary empty after truncation)')
    return ''
  }

  const finalTokenCount = estimateTokenCount(vocabString)
  console.log(
    `Transcription prompt: ${finalTokenCount} estimated tokens${wasTruncated ? ' (vocabulary truncated)' : ''}`,
  )

  return vocabString
}

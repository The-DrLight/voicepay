let ttsConfig = {
  voice_language: 'en',
  voice_accent: 'yoruba',
  voice_gender: 'female'
}

export function setTTSConfig(config) {
  ttsConfig = { ...ttsConfig, ...config }
}

let queue = Promise.resolve()

export function speak(text) {
  console.log('[TTS] Queuing:', text.substring(0, 50))
  queue = queue.then(() => generateAndPlay(text))
  return queue
}

async function generateAndPlay(text) {
  console.log('[TTS] Generating audio for:', text.substring(0, 50))
  try {
    const response = await fetch('/tts-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.substring(0, 4096),
        voice_language: ttsConfig.voice_language,
        voice_accent: ttsConfig.voice_accent,
        voice_gender: ttsConfig.voice_gender
      })
    })

    if (!response.ok) {
      console.error('[TTS] HTTP error:', response.status)
      return
    }

    const data = await response.json()
    console.log('[TTS] Response:', data?.data?.processing_status)

    const audioPath = data?.data?.audio_path
    if (!audioPath) {
      console.error('[TTS] No audio path in response:', data)
      return
    }

    console.log('[TTS] Playing:', audioPath)
    const audio = new Audio(audioPath)

    await new Promise((resolve) => {
      audio.onended = () => {
        console.log('[TTS] Playback complete')
        resolve()
      }
      audio.onerror = (e) => {
        console.error('[TTS] Playback error:', e)
        resolve()
      }
      audio.play().catch((e) => {
        console.error('[TTS] Play() rejected:', e)
        resolve()
      })
    })

  } catch (err) {
    console.error('[TTS] generateAndPlay error:', err.message)
  }
}

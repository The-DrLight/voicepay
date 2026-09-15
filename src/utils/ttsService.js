import { log } from './logger.js'

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
  log.info('TTS', 'Queuing', { text: text.substring(0, 60) })
  queue = queue.then(() => generateAndPlay(text))
  return queue
}

async function generateAndPlay(text) {
  log.info('TTS', 'Generating audio', { text: text.substring(0, 60), config: ttsConfig })
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
      log.error('TTS', 'Generate failed', { status: response.status })
      return
    }

    const data = await response.json()
    log.info('TTS', 'Response received', { status: data?.data?.processing_status })

    const audioPath = data?.data?.audio_path
    if (!audioPath) {
      log.error('TTS', 'No audio path in response', data)
      return
    }

    log.info('TTS', 'Playing audio', { url: audioPath })
    const audio = new Audio(audioPath)

    await new Promise((resolve) => {
      audio.onended = () => {
        log.info('TTS', 'Playback complete')
        resolve()
      }
      audio.onerror = (e) => {
        log.error('TTS', 'Playback error', { error: e?.message || String(e) })
        resolve()
      }
      audio.play().catch((e) => {
        log.error('TTS', 'Play() rejected', { error: e.message })
        resolve()
      })
    })

  } catch (err) {
    log.error('TTS', 'generateAndPlay error', { error: err.message })
  }
}

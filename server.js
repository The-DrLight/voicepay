import express from 'express'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'
import httpProxy from 'http-proxy'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000
const INTRON_KEY = process.env.VITE_INTRON_API_KEY
const GROQ_KEY = process.env.GROQ_API_KEY

app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')))

// TTS Generate - direct fetch, no proxy middleware
app.post('/tts-generate', async (req, res) => {
  console.log('[SERVER] TTS Generate called, text length:', req.body?.text?.length)
  try {
    const response = await fetch(
      'https://infer.voice.intron.io/tts/v1/generate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${INTRON_KEY}`
        },
        body: JSON.stringify(req.body)
      }
    )
    const data = await response.json()
    console.log('[SERVER] TTS Generate status:', response.status, data?.data?.processing_status)
    res.json(data)
  } catch (err) {
    console.error('[SERVER] TTS Generate error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Groq AI extraction
app.post('/ai-extract', async (req, res) => {
  console.log('[SERVER] AI Extract called')
  try {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify(req.body)
      }
    )
    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error('[SERVER] AI Extract error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// All other routes serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const server = createServer(app)

// WebSocket proxy for STT and TTS streaming
const wsProxy = httpProxy.createProxyServer({
  target: 'wss://infer.voice.intron.io',
  ws: true,
  secure: true,
  changeOrigin: true
})

wsProxy.on('error', (err, req, socket) => {
  console.error('[SERVER] WS proxy error:', err.message)
  socket?.destroy()
})

server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/stt-stream')) {
    req.url = req.url.replace('/stt-stream', '/stt/v1/stream')
    req.headers['authorization'] = `Bearer ${INTRON_KEY}`
    console.log('[SERVER] STT WebSocket upgrade')
    wsProxy.ws(req, socket, head)
  } else if (req.url.startsWith('/tts-stream')) {
    req.url = req.url.replace('/tts-stream', '/tts/v1/stream')
    req.headers['authorization'] = `Bearer ${INTRON_KEY}`
    console.log('[SERVER] TTS WebSocket upgrade')
    wsProxy.ws(req, socket, head)
  }
})

server.listen(PORT, () => {
  console.log(`[SERVER] VoicePay running on port ${PORT}`)
  console.log(`[SERVER] Intron key present: ${!!INTRON_KEY}`)
  console.log(`[SERVER] Groq key present: ${!!GROQ_KEY}`)
})

import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import httpProxy from 'http-proxy'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

const INTRON_KEY = process.env.VITE_INTRON_API_KEY
const GROQ_KEY = process.env.GROQ_API_KEY

// Serve built React app
app.use(express.static(path.join(__dirname, 'dist')))

// Proxy TTS generate (HTTP)
app.use('/tts-generate', createProxyMiddleware({
  target: 'https://infer.voice.intron.io',
  changeOrigin: true,
  pathRewrite: { '^/tts-generate': '/tts/v1/generate' },
  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setHeader('Authorization', `Bearer ${INTRON_KEY}`)
    }
  }
}))

// Proxy Groq (HTTP)
app.use('/ai-extract', createProxyMiddleware({
  target: 'https://api.groq.com',
  changeOrigin: true,
  pathRewrite: { '^/ai-extract': '/openai/v1/chat/completions' },
  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setHeader('Authorization', `Bearer ${GROQ_KEY}`)
    }
  }
}))

// All other routes serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

const server = createServer(app)

// Proxy STT WebSocket
const wsProxy = httpProxy.createProxyServer({
  target: 'wss://infer.voice.intron.io',
  ws: true,
  secure: true,
  changeOrigin: true
})

server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/stt-stream')) {
    req.url = req.url.replace('/stt-stream', '/stt/v1/stream')
    req.headers['authorization'] = `Bearer ${INTRON_KEY}`
    wsProxy.ws(req, socket, head)
  } else if (req.url.startsWith('/tts-stream')) {
    req.url = req.url.replace('/tts-stream', '/tts/v1/stream')
    req.headers['authorization'] = `Bearer ${INTRON_KEY}`
    wsProxy.ws(req, socket, head)
  }
})

server.listen(PORT, () => {
  console.log(`VoicePay server running on port ${PORT}`)
})

import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const authHeaders = {
    Authorization: `Bearer ${env.VITE_INTRON_API_KEY}`,
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/stt-stream': {
          target: 'wss://infer.voice.intron.io',
          ws: true,
          rewrite: (path) => path.replace(/^\/stt-stream/, '/stt/v1/stream'),
          headers: authHeaders,
          secure: true,
          changeOrigin: true,
        },
        '/tts-generate': {
          target: 'https://infer.voice.intron.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/tts-generate/, '/tts/v1/generate'),
          headers: authHeaders,
        },
        '/tts-stream': {
          target: 'wss://infer.voice.intron.io',
          ws: true,
          rewrite: (path) => path.replace(/^\/tts-stream/, '/tts/v1/stream'),
          headers: authHeaders,
          secure: true,
          changeOrigin: true,
        },
      },
    },
  }
})

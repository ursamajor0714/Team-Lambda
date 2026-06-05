// [React 전환] Vite 설정.
//   - server.proxy: 개발 중 /api 요청을 Django(8000번)로 자동 전달
//     → React는 5173, Django는 8000 으로 따로 떠 있지만 코드에서는 그냥 fetch('/api/posts/') 만 쓰면 됨
// [Docker 추가] host: true / 환경변수 기반 proxy target 추가
//   - Docker로 띄울 땐 VITE_API_PROXY=http://backend:8000 (compose가 자동 주입)
//   - 호스트에서 npm run dev 할 땐 기본값 127.0.0.1:8000 사용
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      usePolling: true,
      interval: 100,
    },
    host: true, // [Docker 추가] 0.0.0.0 바인딩 (컨테이너 밖에서 접속 가능)
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})

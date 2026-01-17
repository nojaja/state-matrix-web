import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages でリポジトリをサブパスで公開する場合は base を設定する
  // 例: https://<OWNER>.github.io/state-matrix-web/ に公開する場合は '/state-matrix-web/' を指定
  base: '/state-matrix-web/',
  plugins: [vue()],
})

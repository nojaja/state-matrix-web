import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
  plugins: [HstVue()],
  // .story.vue のみを収集対象にする（src/ 配下のみ、docs等の生成物を除外）
  storyMatch: ['src/**/*.story.vue'],
  storyIgnore: ['**/node_modules/**', 'docs/**', 'dist/**', '.histoire/**'],
  setupFile: 'src/histoire.setup.ts',
  vite: {
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  }
})

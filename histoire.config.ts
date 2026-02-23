import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
  plugins: [HstVue()],
  // .story.vue のみを収集対象にする
  storyMatch: ['**/*.story.vue'],
  setupFile: 'src/histoire.setup.ts',
  vite: {
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  }
})

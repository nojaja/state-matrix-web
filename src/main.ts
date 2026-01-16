import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

import { useProjectStore } from './stores/projectStore'
import { useProcessStore } from './stores/processStore'
import { useCategoryStore } from './stores/categoryStore'
import { useArtifactStore } from './stores/artifactStore'
import { useTriggerStore } from './stores/triggerStore'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

// プロジェクト選択が変わったら各ストアをリロードまたはクリアする
const projectStore = useProjectStore()
const processStore = useProcessStore()
const categoryStore = useCategoryStore()
const artifactStore = useArtifactStore()
const triggerStore = useTriggerStore()

watch(() => projectStore.selectedProject, async (newVal) => {
	if (!newVal) {
		// 未選択時は一覧をクリア
		processStore.processes = []
		categoryStore.categories = []
		artifactStore.artifacts = []
		triggerStore.triggers = []
		triggerStore.relations = []
	} else {
		// 選択時は各ストアのデータを再読み込み
		await Promise.all([
			processStore.fetchAll(),
			categoryStore.fetchAll(),
			artifactStore.fetchAll(),
			triggerStore.fetchAll()
		])
	}
})

// ルートガード: プロジェクトが選択されていない初回アクセス時は /project へ誘導
router.beforeEach((to, from, next) => {
	void from;
  if (!projectStore.selectedProject && to.name !== 'project') {
    next({ name: 'project' })
    return
  }
  next()
})

app.mount('#app')

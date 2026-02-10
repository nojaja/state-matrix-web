<template>
  <div>
    <h4 class="font-semibold">フィールド解決</h4>
    <div v-if="!entry">競合エントリがありません</div>
    <div v-else>
      <div class="text-sm mb-2">path: {{ entry.path }}</div>
      <div class="grid grid-cols-3 gap-2 mb-2">
        <div>
          <h5 class="font-medium">Base</h5>
          <pre class="text-xs p-2 border rounded max-h-40 overflow-auto">{{ entry.base }}</pre>
        </div>
        <div>
          <h5 class="font-medium">Local</h5>
          <pre class="text-xs p-2 border rounded max-h-40 overflow-auto">{{ entry.local }}</pre>
        </div>
        <div>
          <h5 class="font-medium">Remote</h5>
          <pre class="text-xs p-2 border rounded max-h-40 overflow-auto">{{ entry.remote }}</pre>
        </div>
      </div>

      <div class="mb-2">
        <label class="block text-sm mb-1">手動編集</label>
        <textarea v-model="edited" class="w-full border rounded p-2 text-xs" rows="6"></textarea>
      </div>

      <div class="flex gap-2 mb-4">
        <button @click="applyLocal" class="px-2 py-1 bg-green-600 text-white rounded">ローカル採用</button>
        <button @click="applyRemote" class="px-2 py-1 bg-blue-600 text-white rounded">リモート採用</button>
        <button @click="applyManual" class="px-2 py-1 bg-gray-600 text-white rounded">編集を保存</button>
      </div>
    </div>

    <div class="mt-4">
      <div v-if="!project">プロジェクトが選択されていません</div>
      <div v-else>
        <h4 class="font-bold mb-2">競合一覧</h4>
        <ul>
          <li v-for="(c, key) in conflicts" :key="key" class="mb-2 border p-2 rounded">
            <div class="text-sm text-gray-700">キー: {{ key }}</div>
            <div class="text-xs text-gray-500">パス: {{ c.path }}</div>
            <div class="mt-2 flex gap-2">
              <button @click="resolveAsLocal(key)" class="px-2 py-1 bg-green-600 text-white rounded">ローカルを適用</button>
              <button @click="resolveAsRemote(key)" class="px-2 py-1 bg-blue-600 text-white rounded">リモートを適用</button>
            </div>
          </li>
        </ul>
        <div v-if="Object.keys(conflicts).length===0" class="text-gray-500">競合はありません</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useProjectStore } from '../../stores/projectStore'
import RepositoryWorkerClient from '../../lib/repositoryWorkerClient'

const props = defineProps<{ keyId: string }>()
const projectStore = useProjectStore()

const entry = computed(() => {
  const p = projectStore.selectedProject
  if (!p) return null
  return projectStore.conflictData?.[p]?.[props.keyId] ?? null
})

const edited = ref('')

// keep edited in sync when entry changes
watchEffect(() => {
  edited.value = entry.value?.local ?? ''
})

/**
 * Push and sync helper
 */
async function pushThenSync(project: string, path: string, content: string) {
  const client = new RepositoryWorkerClient()
  const cfg = projectStore.repoConfigs[project]
  try {
    if (cfg) {
      await client.pushPathsToRemote(cfg, [{ path, content }])
      await projectStore.syncProject(project)
    } else {
      await projectStore.syncProject(project)
    }
  } catch (_e) {
    await projectStore.syncProject(project)
  }
}

async function applyLocal() {
  if (!props.keyId) return
  const p = projectStore.selectedProject
  if (!p) return
  const e = projectStore.conflictData?.[p]?.[props.keyId]
  if (!e) return
  const content = e.local ?? ''
  try {
    await projectStore.writeProjectFile(p, e.path, content)
  } catch (err) {
    console.error('write failed', err)
  }
  await projectStore.removeConflict(props.keyId)
  await pushThenSync(p, e.path, content)
}

async function applyRemote() {
  if (!props.keyId) return
  const p = projectStore.selectedProject
  if (!p) return
  const e = projectStore.conflictData?.[p]?.[props.keyId]
  if (!e) return
  const content = e.remote ?? ''
  try {
    await projectStore.writeProjectFile(p, e.path, content)
  } catch (err) {
    console.error('write failed', err)
  }
  await projectStore.removeConflict(props.keyId)
  await pushThenSync(p, e.path, content)
}

async function applyManual() {
  if (!props.keyId) return
  const p = projectStore.selectedProject
  if (!p) return
  const e = projectStore.conflictData?.[p]?.[props.keyId]
  if (!e) return
  try {
    await projectStore.writeProjectFile(p, e.path, edited.value)
  } catch (err) {
    console.error('write failed', err)
  }
  await projectStore.removeConflict(props.keyId)
  await pushThenSync(p, e.path, edited.value)
}

const project = computed(() => projectStore.selectedProject)
const conflicts = computed(() => {
  const p = project.value
  if (!p) return {}
  return projectStore.conflictData?.[p] || {}
})

async function resolveAsLocal(key: string) {
  try {
    const project = projectStore.selectedProject
    if (!project) throw new Error('no project')
    const entry = projectStore.conflictData?.[project]?.[key]
    const content = entry?.local ?? ''
    await projectStore.writeProjectFile(project, entry?.path || '', content)
    await projectStore.removeConflict(key)
    const client = new RepositoryWorkerClient()
    const cfg = projectStore.repoConfigs[project]
    if (cfg) await client.pushPathsToRemote(cfg, [{ path: entry?.path || '', content }])
    await projectStore.syncProject(project)
    alert('ローカルを適用して競合を削除しました')
  } catch (e) {
    console.error(e)
    alert('解決に失敗しました')
  }
}

async function resolveAsRemote(key: string) {
  try {
    const project = projectStore.selectedProject
    if (!project) throw new Error('no project')
    const entry = projectStore.conflictData?.[project]?.[key]
    const content = entry?.remote ?? ''
    await projectStore.writeProjectFile(project, entry?.path || '', content)
    await projectStore.removeConflict(key)
    const client = new RepositoryWorkerClient()
    const cfg = projectStore.repoConfigs[project]
    if (cfg) await client.pushPathsToRemote(cfg, [{ path: entry?.path || '', content }])
    await projectStore.syncProject(project)
    alert('リモートを適用して競合を削除しました')
  } catch (e) {
    console.error(e)
    alert('解決に失敗しました')
  }
}
</script>

<style scoped>
/* minimal styling, reuse tailwind in templates */
</style>

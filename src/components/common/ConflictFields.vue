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
import { useMetadataStore } from '../../stores/metadataStore'
import RepositoryWorkerClient from '../../lib/repositoryWorkerClient'

const props = defineProps<{ keyId: string }>()
const projectStore = useProjectStore()
const metadataStore = useMetadataStore()

const entry = computed(() => {
  const p = projectStore.selectedProject
  if (!p) return null
  return metadataStore.conflictData?.[p]?.[props.keyId] ?? null
})

const edited = ref('')

// keep edited in sync when entry changes
watchEffect(() => {
  edited.value = entry.value?.local ?? ''
})

/**
 * Push and sync helper
 * @param project - プロジェクト名
 * @param path - ファイルパス
 * @param content - ファイル内容
 */
async function pushThenSync(project: string, path: string, content: string) {
  const client = new RepositoryWorkerClient()
  const cfg = await metadataStore.getRepoConfig(project)
  try {
    if (cfg) {
      await client.pushPathsToRemote(cfg, [{ path, content }])
      await metadataStore.syncProject(project)
    } else {
      await metadataStore.syncProject(project)
    }
  } catch (e) {
    console.error('[ConflictFields] saveRemote error:', e)
    await metadataStore.syncProject(project)
  }
}

/**
 * 処理名: ローカル側を適用
 * 処理概要: 競合解決でローカルの内容を採用
 */
async function applyLocal() {
  if (!props.keyId) return
  const p = projectStore.selectedProject
  if (!p) return
  const e = metadataStore.conflictData?.[p]?.[props.keyId]
  if (!e) return
  const content = e.local ?? ''
  try {
    await metadataStore.writeProjectFile(p, e.path, content)
  } catch (err) {
    console.error('write failed', err)
  }
  await metadataStore.removeConflict(p, props.keyId)
  await pushThenSync(p, e.path, content)
}

/**
 * 処理名: リモート側を適用
 * 処理概要: 競合解決でリモートの内容を採用
 */
async function applyRemote() {
  if (!props.keyId) return
  const p = projectStore.selectedProject
  if (!p) return
  const e = metadataStore.conflictData?.[p]?.[props.keyId]
  if (!e) return
  const content = e.remote ?? ''
  try {
    await metadataStore.writeProjectFile(p, e.path, content)
  } catch (err) {
    console.error('write failed', err)
  }
  await metadataStore.removeConflict(p, props.keyId)
  await pushThenSync(p, e.path, content)
}

/**
 * 処理名: 手動編集値を適用
 * 処理概要: ユーザーが編集した内容で競合を解決
 */
async function applyManual() {
  if (!props.keyId) return
  const p = projectStore.selectedProject
  if (!p) return
  const e = metadataStore.conflictData?.[p]?.[props.keyId]
  if (!e) return
  try {
    await metadataStore.writeProjectFile(p, e.path, edited.value)
  } catch (err) {
    console.error('write failed', err)
  }
  await metadataStore.removeConflict(p, props.keyId)
  await pushThenSync(p, e.path, edited.value)
}

const project = computed(() => projectStore.selectedProject)
const conflicts = computed(() => {
  const p = project.value
  if (!p) return {}
  return metadataStore.conflictData?.[p] || {}
})

/**
 * 処理名: ローカルで解決
 * @param key - 競合ID
 */
async function resolveAsLocal(key: string) {
  try {
    const project = projectStore.selectedProject
    if (!project) throw new Error('no project')
    const entry = metadataStore.conflictData?.[project]?.[key]
    const content = entry?.local ?? ''
    await metadataStore.writeProjectFile(project, entry?.path || '', content)
    await metadataStore.removeConflict(project, key)
    const client = new RepositoryWorkerClient()
      const cfg = await metadataStore.getRepoConfig(project)
      if (cfg) await client.pushPathsToRemote(cfg, [{ path: entry?.path || '', content }])
    await metadataStore.syncProject(project)
    alert('ローカルを適用して競合を削除しました')
  } catch (e) {
    console.error(e)
    alert('解決に失敗しました')
  }
}

/**
 * 処理名: リモートで解決
 * @param key - 競合ID
 */
async function resolveAsRemote(key: string) {
  try {
    const project = projectStore.selectedProject
    if (!project) throw new Error('no project')
    const entry = metadataStore.conflictData?.[project]?.[key]
    const content = entry?.remote ?? ''
    await metadataStore.writeProjectFile(project, entry?.path || '', content)
    await metadataStore.removeConflict(project, key)
    const client = new RepositoryWorkerClient()
    const cfg = await metadataStore.getRepoConfig(project)
    if (cfg) await client.pushPathsToRemote(cfg, [{ path: entry?.path || '', content }])
    await metadataStore.syncProject(project)
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

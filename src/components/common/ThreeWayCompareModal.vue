<template>
  <div class="p-4">
    <h3 class="text-lg font-semibold mb-2">三者比較・競合解消</h3>
    <div v-if="!entry">競合エントリが見つかりません</div>
    <div v-else>
      <div class="mb-2 text-sm">path: {{ entry.path }}</div>
      <!-- Field-level editor component -->
      <ConflictFields :keyId="keyId" />
      <div class="mt-4 flex gap-2">
        <button @click="applyLocal" class="px-3 py-1 bg-green-600 text-white rounded">ローカルを適用</button>
        <button @click="applyRemote" class="px-3 py-1 bg-blue-600 text-white rounded">リモートを適用</button>
        <button @click="applyManual" class="px-3 py-1 bg-gray-600 text-white rounded">編集で保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ConflictFields from './ConflictFields.vue'
import { useProjectStore } from '../../stores/projectStore'
import { useMetadataStore } from '../../stores/metadataStore'
import RepositoryWorkerClient from '../../lib/repositoryWorkerClient'

const props = defineProps<{ keyId: string }>()
const keyId = props.keyId
const projectStore = useProjectStore()
const metadataStore = useMetadataStore()

const entry = computed(() => {
  const p = projectStore.selectedProject
  if (!p) return null
  return metadataStore.conflictData[p]?.[keyId] ?? null
})

/**
 *
 * @param project
 * @param path
 * @param content
 */
async function pushThenSync(project: string, path: string, content: string) {
  const client = new RepositoryWorkerClient()
  const cfg = await metadataStore.getRepoConfig(project)
  try {
    if (cfg) await client.pushPathsToRemote(cfg, [{ path, content }])
  } catch (_e) {
    // ignore push errors, we'll re-sync anyway
  }
  await metadataStore.syncProject(project)
}

/**
 *
 */
async function applyLocal() {
  if (!keyId) return
  const p = projectStore.selectedProject
  if (!p) return
  const e = metadataStore.conflictData[p]?.[keyId]
  if (!e) return
  const content = e.local ?? ''
  try {
    await metadataStore.writeProjectFile(p, e.path, content)
  } catch (err) {
    console.error('write failed', err)
  }
  await metadataStore.removeConflict(p, keyId)
  await pushThenSync(p, e.path, content)
  alert('ローカルを適用しました')
}

/**
 *
 */
async function applyRemote() {
  if (!keyId) return
  const p = projectStore.selectedProject
  if (!p) return
  const e = metadataStore.conflictData[p]?.[keyId]
  if (!e) return
  const content = e.remote ?? ''
  try {
    await metadataStore.writeProjectFile(p, e.path, content)
  } catch (err) {
    console.error('write failed', err)
  }
  await metadataStore.removeConflict(p, keyId)
  await pushThenSync(p, e.path, content)
  alert('リモートを適用しました')
}

/**
 *
 */
async function applyManual() {
  // delegate to ConflictFields manual save: open manual editor there; here we simply re-sync
  if (!keyId) return
  const p = projectStore.selectedProject
  if (!p) return
  await metadataStore.syncProject(p)
  alert('編集を保存しました')
}
</script>

<style scoped></style>

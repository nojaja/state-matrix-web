<template>
  <div>
    <h2 class="text-xl font-semibold mb-4">プロジェクト管理</h2>

    <div class="mb-4">
      <button class="bg-blue-600 text-white px-3 py-1 rounded" @click="showNew = !showNew">新規作成</button>
    </div>

    <div v-if="showNew" class="mb-4">
      <input v-model="newName" placeholder="プロジェクト名を入力" class="border p-2 mr-2" />
      <button class="bg-green-600 text-white px-3 py-1 rounded" @click="create">作成</button>
      <button class="ml-2 px-3 py-1 rounded border" @click="cancel">キャンセル</button>
    </div>

    <div v-if="store.loading">読み込み中...</div>

    <div v-if="store.projects.length === 0 && !store.loading" class="text-gray-600">
      OPFS にプロジェクトが見つかりません。新規作成してください。
    </div>

    <ul v-if="store.projects.length > 0" class="space-y-2">
      <li v-for="p in store.projects" :key="p" class="flex items-center justify-between border p-2 rounded">
        <div>
          <strong>{{ p }}</strong>
          <span v-if="store.selectedProject === p" class="ml-2 text-sm text-green-600">(選択中)</span>
        </div>
        <div>
          <button class="px-2 py-1 mr-2 border rounded" @click="select(p)">選択</button>
        </div>
      </li>
    </ul>

    <div class="mt-6">
      <button v-if="store.selectedProject" class="px-3 py-1 border rounded" @click="clear">選択解除</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useProjectStore } from '../stores/projectStore'

const store = useProjectStore()
const showNew = ref(false)
const newName = ref('')

// store をテンプレートで直接参照することでリアクティブ性を保つ

onMounted(async () => {
  await store.fetchAll()
})

/**
 * 処理名: 新規プロジェクト作成
 */
async function create() {
  try {
    await store.createProject(newName.value.trim())
    newName.value = ''
    showNew.value = false
  } catch (e: any) {
    alert(e.message || '作成に失敗しました')
  }
}

/**
 * 処理名: 作成のキャンセル
 */
function cancel() {
  newName.value = ''
  showNew.value = false
}

/**
 * 処理名: プロジェクト選択
 * @param name 選択するプロジェクト名
 */
function select(name: string) {
  store.selectProject(name)
}

/**
 * 処理名: 選択解除
 */
function clear() {
  store.clearSelection()
}
</script>

<style scoped></style>

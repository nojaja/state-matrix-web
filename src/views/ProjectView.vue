<template>
  <div>
    <h2 class="text-xl font-semibold mb-4">プロジェクト管理</h2>

    <div class="mb-4">
      <button class="bg-blue-600 text-white px-3 py-1 rounded" @click="showNew = !showNew">新規作成</button>
    </div>

    <ModalDialog v-model="showNew" title="プロジェクト作成">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">名称</label>
          <input
            v-model="newName"
            type="text"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            placeholder="プロジェクト名"
            @keydown.enter.prevent="create"
            @keydown.esc.prevent="showNew = false"
          />
        </div>
      </div>
      <template #footer>
        <button @click="showNew = false; newName = ''" class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">キャンセル</button>
        <button @click="create" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">保存</button>
      </template>
    </ModalDialog>

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
import ModalDialog from '../components/common/ModalDialog.vue'

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
function _cancel() {
  newName.value = ''
  showNew.value = false
}
// 参照用（ビルド時の未使用エラー回避）
void _cancel;

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

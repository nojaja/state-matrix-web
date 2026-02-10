<template>
  <ModalDialog v-model="visible" title="リポジトリ設定">
    <div class="space-y-2">
      <label class="block text-sm">Provider</label>
      <input v-model="cfg.provider" placeholder="provider (github|gitlab)" class="w-full border p-2 rounded" />
      <label class="block text-sm">Owner</label>
      <input v-model="cfg.owner" placeholder="owner" class="w-full border p-2 rounded" />
      <label class="block text-sm">Repository</label>
      <input v-model="cfg.repository" placeholder="repository" class="w-full border p-2 rounded" />
      <label class="block text-sm">Branch</label>
      <input v-model="cfg.branch" placeholder="branch" class="w-full border p-2 rounded" />

      <div class="flex items-center gap-2">
        <template v-if="showToken">
          <input type="text" v-model="cfg.token" placeholder="token" class="border p-2 flex-1 rounded" />
          <button @click="toggleShow" class="px-3 py-1 bg-gray-200 rounded">非表示</button>
        </template>
        <template v-else>
          <input type="text" :value="maskedToken" readonly placeholder="(未設定)" class="border p-2 flex-1 bg-gray-100 rounded" />
          <button @click="toggleShow" class="px-3 py-1 bg-gray-200 rounded">編集</button>
        </template>
        <button @click="deleteToken" class="px-3 py-1 bg-red-500 text-white rounded">削除</button>
      </div>

      <div class="text-sm text-gray-600 mt-2">
        <label class="flex items-center gap-2">
          <input type="checkbox" v-model="consent" />
          <span>トークンをブラウザに保存します。セキュリティリスクを理解しました。</span>
        </label>
      </div>

      <div v-if="errors.length" class="text-red-600 text-sm">
        <ul>
          <li v-for="(e, idx) in errors" :key="idx">- {{ e }}</li>
        </ul>
      </div>

    </div>

    <template #footer>
      <button @click="close" class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">キャンセル</button>
      <button :disabled="!canSave" @click="onSave" class="px-4 py-2 bg-green-600 text-white rounded ml-2 disabled:opacity-50">保存</button>
    </template>
  </ModalDialog>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, computed } from 'vue'
import ModalDialog from './ModalDialog.vue'
import { useProjectStore, type RepoConfig } from '../../stores/projectStore'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue'])

const projectStore = useProjectStore()
const cfg = reactive<RepoConfig>({ provider: 'github', owner: '', repository: '', branch: 'main', token: '' })
const showToken = ref(false) // 編集モード
const consent = ref(false)

const visible = computed({
  /**
   *
   */
  get: () => !!props.modelValue,
  /**
   *
   * @param v
   */
  set: (v: boolean) => emit('update:modelValue', v)
})

function close() {
  visible.value = false
}

onMounted(() => {
  const p = projectStore.selectedProject
  if (p && projectStore.repoConfigs[p]) {
    Object.assign(cfg, projectStore.repoConfigs[p])
  }
})

const maskedToken = computed(() => {
  if (!cfg.token) return ''
  const t = cfg.token
  if (t.length <= 6) return '*'.repeat(t.length)
  return '*'.repeat(Math.max(0, t.length - 4)) + t.slice(-4)
})

const errors = ref<string[]>([])

const providerValid = computed(() => cfg.provider === 'github' || cfg.provider === 'gitlab')
const ownerValid = computed(() => !!(cfg.owner && cfg.owner.trim()))
const repoValid = computed(() => !!(cfg.repository && cfg.repository.trim()))

const canSave = computed(() => {
  if (!providerValid.value) return false
  if (!ownerValid.value) return false
  if (!repoValid.value) return false
  if (cfg.token && cfg.token.trim() !== '' && !consent.value) return false
  return true
})

/**
 *
 */
function toggleShow() {
  showToken.value = !showToken.value
}

/**
 *
 */
async function deleteToken() {
  if (!confirm('トークンを削除しますか？')) return
  cfg.token = ''
  const p = projectStore.selectedProject
  if (p && projectStore.repoConfigs[p]) {
    projectStore.repoConfigs[p].token = ''
    await projectStore.saveRepoConfig(p, projectStore.repoConfigs[p])
  }
  alert('トークンを削除しました')
}

/**
 *
 */
async function onSave() {
  const p = projectStore.selectedProject
  if (!p) return alert('プロジェクトを選択してください')
  errors.value = []
  if (!providerValid.value) errors.value.push('provider は github または gitlab である必要があります')
  if (!ownerValid.value) errors.value.push('owner を入力してください')
  if (!repoValid.value) errors.value.push('repository を入力してください')
  if (cfg.token && cfg.token.trim() !== '' && !consent.value) errors.value.push('トークン保存には同意が必要です')
  if (errors.value.length) return

  await projectStore.saveRepoConfig(p, { ...cfg })
  alert('保存しました')
  visible.value = false
}
</script>

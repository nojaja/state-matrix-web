<template>
  <ModalDialog v-model="visible" title="リポジトリ設定">
    <div class="space-y-2">
      <label class="block text-sm">Provider</label>
      <select v-model="cfg.provider" class="w-full border p-2 rounded">
        <option value="github">GitHub</option>
        <option value="gitlab">GitLab</option>
      </select>
      <label class="block text-sm">Repository URL</label>
      <input v-model="cfg.repositoryUrl" placeholder="https://github.com/owner/repo" class="w-full border p-2 rounded" />
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
import { reactive, ref, onMounted, computed, watch } from 'vue'
import ModalDialog from './ModalDialog.vue'
import { useProjectStore } from '../../stores/projectStore'
import { useMetadataStore, type RepoConfig } from '../../stores/metadataStore'
import { virtualFsManager } from '../../lib/virtualFsSingleton'

/**
 * 現在のVFSを安全に取得（未オープン時はnull）
 * @returns VirtualFSインスタンスまたはnull
 */
function tryGetCurrentVfs(): any | null {
  try {
    return virtualFsManager.getCurrentVfs()
  } catch {
    return null
  }
}

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue'])

const projectStore = useProjectStore()
const metadataStore = useMetadataStore()
const cfg = reactive<RepoConfig>({ provider: 'github', repositoryUrl: '', branch: 'main', token: '' })
const showToken = ref(false) // 編集モード
const consent = ref(false)
const originalToken = ref('')

const visible = computed({
  /**
   * ダイアログ表示状態を取得する
   * @returns boolean
   */
  get: () => !!props.modelValue,
  /**
   * ダイアログ表示状態を更新する
   * @param v 表示状態
   * @returns void
   */
  set: (v: boolean) => emit('update:modelValue', v)
})

/**
 * ダイアログを閉じる
 * @returns void
 */
function close() {
  visible.value = false
}

// Load config when component mounts or when modal becomes visible
/**
 * 処理名: 設定読み込み
 * 処理概要: モーダル表示時にリポ設定を読み込む
 */
async function loadConfigIfVisible() {
  const p = projectStore.selectedProject
  if (!p) return
  const loaded = await metadataStore.getRepoConfig(p)
  if (loaded) {
    Object.assign(cfg, loaded)
    originalToken.value = cfg.token || ''
  }
}

onMounted(() => {
  void loadConfigIfVisible()
})

// Also load when modal becomes visible (component stays mounted)
watch(() => visible.value, (v) => {
  if (v) void loadConfigIfVisible()
})

const maskedToken = computed(() => {
  if (!cfg.token) return ''
  const t = cfg.token
  if (t.length <= 6) return '*'.repeat(t.length)
  return '*'.repeat(Math.max(0, t.length - 4)) + t.slice(-4)
})

const errors = ref<string[]>([])

const providerValid = computed(() => cfg.provider === 'github' || cfg.provider === 'gitlab')
const repoUrlValid = computed(() => {
  if (!cfg.repositoryUrl || !cfg.repositoryUrl.trim()) return false
  try {
    const u = new URL(cfg.repositoryUrl)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
})

const canSave = computed(() => {
  if (!providerValid.value) return false
  if (!repoUrlValid.value) return false
  const tokenTrimmed = !!(cfg.token && cfg.token.trim() !== '')
  const tokenChanged = cfg.token !== originalToken.value
  // 同意は新しくトークンを入力した／編集した場合のみ必要
  if (tokenTrimmed && tokenChanged && !consent.value) return false
  return true
})

/**
 * トークン表示切り替え
 * @returns void
 */
function toggleShow() {
  showToken.value = !showToken.value
}

/**
 * トークンを削除する
 * @returns Promise<void>
 */
async function deleteToken(): Promise<void> {
  if (!confirm('トークンを削除しますか？')) return
  cfg.token = ''
  const p = projectStore.selectedProject
  if (p) {
    // update local cfg and persist via metadataStore (which will call VFS)
    cfg.token = ''
    await metadataStore.saveRepoConfig(p, { ...cfg })
    // Ensure adapter is updated on the opened VFS as well (defensive)
    try {
      const vfs: any = tryGetCurrentVfs()
      if (vfs && typeof vfs.setAdapter === 'function') {
        // v0.0.8: setAdapter(type, url, branch?, token?) 方式
        await vfs.setAdapter(cfg.provider, cfg.repositoryUrl, cfg.branch || 'main', cfg.token || undefined)
      }
    } catch (e) {
      console.warn('[RepoSettingsModal] deleteToken setAdapter warning:', e)
    }
  }
  alert('トークンを削除しました')
}

/**
 * 設定を保存する
 * @returns Promise<void>
 */
async function onSave(): Promise<void> {
  const p = projectStore.selectedProject
  if (!p) return alert('プロジェクトを選択してください')
  errors.value = []
  if (!providerValid.value) errors.value.push('provider は github または gitlab である必要があります')
  if (!repoUrlValid.value) errors.value.push('有効なリポジトリ URL を入力してください（例: https://github.com/owner/repo）')
  if (cfg.token && cfg.token.trim() !== '' && !consent.value) errors.value.push('トークン保存には同意が必要です')
  if (errors.value.length) return

  await metadataStore.saveRepoConfig(p, { ...cfg })
  // Defensive: ensure setAdapter runs on current VFS directly if available
  try {
    const vfs: any = tryGetCurrentVfs()
    if (vfs && typeof vfs.setAdapter === 'function') {
      // v0.0.8: setAdapter(type, url, branch?, token?) 方式
      await vfs.setAdapter(cfg.provider, cfg.repositoryUrl, cfg.branch || 'main', cfg.token || undefined)
    }
  } catch (e) {
    console.warn('[RepoSettingsModal] onSave setAdapter warning:', e)
  }
  alert('保存しました')
  visible.value = false
}
</script>

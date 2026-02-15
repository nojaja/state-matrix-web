<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from './stores/projectStore'
import { useMetadataStore } from './stores/metadataStore'
import { useArtifactStore } from './stores/artifactStore'
import { useCategoryStore } from './stores/categoryStore'
import { useProcessStore } from './stores/processStore'
import { useTriggerStore } from './stores/triggerStore'
import { useCausalRelationStore } from './stores/causalRelationStore'
import { virtualFsManager } from './lib/virtualFsSingleton'
import type { VirtualFsInstance } from './types/models'

const projectStore = useProjectStore()
const metadataStore = useMetadataStore()
const artifactStore = useArtifactStore()
const categoryStore = useCategoryStore()
const processStore = useProcessStore()
const triggerStore = useTriggerStore()
const causalRelationStore = useCausalRelationStore()
const router = useRouter()

// shared VirtualFsManager singleton (created in src/lib/virtualFsSingleton.ts)
// const virtualFsManager is imported above

// VirtualFS インスタンスを保持
const virtualFsInstance = ref<VirtualFsInstance | null>(null)

// badge計算キャッシュ（computed が無限ループしないように手動で管理）
const badgeCache = ref({
  project: 0,
  process: 0,
  artifact: 0,
  trigger: 0,
  category: 0,
  lastUpdate: 0
})

/**
 * 処理名: プロジェクト切替フロー
 *
 * 処理概要: VirtualFsManager でプロジェクトを開き、全ストアを初期化する
 *
 * 実装理由: VirtualFS ベースのアーキテクチャにより統一されたファイル管理を実現するため
 * @param projectName - 切り替え先のプロジェクト名
 */
const switchProject = async (projectName: string | null) => {
  if (!projectName) {
    // 未選択時はクリア
    virtualFsInstance.value = null
    artifactStore.artifacts = []
    categoryStore.categories = []
    processStore.processes = []
    triggerStore.triggers = []
    causalRelationStore.triggers = []
    causalRelationStore.relations = []
    virtualFsManager.closeProject()
    updateBadgeCache()
    return
  }

  try {
    const vfs = await virtualFsManager.openProject(projectName)
    virtualFsInstance.value = vfs

    // 全ストアを VirtualFS で初期化
    artifactStore.initFromVirtualFS(vfs)
    categoryStore.initFromVirtualFS(vfs)
    processStore.initFromVirtualFS(vfs)
    triggerStore.initFromVirtualFS(vfs)
    causalRelationStore.initFromVirtualFS(vfs)

    // 並行して全ストアを初期化（fetchAll 呼び出し）
    await Promise.all([
      artifactStore.init(),
      categoryStore.init(),
      processStore.init(),
      triggerStore.init(),
      causalRelationStore.init()
    ])

    // メタデータ初期化
    await metadataStore.loadConflictData(projectName)
    updateBadgeCache()
    
  } catch (error) {
    console.error('プロジェクト切替エラー:', error)
  }
}

// Helper to count conflicts by path prefix
/**
 * 処理名: プレフィクス別競合数カウント
 * @param prefixes - パスプレフィクスの配列
 * @returns 一致する競合の数
 */
function countByPrefixes(prefixes: string[]) {
  const proj = projectStore.selectedProject
  if (!proj) return 0
  const map = metadataStore.conflictData[proj] || {}
  return Object.values(map).filter((c: any) => {
    if (!c || !c.path) return false
    for (const p of prefixes) if (c.path.startsWith(p)) return true
    return false
  }).length
}

// badge計算を手動で更新（computed の無限ループを防ぐ）
/**
 * 処理名: バッジキャッシュ更新
 * 処理概要: 競合データからバッジ表示用の競合数を計算
 */
function updateBadgeCache() {
  const proj = projectStore.selectedProject
  if (!proj) {
    badgeCache.value = { project: 0, process: 0, artifact: 0, trigger: 0, category: 0, lastUpdate: Date.now() }
    return
  }
  
  const map = metadataStore.conflictData[proj] || {}
  badgeCache.value = {
    project: Object.keys(map).length,
    process: countByPrefixes(['ProcessTypes/', 'ProcessTypes']),
    artifact: countByPrefixes(['ArtifactTypes/', 'ArtifactTypes']),
    trigger: countByPrefixes(['ActionTriggerTypes/', 'ActionTriggerTypes']),
    category: countByPrefixes(['CategoryMaster/', 'CategoryMaster']),
    lastUpdate: Date.now()
  }
}

// computed を使わず、キャッシュ値を直接参照（無限ループ防止）
const projectBadge = computed(() => badgeCache.value.project)
const processBadge = computed(() => badgeCache.value.process)
const artifactBadge = computed(() => badgeCache.value.artifact)
const triggerBadge = computed(() => badgeCache.value.trigger)
const categoryBadge = computed(() => badgeCache.value.category)
const roleBadge = computed(() => 0)

// プロジェクト選択が変わったら切替フロー実行（watch停止関数を保持）
const stopProjectWatch = watch(() => projectStore.selectedProject, (projectName) => {
  // 非同期初期化をバックグラウンドで開始（初期描画を妨げない）
  void switchProject(projectName)
})

onMounted(() => {
  if (projectStore.selectedProject) {
    // バックグラウンドで初期化を開始し、初期描画をブロックしない
    void switchProject(projectStore.selectedProject)
  }
})

// コンポーネント破棄時にwatchをクリーンアップ（メモリリーク防止）
onUnmounted(() => {
  stopProjectWatch()
  virtualFsManager.closeProject()
})

/**
 * 処理名: バッジクリック時の競合詳細表示
 * @param kind - 窶合種別（project, process, artifact, trigger, category）
 */
function openBadge(kind: string) {
  const proj = projectStore.selectedProject;
  if (!proj) return;
  // find first conflict id matching kind's prefixes
  const conflicts = metadataStore.conflictData[proj] || {};
  const prefixesMap: Record<string, string[]> = {
    project: ['ProjectData/'],
    process: ['ProcessTypes/'],
    artifact: ['ArtifactTypes/'],
    trigger: ['ActionTriggerTypes/'],
    category: ['CategoryMaster/'],
    role: ['RoleTypes/']
  };
  const prefixes = prefixesMap[kind] || [];
  const firstKey = Object.keys(conflicts).find(k => prefixes.some(p => k.startsWith(p)));
  // navigate to the view and include query param to open compare modal
  const routeForKind: Record<string, string> = {
    project: '/project',
    process: '/process',
    artifact: '/artifact',
    trigger: '/trigger',
    category: '/category',
    role: '/role'
  };
  const to = routeForKind[kind] || '/project';
  router.push({ path: to, query: firstKey ? { conflict: firstKey } : {} }).catch(() => {});
}
</script>
<template>
  <div class="min-h-screen bg-gray-100 p-4 font-sans text-gray-900">
    <div class="max-w-7xl mx-auto bg-white shadow rounded-lg overflow-hidden flex flex-col h-[calc(100vh-2rem)]">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200 flex-none">
        <h1 class="text-2xl font-bold text-gray-900">データ管理システム</h1>
        <p class="mt-1 text-sm text-gray-500">プロセス、作成物、およびそれらのマッピングを管理します。</p>
      </div>
      
      <!-- Tabs -->
      <div class="border-b border-gray-200 bg-gray-50 flex-none">
         <nav class="-mb-px flex" aria-label="Tabs">
           <router-link to="/project" active-class="border-blue-500 text-blue-600 bg-white" class="flex-1 py-4 px-1 text-center border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
             プロジェクト
                       <span tabindex="0" role="button" @click.prevent="openBadge('project')" @keydown.enter.prevent="openBadge('project')" v-if="projectBadge > 0" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white" :aria-label="`競合 ${projectBadge} 件`">{{ projectBadge }}</span>
           </router-link>
           <template v-if="projectStore.selectedProject">
            <router-link to="/process" active-class="border-blue-500 text-blue-600 bg-white" class="flex-1 py-4 px-1 text-center border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
              プロセス管理
              <span tabindex="0" role="button" @click.prevent="openBadge('process')" @keydown.enter.prevent="openBadge('process')" v-if="processBadge > 0" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white" :aria-label="`プロセスの競合 ${processBadge} 件`">{{ processBadge }}</span>
            </router-link>
            <router-link to="/artifact" active-class="border-blue-500 text-blue-600 bg-white" class="flex-1 py-4 px-1 text-center border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
              作成物管理
              <span tabindex="0" role="button" @click.prevent="openBadge('artifact')" @keydown.enter.prevent="openBadge('artifact')" v-if="artifactBadge > 0" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white" :aria-label="`作成物の競合 ${artifactBadge} 件`">{{ artifactBadge }}</span>
            </router-link>
            <router-link to="/trigger" active-class="border-blue-500 text-blue-600 bg-white" class="flex-1 py-4 px-1 text-center border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
              トリガー管理
              <span tabindex="0" role="button" @click.prevent="openBadge('trigger')" @keydown.enter.prevent="openBadge('trigger')" v-if="triggerBadge > 0" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white" :aria-label="`トリガーの競合 ${triggerBadge} 件`">{{ triggerBadge }}</span>
            </router-link>
            <router-link to="/category" active-class="border-blue-500 text-blue-600 bg-white" class="flex-1 py-4 px-1 text-center border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
              カテゴリ管理
              <span tabindex="0" role="button" @click.prevent="openBadge('category')" @keydown.enter.prevent="openBadge('category')" v-if="categoryBadge > 0" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white" :aria-label="`カテゴリの競合 ${categoryBadge} 件`">{{ categoryBadge }}</span>
            </router-link>
            <router-link to="/role" active-class="border-blue-500 text-blue-600 bg-white" class="flex-1 py-4 px-1 text-center border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
              ロール管理
              <span tabindex="0" role="button" @click.prevent="openBadge('role')" @keydown.enter.prevent="openBadge('role')" v-if="roleBadge > 0" class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white" :aria-label="`ロールの競合 ${roleBadge} 件`">{{ roleBadge }}</span>
            </router-link>
           </template>
         </nav>
      </div>

      <!-- Content -->
      <div class="p-6 flex-auto overflow-auto relative">
        <router-view></router-view>
      </div>
    </div>
  </div>
</template>

<style>
/* Global styles */
</style>

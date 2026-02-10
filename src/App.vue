<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from './stores/projectStore'

const projectStore = useProjectStore()
const router = useRouter()

// Ensure conflict data loaded when project selection changes
watch(() => projectStore.selectedProject, async (p) => {
  if (p) await projectStore.loadConflictData(p)
})

onMounted(async () => {
  if (projectStore.selectedProject) await projectStore.loadConflictData(projectStore.selectedProject)
})

// Helper to count conflicts by path prefix
function countByPrefixes(prefixes: string[]) {
  const proj = projectStore.selectedProject
  if (!proj) return 0
  const map = projectStore.conflictData[proj] || {}
  return Object.values(map).filter((c: any) => {
    if (!c || !c.path) return false
    for (const p of prefixes) if (c.path.startsWith(p)) return true
    return false
  }).length
}

const projectBadge = computed(() => {
  const proj = projectStore.selectedProject
  if (!proj) return 0
  const map = projectStore.conflictData[proj] || {}
  return Object.keys(map).length
})

const processBadge = computed(() => countByPrefixes(['ProcessTypes/', 'ProcessTypes']))
const artifactBadge = computed(() => countByPrefixes(['ArtifactTypes/', 'ArtifactTypes']))
const triggerBadge = computed(() => countByPrefixes(['ActionTriggerTypes/', 'ActionTriggerTypes']))
const categoryBadge = computed(() => countByPrefixes(['CategoryMaster/', 'CategoryMaster']))
const roleBadge = computed(() => 0)

function openBadge(kind: string) {
  const proj = projectStore.selectedProject;
  if (!proj) return;
  // find first conflict id matching kind's prefixes
  const conflicts = projectStore.conflictData[proj] || {};
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

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
           <router-link to="/process" active-class="border-blue-500 text-blue-600 bg-white" class="flex-1 py-4 px-1 text-center border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
             プロセス管理
           </router-link>
           <router-link to="/artifact" active-class="border-blue-500 text-blue-600 bg-white" class="flex-1 py-4 px-1 text-center border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
             作成物管理
           </router-link>
           <router-link to="/trigger" active-class="border-blue-500 text-blue-600 bg-white" class="flex-1 py-4 px-1 text-center border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
             トリガー管理
           </router-link>
           <router-link to="/category" active-class="border-blue-500 text-blue-600 bg-white" class="flex-1 py-4 px-1 text-center border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
             カテゴリ管理
           </router-link>
           <router-link to="/role" active-class="border-blue-500 text-blue-600 bg-white" class="flex-1 py-4 px-1 text-center border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
             ロール管理
           </router-link>
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

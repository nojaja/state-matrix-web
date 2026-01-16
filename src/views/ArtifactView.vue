<template>
  <div class="space-y-6">
    <!-- Form Section -->
    <div class="bg-white p-6 rounded shadow">
      <h2 class="text-lg font-bold mb-4">作成物管理</h2>
      
      <CategorySelector :path="selectedCategoryPath" @open="openCategorySelector" />

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700">名称</label>
        <input v-model="form.Name" type="text" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="作成物名称" />
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700">内容</label>
        <textarea v-model="form.Content" rows="2" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="作成物の内容"></textarea>
      </div>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700">備考</label>
        <textarea v-model="form.Note" rows="2" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="備考"></textarea>
      </div>

      <button 
        @click="onSubmit"
        class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold disabled:opacity-50"
        :disabled="!isValid"
      >
        {{ isEditing ? '作成物を更新' : '作成物を追加' }}
      </button>
       <button 
        v-if="isEditing" 
        @click="resetForm"
        class="w-full mt-2 bg-gray-300 text-gray-700 py-1 rounded hover:bg-gray-400"
      >
        キャンセル
      </button>
    </div>

    <!-- List Section -->
    <div class="bg-white p-6 rounded shadow">
      <h3 class="text-lg font-bold mb-4">登録済作成物一覧</h3>
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">カテゴリ</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
             <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">備考</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="item in artifacts" :key="item.ID">
            <td class="px-6 py-4 whitespace-nowrap">{{ item.Name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                 {{ getCategoryName(item.CategoryID) }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{{ item.Content }}</td>
            <td class="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{{ item.Note }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button @click="onEdit(item)" class="text-indigo-600 hover:text-indigo-900 mr-2 bg-indigo-100 px-3 py-1 rounded-full">編集</button>
              <button @click="onDelete(item)" class="text-red-600 hover:text-red-900 bg-red-100 px-3 py-1 rounded-full">削除</button>
            </td>
          </tr>
          <tr v-if="artifacts.length === 0">
              <td colspan="5" class="px-6 py-4 text-center text-gray-400">データがありません</td>
          </tr>
        </tbody>
      </table>
    </div>

    <CategorySelectorModal v-model="showCategorySelector" @confirm="onCategorySelected" />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useArtifactStore } from '../stores/artifactStore';
import { useCategoryStore, type CategoryNode } from '../stores/categoryStore';
import type { ArtifactType } from '../types/models';
import CategorySelectorModal from '../components/common/CategorySelectorModal.vue';
import CategorySelector from '../components/common/CategorySelector.vue';

const artifactStore = useArtifactStore();
const categoryStore = useCategoryStore();

const artifacts = computed(() => artifactStore.artifacts);
const categoryMap = computed(() => categoryStore.getMap);

const form = artifactStore.draft as any;

const isEditing = computed(() => !!form.ID);
const selectedCategoryPath = computed(() => {
  return form.CategoryID ? categoryStore.getFullPath(form.CategoryID) : null;
});
const isValid = computed(() => form.Name && form.CategoryID);

const showCategorySelector = ref(false);

onMounted(() => {
    artifactStore.init();
    categoryStore.init();
});

/**
 * 処理名: カテゴリ名取得
 * @param id カテゴリ ID
 * @returns string カテゴリ名（未解決時は ID を返す）
 *
 * 処理概要: ID からカテゴリ名を返す（未解決時は ID を返す）
 */
function getCategoryName(id: string) {
  return categoryMap.value[id]?.Name || id;
}

/**
 * 処理名: カテゴリ選択モーダルを開く
 *
 * 処理概要: カテゴリ選択モーダルを表示する
 */
function openCategorySelector() {
  showCategorySelector.value = true;
}

/**
 * 処理名: カテゴリ選択ハンドラ
 * @param node 選択された `CategoryNode`
 *
 * 処理概要: フォームのカテゴリ ID を設定する
 */
function onCategorySelected(node: CategoryNode) {
  artifactStore.setDraft({ CategoryID: node.ID });
}

/**
 * 処理名: 編集開始
 * @param item 編集対象の `ArtifactType`
 *
 * 処理概要: フォームに対象データを読み込んで編集状態にする
 */
function onEdit(item: ArtifactType) {
  artifactStore.loadDraft(item);
}

/**
 * 処理名: 削除
 * @param item 削除対象の `ArtifactType`
 *
 * 処理概要: 確認ダイアログ後に作成物を削除し、フォームをクリアする
 */
async function onDelete(item: ArtifactType) {
  if(confirm(`作成物「${item.Name}」を削除しますか？`)) {
    await artifactStore.remove(item.ID);
    if(form.ID === item.ID) resetForm();
  }
}

/**
 * 処理名: フォーム送信
 *
 * 処理概要: 新規作成または更新を判定して永続化し、フォームをリセットする
 */
async function onSubmit() {
  if(!isValid.value) return;

  if (isEditing.value) {
    const target = artifactStore.artifacts.find(i => i.ID === form.ID);
    if(target) {
      await artifactStore.update({
        ...target,
        Name: form.Name,
        Content: form.Content,
        Note: form.Note,
        CategoryID: form.CategoryID
      });
    }
  } else {
    await artifactStore.add({
      Name: form.Name,
      Content: form.Content,
      Note: form.Note,
      CategoryID: form.CategoryID
    });
  }
  resetForm();
}

/**
 * 処理名: フォームリセット
 *
 * 処理概要: フォームを初期状態に戻す
 */
function resetForm() {
  artifactStore.resetDraft();
}
</script>

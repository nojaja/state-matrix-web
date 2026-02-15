import { computed, ref } from 'vue';
import type { CategoryNode } from '../stores/categoryStore';

interface UseCategorySelectorOptions {
  categoryId(): string | null | undefined;
  getFullPath: Function;
  applyCategoryId: Function;
}

/**
 * 処理名: カテゴリ選択状態管理
 *
 * 処理概要: CategorySelector と CategorySelectorModal の連携状態を共通管理する
 * @param options
 * @returns 表示状態と選択反映ハンドラ
 */
export function useCategorySelector(options: UseCategorySelectorOptions) {
  const getFullPath = options.getFullPath as any;
  const applyCategoryId = options.applyCategoryId as any;
  const showCategorySelector = ref(false);
  const selectedCategoryPath = computed(() => {
    const categoryId = options.categoryId();
    return categoryId ? getFullPath(categoryId) : null;
  });

  /**
   * 処理名: カテゴリ選択モーダルを開く
   */
  function openCategorySelector() {
    showCategorySelector.value = true;
  }

  /**
   * 処理名: カテゴリ選択反映
   * @param node 選択されたカテゴリ
   */
  function onCategorySelected(node: CategoryNode) {
    applyCategoryId(node.ID);
  }

  return {
    showCategorySelector,
    selectedCategoryPath,
    openCategorySelector,
    onCategorySelected
  };
}

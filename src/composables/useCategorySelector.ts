import { computed, ref } from 'vue';
import type { CategoryNode } from '../stores/categoryStore';

type UseCategorySelectorOptions = {
  categoryId: () => string | null | undefined;
  getFullPath: (id: string) => string | null;
  applyCategoryId: (categoryId: string) => void;
};

/**
 * 処理名: カテゴリ選択状態管理
 *
 * 処理概要: CategorySelector と CategorySelectorModal の連携状態を共通管理する
 */
export function useCategorySelector(options: UseCategorySelectorOptions) {
  const showCategorySelector = ref(false);
  const selectedCategoryPath = computed(() => {
    const categoryId = options.categoryId();
    return categoryId ? options.getFullPath(categoryId) : null;
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
    options.applyCategoryId(node.ID);
  }

  return {
    showCategorySelector,
    selectedCategoryPath,
    openCategorySelector,
    onCategorySelected
  };
}

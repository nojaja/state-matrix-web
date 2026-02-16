<template>
  <div :class="containerClass">
    <h3 class="text-lg font-bold mb-4">{{ title }}</h3>
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <button
        class="text-sm px-3 py-1 rounded border border-gray-300 text-gray-700 disabled:opacity-50"
        :disabled="!canMoveParent"
        @click="emit('move-to-parent')"
      >親カテゴリに移動</button>

      <template v-if="showCreateButtons">
        <button
          class="text-sm px-3 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50"
          @click="emit('create-category', currentCategoryId)"
        >{{ createCategoryLabel || '新規カテゴリ追加' }}</button>
        <button
          class="text-sm px-3 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50"
          @click="emit('create-entity', currentCategoryId)"
        >{{ createEntityLabel }}</button>
      </template>

      <div class="text-sm text-gray-600 flex flex-wrap items-center gap-1">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
          <span
            class="breadcrumb-item"
            :class="{
              current: index === breadcrumbs.length - 1,
              'root-path': crumb.isRootPath
            }"
            :style="{ cursor: index === breadcrumbs.length - 1 ? 'default' : 'pointer' }"
            @click="onBreadcrumbClick(crumb.categoryId, index === breadcrumbs.length - 1)"
          >
            📁{{ crumb.name }}
          </span>
          <span v-if="index !== breadcrumbs.length - 1" class="breadcrumb-separator mx-1">›</span>
        </template>
      </div>
    </div>

    <table :class="tableClass">
      <thead class="bg-gray-50">
        <tr>
          <th v-for="column in columns" :key="column.key" :class="column.headerClass || defaultHeaderClass">
            {{ column.label }}
          </th>
          <th :class="actionHeaderClass">操作</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr
          v-for="category in childCategories"
          :key="`cat-${category.id}`"
          class="cursor-pointer hover:bg-gray-50"
          @click="emit('enter-category', category.id)"
        >
          <td
            v-for="column in columns"
            :key="`cat-${category.id}-${column.key}`"
            :class="column.cellClass || defaultCellClass"
          >
            <template v-if="column.key === conflictDotColumnKey">
              <span class="inline-flex items-center gap-2 text-gray-700">
                <span class="sr-only">子カテゴリ</span>
                📁{{ category.name }}
              </span>
            </template>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button
              @click.stop="emit('enter-category', category.id)"
              class="text-blue-700 hover:text-blue-900 bg-blue-100 px-3 py-1 rounded-full"
            >開く</button>
            <button
              @click.stop="emit('rename-category', category.id)"
              class="text-indigo-700 hover:text-indigo-900 bg-indigo-100 px-3 py-1 rounded-full ml-2"
            >名称変更</button>
            <button
              @click.stop="emit('delete-category', category.id)"
              class="text-red-700 hover:text-red-900 bg-red-100 px-3 py-1 rounded-full ml-2"
            >削除</button>
          </td>
        </tr>

        <tr 
          v-for="row in visibleRows" 
          :key="resolveRowId(row)"
          class="cursor-pointer hover:bg-gray-50"
          @click="emit('edit', resolveRowId(row))"
        >
          <td v-for="column in columns" :key="`${resolveRowId(row)}-${column.key}`" :class="column.cellClass || defaultCellClass">
            <template v-if="$slots[`cell-${column.key}`]">
              <slot :name="`cell-${column.key}`" :row="row" :rowId="resolveRowId(row)"></slot>
            </template>
            <template v-else-if="$slots.cell">
              <slot name="cell" :row="row" :rowId="resolveRowId(row)" :columnKey="column.key"></slot>
            </template>
            <template v-else>
              {{ resolveCellText(row, column.key) }}
            </template>
            <span
              v-if="showConflictDot(resolveRowId(row)) && column.key === conflictDotColumnKey"
              class="ml-2 text-red-600"
            >●</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button
              @click="emit('edit', resolveRowId(row))"
              class="text-indigo-600 hover:text-indigo-900 mr-2 bg-indigo-100 px-3 py-1 rounded-full"
            >編集</button>
            <button
              v-if="showResolveButton(resolveRowId(row))"
              @click="emit('resolve-conflict', resolveRowId(row))"
              class="text-yellow-700 mr-2 bg-yellow-100 px-3 py-1 rounded-full"
            >競合解消</button>
            <button
              @click="emit('delete', resolveRowId(row))"
              class="text-red-600 hover:text-red-900 bg-red-100 px-3 py-1 rounded-full"
            >削除</button>
          </td>
        </tr>
        <tr v-if="hasNoListData">
          <td :colspan="columns.length + 1" class="px-6 py-4 text-center text-gray-400">{{ emptyMessage }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type EntityListColumn = {
  key: string;
  label: string;
  headerClass?: string;
  cellClass?: string;
};

type ChildCategory = {
  id: string;
  name: string;
  parentId: string | null;
};

type BreadcrumbItem = {
  name: string;
  path: string;
  categoryId: string | null;
  isRootPath: boolean;
};

type EntityListRow = {
  ID?: string;
  id?: string;
  CategoryID?: string;
  categoryId?: string;
  [key: string]: unknown;
};

const props = withDefaults(defineProps<{
  title: string;
  columns: EntityListColumn[];
  rows: EntityListRow[];
  emptyMessage?: string;
  containerClass?: string;
  tableClass?: string;
  conflictDotColumnKey?: string;
  showConflictDot?: unknown;
  showResolveButton?: unknown;
  currentCategoryId?: string | null;
  childCategories?: ChildCategory[];
  breadcrumbs?: BreadcrumbItem[];
  canMoveParent?: boolean;
  createCategoryLabel?: string;
  createEntityLabel?: string;
  showCreateButtons?: boolean;
}>(), {
  emptyMessage: 'データがありません',
  containerClass: 'bg-white p-6 rounded shadow',
  tableClass: 'min-w-full divide-y divide-gray-200',
  conflictDotColumnKey: 'name',
  /**
   * デフォルト: 競合ドットは常に非表示
   * @returns {boolean}
   */
  showConflictDot: () => false,
  /**
   * デフォルト: 競合解消ボタンは常に非表示
   * @returns {boolean}
   */
  showResolveButton: () => false,
  currentCategoryId: null,
  /**
   * デフォルト: 子カテゴリは空配列
   * @returns {Array}
   */
  childCategories: () => [],
  /**
   * デフォルト: パンくずは空配列
   * @returns {Array}
   */
  breadcrumbs: () => [],
  canMoveParent: false,
  createCategoryLabel: '新規カテゴリ追加',
  createEntityLabel: '新規追加',
  showCreateButtons: true
});

const emit = defineEmits<{
  edit: [string];
  'resolve-conflict': [string];
  delete: [string];
  'enter-category': [string];
  'move-to-parent': [];
  'navigate-breadcrumb': [string | null];
  'create-category': [string | null];
  'create-entity': [string | null];
  'rename-category': [string];
  'delete-category': [string];
}>();

const defaultHeaderClass = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
const actionHeaderClass = 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider';
const defaultCellClass = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';

const visibleRows = computed(() => {
  return props.rows.filter(row => resolveRowCategoryId(row) === props.currentCategoryId);
});

const hasNoListData = computed(() => {
  return props.childCategories.length === 0 && visibleRows.value.length === 0;
});

/**
 * 処理名: 行ID解決
 * @param row 行データ
 * @returns 行ID
 */
function resolveRowId(row: EntityListRow): string {
  return String(row.ID ?? row.id ?? '');
}

/**
 * 処理名: 行カテゴリID解決
 * @param row 行データ
 * @returns カテゴリID
 */
function resolveRowCategoryId(row: EntityListRow): string | null {
  return row.CategoryID ?? row.categoryId ?? null;
}

/**
 * 処理名: セル文字列解決
 * @param row 行データ
 * @param key 列キー
 * @returns 表示文字列
 */
function resolveCellText(row: EntityListRow, key: string): string {
  const value = row[key];
  if (value == null) return '';
  return String(value);
}

/**
 * 処理名: パンくずクリック処理
 * @param categoryId 移動先カテゴリID
 * @param isLast 最終要素かどうか
 */
function onBreadcrumbClick(categoryId: string | null, isLast: boolean): void {
  if (isLast) return;
  emit('navigate-breadcrumb', categoryId);
}

/**
 * 処理名: 競合解消ボタン表示判定
 * @param rowId 行ID
 * @returns 表示可否
 */
function showResolveButton(rowId: string): boolean {
  const fn = props.showResolveButton as any;
  return typeof fn === 'function' ? fn(rowId) : false;
}

/**
 * 処理名: 競合ドット表示判定
 * @param rowId 行ID
 * @returns 表示可否
 */
function showConflictDot(rowId: string): boolean {
  const fn = props.showConflictDot as any;
  return typeof fn === 'function' ? fn(rowId) : false;
}
</script>

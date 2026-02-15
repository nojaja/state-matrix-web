<template>
  <div :class="containerClass">
    <h3 class="text-lg font-bold mb-4">{{ title }}</h3>
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
        <tr v-for="row in rows" :key="resolveRowId(row)">
          <td v-for="column in columns" :key="`${resolveRowId(row)}-${column.key}`" :class="column.cellClass || defaultCellClass">
            <slot :name="`cell-${column.key}`" :row="row" :rowId="resolveRowId(row)">
              {{ resolveCellText(row, column.key) }}
            </slot>
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
        <tr v-if="rows.length === 0">
          <td :colspan="columns.length + 1" class="px-6 py-4 text-center text-gray-400">{{ emptyMessage }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
type EntityListColumn = {
  key: string;
  label: string;
  headerClass?: string;
  cellClass?: string;
};

type EntityListRow = {
  ID?: string;
  id?: string;
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
  showConflictDot?: (rowId: string) => boolean;
  showResolveButton?: (rowId: string) => boolean;
}>(), {
  emptyMessage: 'データがありません',
  containerClass: 'bg-white p-6 rounded shadow',
  tableClass: 'min-w-full divide-y divide-gray-200',
  conflictDotColumnKey: 'name',
  showConflictDot: () => false,
  showResolveButton: () => false
});

const emit = defineEmits<{
  (e: 'edit', rowId: string): void;
  (e: 'resolve-conflict', rowId: string): void;
  (e: 'delete', rowId: string): void;
}>();

const defaultHeaderClass = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
const actionHeaderClass = 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider';
const defaultCellClass = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';

function resolveRowId(row: EntityListRow): string {
  return String(row.ID ?? row.id ?? '');
}

function resolveCellText(row: EntityListRow, key: string): string {
  const value = row[key];
  if (value == null) return '';
  return String(value);
}

function showResolveButton(rowId: string): boolean {
  return props.showResolveButton(rowId);
}

function showConflictDot(rowId: string): boolean {
  return props.showConflictDot(rowId);
}
</script>

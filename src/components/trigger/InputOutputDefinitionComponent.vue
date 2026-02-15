<template>
  <div class="border-t pt-4 mt-4">
    <h3 class="text-md font-semibold mb-2">プロセス・入出力定義</h3>
    <div class="flex flex-col md:flex-row items-stretch gap-2 overflow-x-auto p-2 bg-gray-50 rounded">
      <div class="flex-1 bg-white border rounded p-2 min-w-[200px] flex flex-col">
        <div class="font-bold text-center bg-gray-200 py-1 mb-2 rounded">インプット作成物</div>
        <div class="flex-1 space-y-2">
          <div v-for="(art, idx) in inputArtifacts" :key="`input-${art.id}-${idx}`" class="flex justify-between items-center border p-1 rounded">
            <span class="truncate text-sm" :title="art.name">{{ art.name }}</span>
            <button
              :disabled="disabled"
              @click="onRemoveArtifact(idx, 'input')"
              class="text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <button
          :disabled="disabled"
          @click="onRequestOpenArtifactSelector('input')"
          class="mt-2 w-full py-1 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:border-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          + 追加
        </button>
      </div>

      <div class="flex items-center justify-center">
        <svg class="h-8 w-8 text-gray-400 transform rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </div>

      <div class="flex-1 bg-blue-50 border border-blue-200 rounded p-2 min-w-[200px] flex flex-col items-center justify-center">
        <div class="font-bold text-center mb-2">プロセス</div>
        <div v-if="selectedProcessId" class="bg-white border p-3 rounded shadow-sm w-full text-center">
          <div class="font-bold text-blue-800">{{ selectedProcessName || '名称未設定' }}</div>
          <div class="text-xs text-gray-500 truncate">{{ selectedProcessDescription || '' }}</div>
        </div>
        <div v-else class="text-gray-400 text-sm">未設定</div>
        <button
          v-if="showProcessSettingButton"
          :disabled="disabled"
          @click="onRequestOpenProcessSelector"
          class="mt-2 text-sm text-blue-600 underline disabled:opacity-50"
        >
          {{ selectedProcessId ? '変更' : '設定' }}
        </button>
      </div>

      <div class="flex items-center justify-center">
        <svg class="h-8 w-8 text-gray-400 transform rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </div>

      <div class="flex-1 bg-white border rounded p-2 min-w-[200px] flex flex-col">
        <div class="font-bold text-center bg-gray-200 py-1 mb-2 rounded">アウトプット作成物</div>
        <div class="flex-1 space-y-2">
          <div v-for="(art, idx) in outputArtifacts" :key="`output-${art.id}-${idx}`" class="flex justify-between items-center border p-1 rounded">
            <div class="flex items-center space-x-3">
              <span class="truncate text-sm" :title="art.name">{{ art.name }}</span>
              <div class="text-sm text-gray-600 flex items-center space-x-3">
                <label class="flex items-center space-x-1">
                  <input
                    type="radio"
                    :name="`out-crud-` + idx"
                    :checked="(art.crud ?? 'Create') === 'Create'"
                    :disabled="disabled"
                    class="w-4 h-4"
                    @change="onChangeOutputCrud(idx, 'Create')"
                  />
                  <span class="text-xs">作成</span>
                </label>
                <label class="flex items-center space-x-1">
                  <input
                    type="radio"
                    :name="`out-crud-` + idx"
                    :checked="art.crud === 'Update'"
                    :disabled="disabled"
                    class="w-4 h-4"
                    @change="onChangeOutputCrud(idx, 'Update')"
                  />
                  <span class="text-xs">更新</span>
                </label>
              </div>
            </div>
            <button
              :disabled="disabled"
              @click="onRemoveArtifact(idx, 'output')"
              class="text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <button
          :disabled="disabled"
          @click="onRequestOpenArtifactSelector('output')"
          class="mt-2 w-full py-1 border-2 border-dashed border-gray-300 text-gray-500 rounded hover:border-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          + 追加
        </button>
      </div>
    </div>

    <SimpleSelectorModal
      v-model="showProcessSelector"
      title="プロセス選択"
      :items="processItems"
      @confirm="onProcessSelected"
    />
    <SimpleSelectorModal
      v-model="showArtifactSelector"
      title="作成物選択"
      :items="artifactItems"
      @confirm="onArtifactSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import SimpleSelectorModal from '../common/SimpleSelectorModal.vue';
import { useCausalRelationStore } from '../../stores/causalRelationStore';

type SelectorItem = {
  id: string;
  name: string;
  description?: string;
};

type InputArtifactDraft = {
  id: string;
  name: string;
};

type OutputArtifactDraft = {
  id: string;
  name: string;
  crud?: 'Create' | 'Update';
};

const props = withDefaults(defineProps<{
  selectedProcessId: string;
  relationProcessId?: string;
  selectedProcessName?: string;
  selectedProcessDescription?: string;
  inputArtifacts: InputArtifactDraft[];
  outputArtifacts: OutputArtifactDraft[];
  processItems?: SelectorItem[];
  artifactItems?: SelectorItem[];
  showProcessSettingButton?: boolean;
  disabled?: boolean;
}>(), {
  relationProcessId: '',
  selectedProcessName: '',
  selectedProcessDescription: '',
  /**
   * 処理名: プロセス一覧既定値
   * @returns 空の配列
   */
  processItems: () => [],
  /**
   * 処理名: 作成物一覧既定値
   * @returns 空の配列
   */
  artifactItems: () => [],
  showProcessSettingButton: true,
  disabled: false
});

const emit = defineEmits<{
  'request-open-process-selector': [];
  'request-open-artifact-selector': ['input' | 'output'];
  'update:selectedProcessId': [string];
  'update:inputArtifacts': [InputArtifactDraft[]];
  'update:outputArtifacts': [OutputArtifactDraft[]];
  'remove-artifact': [{ index: number; mode: 'input' | 'output' }];
}>();

const showProcessSelector = ref(false);
const showArtifactSelector = ref(false);
const artifactSelectorMode = ref<'input' | 'output'>('input');
const causalRelationStore = useCausalRelationStore();

/**
 *
 */
function onRequestOpenProcessSelector() {
  showProcessSelector.value = true;
  emit('request-open-process-selector');
}

/**
 *
 * @param mode
 */
function onRequestOpenArtifactSelector(mode: 'input' | 'output') {
  artifactSelectorMode.value = mode;
  showArtifactSelector.value = true;
  emit('request-open-artifact-selector', mode);
}

/**
 *
 * @param index
 * @param mode
 */
function onRemoveArtifact(index: number, mode: 'input' | 'output') {
  emit('remove-artifact', { index, mode });
}

/**
 *
 * @param index
 * @param crud
 */
function onChangeOutputCrud(index: number, crud: 'Create' | 'Update') {
  const next = props.outputArtifacts.map((item, idx) => {
    if (idx !== index) {
      return item;
    }
    return {
      ...item,
      crud
    };
  });
  emit('update:outputArtifacts', next);
}

/**
 *
 * @param item
 */
function onProcessSelected(item: SelectorItem) {
  emit('update:selectedProcessId', item.id);
}

/**
 *
 * @param item
 */
function onArtifactSelected(item: SelectorItem) {
  if (artifactSelectorMode.value === 'input') {
    if (props.inputArtifacts.some(a => a.id === item.id)) {
      return;
    }
    emit('update:inputArtifacts', [...props.inputArtifacts, { id: item.id, name: item.name }]);
    return;
  }

  if (props.outputArtifacts.some(a => a.id === item.id)) {
    return;
  }
  emit('update:outputArtifacts', [...props.outputArtifacts, { id: item.id, name: item.name, crud: 'Create' }]);
}

/**
 * 処理名: 選択中プロセスの因果関係同期
 * @returns 同期処理の完了
 */
async function syncArtifactsByRelationsForSelectedProcess() {
  const selectedProcessId = props.selectedProcessId;
  const effectiveProcessId = props.relationProcessId || selectedProcessId;
  if (!effectiveProcessId) {
    emit('update:inputArtifacts', []);
    emit('update:outputArtifacts', []);
    return;
  }

  if (!causalRelationStore.initialized) {
    await causalRelationStore.init();
  } else {
    await causalRelationStore.fetchAll();
  }

  const relations = (causalRelationStore.relations ?? []).filter(
    (relation: any) => relation.ProcessTypeID === effectiveProcessId
  );

  /**
    * 処理名: 作成物名解決
   * @param artifactId
    * @returns 対応する作成物名
   */
  const resolveArtifactName = (artifactId: string): string => {
    const found = props.artifactItems.find((item) => item.id === artifactId);
    return found?.name ?? '';
  };

  const mappedInputs: InputArtifactDraft[] = relations
    .filter((relation: any) => relation.CrudType === 'Input')
    .map((relation: any) => ({
      id: relation.ArtifactTypeID,
      name: resolveArtifactName(relation.ArtifactTypeID)
    }));

  const mappedOutputs: OutputArtifactDraft[] = relations
    .filter((relation: any) => relation.CrudType === 'Create' || relation.CrudType === 'Update' || relation.CrudType === 'Output')
    .map((relation: any) => ({
      id: relation.ArtifactTypeID,
      name: resolveArtifactName(relation.ArtifactTypeID),
      crud: relation.CrudType === 'Update' ? 'Update' : 'Create'
    }));

  emit('update:inputArtifacts', mappedInputs);
  emit('update:outputArtifacts', mappedOutputs);
}

watch(
  () => [props.selectedProcessId, props.relationProcessId],
  async () => {
    await syncArtifactsByRelationsForSelectedProcess();
  }
);

/**
 * 処理名: 因果関係保存
 * @param params
 * @param params.processTypeId
 * @returns 保存処理の完了
 */
async function saveCausalRelations(params: { processTypeId: string }) {
  if (!params.processTypeId) {
    return;
  }

  const inputRelations = props.inputArtifacts.map((artifact) => ({
    ProcessTypeID: params.processTypeId,
    ArtifactTypeID: artifact.id,
    CrudType: 'Input'
  }));

  const outputRelations = props.outputArtifacts.map((artifact) => ({
    ProcessTypeID: params.processTypeId,
    ArtifactTypeID: artifact.id,
    CrudType: artifact.crud ?? 'Create'
  }));

  await causalRelationStore.syncCausalRelationsForProcess(
    params.processTypeId,
    [...inputRelations, ...outputRelations]
  );
}

defineExpose({
  saveCausalRelations
});
</script>
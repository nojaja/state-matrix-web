<script setup lang="ts">
import InputOutputDefinitionComponent from './InputOutputDefinitionComponent.vue'

const inputArtifacts = [{ id: 'a1', name: '入力ファイル' }]
const outputArtifacts = [{ id: 'a2', name: '生成レポート', crud: 'Create' as const }]
</script>

<template>
  <Story title="Trigger/InputOutputDefinition">
    <Variant title="Default">
      <InputOutputDefinitionComponent
        selected-process-id="p1"
        selected-process-name="データ同期"
        selected-process-description="外部サービスとデータを同期するプロセス"
        :input-artifacts="inputArtifacts"
        :output-artifacts="outputArtifacts"
      />
    </Variant>
    <Variant title="Empty">
      <InputOutputDefinitionComponent
        selected-process-id=""
        :input-artifacts="[]"
        :output-artifacts="[]"
      />
    </Variant>
  </Story>
</template>

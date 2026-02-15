import { describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const componentPath = resolve(process.cwd(), 'src/components/trigger/InputOutputDefinitionComponent.vue');

/**
 * 処理名: コンポーネントソース読込
 * @returns コンポーネントのソース文字列
 */
async function readSource(): Promise<string> {
  return readFile(componentPath, 'utf-8');
}

describe('InputOutputDefinitionComponent selected-process-id autoload (v0.0.5)', () => {
  it('RED: selectedProcessIdの変更をwatchしている', async () => {
    // Given
    const source = await readSource();

    // Then
    expect(source.includes('watch(')).toBe(true);
    expect(source.includes('selectedProcessId')).toBe(true);
    expect(source.includes('relationProcessId')).toBe(true);
    expect(source.includes('triggerStore.draft?.ID')).toBe(false);
  });

  it('RED: selected-process-id変更時にcausalRelationStore.relationsからProcessTypeIDで抽出する', async () => {
    // Given
    const source = await readSource();

    // Then
    expect(source.includes('getRelationsByTriggerId')).toBe(false);
    expect(source.includes('causalRelationStore')).toBe(true);
    expect(source.includes('relation.ProcessTypeID === effectiveProcessId')).toBe(true);
  });

  it('RED: relation取得結果からinputArtifacts/outputArtifactsをemit更新する', async () => {
    // Given
    const source = await readSource();

    // Then
    expect(source.includes("emit('update:inputArtifacts'")).toBe(true);
    expect(source.includes("emit('update:outputArtifacts'")).toBe(true);
    expect(source.includes('CrudType')).toBe(true);
  });
});

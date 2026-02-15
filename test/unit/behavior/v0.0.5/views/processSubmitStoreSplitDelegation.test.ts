import { describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const processViewPath = resolve(process.cwd(), 'src/views/ProcessView.vue');

/**
 * 処理名: ProcessViewソース読込
 * @returns ProcessViewのソース文字列
 */
async function readSource(): Promise<string> {
  return readFile(processViewPath, 'utf-8');
}

describe('ProcessView onSubmit IO保存委譲 (v0.0.5)', () => {
  it('RED: InputOutputDefinitionComponentにrefを付与している', async () => {
    const source = await readSource();
    expect(source.includes('<InputOutputDefinitionComponent')).toBe(true);
    expect(source.includes('ref="inputOutputDefinitionRef"')).toBe(true);
  });

  it('RED: onSubmitでprocess保存後にInputOutputDefinitionComponent.saveCausalRelationsを呼ぶ', async () => {
    const source = await readSource();

    expect(source.includes('await processStore.update(') || source.includes('await processStore.add(')).toBe(true);
    expect(source.includes('saveCausalRelations')).toBe(true);
    expect(source.includes('inputOutputDefinitionRef.value')).toBe(true);
    expect(source.includes('processTypeId: savedProcessId')).toBe(true);
  });
});

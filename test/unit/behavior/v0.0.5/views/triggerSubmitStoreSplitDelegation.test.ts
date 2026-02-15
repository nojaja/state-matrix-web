import { describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const triggerViewPath = resolve(process.cwd(), 'src/views/TriggerView.vue');

/**
 * 処理名: TriggerViewソース読込
 * @returns TriggerViewのソース文字列
 */
async function readSource(): Promise<string> {
  return readFile(triggerViewPath, 'utf-8');
}

describe('TriggerView onSubmit split delegation (v0.0.5)', () => {
  it('RED: InputOutputDefinitionComponentにrefを付与している', async () => {
    const source = await readSource();
    expect(source.includes('<InputOutputDefinitionComponent')).toBe(true);
    expect(source.includes('ref="inputOutputDefinitionRef"')).toBe(true);
  });

  it('RED: onSubmitでaddTrigger後にInputOutputDefinitionComponent.saveCausalRelationsを呼ぶ', async () => {
    const source = await readSource();

    expect(source.includes('await triggerStore.addTrigger(')).toBe(true);
    expect(source.includes('saveCausalRelations')).toBe(true);
    expect(source.includes('inputOutputDefinitionRef.value')).toBe(true);
  });

  it('RED: addTrigger呼び出しでrelations引数を渡していない', async () => {
    const source = await readSource();

    // 旧実装の addTrigger(payload, relations) で使われる典型表現を禁止
    expect(source.includes('}, relations);')).toBe(false);
  });
});

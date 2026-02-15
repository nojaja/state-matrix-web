import { describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const componentPath = resolve(process.cwd(), 'src/components/trigger/InputOutputDefinitionComponent.vue');

async function readSource(): Promise<string> {
  return readFile(componentPath, 'utf-8');
}

describe('InputOutputDefinitionComponent store delegation (v0.0.5)', () => {
  it('RED: causalRelationStoreを利用する実装になっている', async () => {
    const source = await readSource();

    expect(source.includes('useCausalRelationStore')).toBe(true);
    expect(source.includes('syncCausalRelationsForProcess')).toBe(true);
  });

  it('RED: TriggerViewから呼べるsaveCausalRelationsをdefineExposeしている', async () => {
    const source = await readSource();

    expect(source.includes('saveCausalRelations')).toBe(true);
    expect(source.includes('defineExpose')).toBe(true);
  });
});

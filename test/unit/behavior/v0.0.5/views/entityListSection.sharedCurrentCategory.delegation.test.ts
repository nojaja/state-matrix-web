import { describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const artifactViewPath = resolve(process.cwd(), 'src/views/ArtifactView.vue');
const processViewPath = resolve(process.cwd(), 'src/views/ProcessView.vue');
const triggerViewPath = resolve(process.cwd(), 'src/views/TriggerView.vue');

/**
 * 処理名: Viewソース読込
 * @param path ファイルパス
 * @returns ソース文字列
 */
async function readSource(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}

/**
 * 処理名: 共有カレントカテゴリ委譲契約を検証
 * @param source Vue SFCソース
 */
function verifySharedCurrentCategoryDelegation(source: string): void {
  expect(source.includes('<EntityListSection')).toBe(true);

  expect(source.includes('useEntityListNavigationStore')).toBe(true);
  expect(source.includes("'../stores/entityListNavigationStore'") || source.includes('"../stores/entityListNavigationStore"')).toBe(true);

  expect(source.includes('const currentListCategoryId = ref<string | null>(null);')).toBe(false);

  expect(source.includes('setCurrentCategory')).toBe(true);
  expect(source.includes('moveToParent')).toBe(true);
}

describe('EntityListSection shared current category delegation (v0.0.6 spec, RED)', () => {
  it('RED: ArtifactViewは共有カレントカテゴリを参照してカテゴリ遷移を委譲する', async () => {
    const source = await readSource(artifactViewPath);

    verifySharedCurrentCategoryDelegation(source);
  });

  it('RED: ProcessViewは共有カレントカテゴリを参照してカテゴリ遷移を委譲する', async () => {
    const source = await readSource(processViewPath);

    verifySharedCurrentCategoryDelegation(source);
  });

  it('RED: TriggerViewは共有カレントカテゴリを参照してカテゴリ遷移を委譲する', async () => {
    const source = await readSource(triggerViewPath);

    verifySharedCurrentCategoryDelegation(source);
  });
});

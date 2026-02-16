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
 * 処理名: EntityListSectionへの作成系・カテゴリ操作委譲契約を検証
 * @param source Vue SFCソース
 */
function verifyCrudAndCreateDelegation(source: string): void {
  expect(source.includes('<EntityListSection')).toBe(true);

  expect(source.includes(':create-entity-label=')).toBe(true);

  expect(source.includes('@create-category=')).toBe(true);
  expect(source.includes('@create-entity=')).toBe(true);
  expect(source.includes('@rename-category=')).toBe(true);
  expect(source.includes('@delete-category=')).toBe(true);
}

describe('EntityListSection category CRUD & create actions delegation (v0.0.6 spec, RED)', () => {
  it('RED: ArtifactViewは作成系・カテゴリ操作をEntityListSectionへ委譲する', async () => {
    const source = await readSource(artifactViewPath);

    verifyCrudAndCreateDelegation(source);
    expect(source.includes('新規作成物追加')).toBe(true);
  });

  it('RED: ProcessViewは作成系・カテゴリ操作をEntityListSectionへ委譲する', async () => {
    const source = await readSource(processViewPath);

    verifyCrudAndCreateDelegation(source);
    expect(source.includes('新規プロセス追加')).toBe(true);
  });

  it('RED: TriggerViewは作成系・カテゴリ操作をEntityListSectionへ委譲する', async () => {
    const source = await readSource(triggerViewPath);

    verifyCrudAndCreateDelegation(source);
    expect(source.includes('新規トリガー追加')).toBe(true);
  });
});

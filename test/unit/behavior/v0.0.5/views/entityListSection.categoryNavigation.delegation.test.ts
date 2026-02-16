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
 * 処理名: EntityListSectionへのカテゴリナビ委譲契約を検証
 * @param source Vue SFCソース
 */
function verifyCategoryNavigationDelegation(source: string): void {
  expect(source.includes('<EntityListSection')).toBe(true);

  expect(source.includes(':current-category-id=')).toBe(true);
  expect(source.includes(':child-categories=')).toBe(true);
  expect(source.includes(':breadcrumbs=')).toBe(true);
  expect(source.includes(':can-move-parent=')).toBe(true);

  expect(source.includes('@enter-category=')).toBe(true);
  expect(source.includes('@move-to-parent=')).toBe(true);
  expect(source.includes('@navigate-breadcrumb=')).toBe(true);
}

describe('EntityListSection category navigation delegation (v0.0.6 spec, RED)', () => {
  it('RED: ArtifactViewはカテゴリナビProps/EventsをEntityListSectionへ委譲する', async () => {
    const source = await readSource(artifactViewPath);

    verifyCategoryNavigationDelegation(source);
  });

  it('RED: ProcessViewはカテゴリナビProps/EventsをEntityListSectionへ委譲する', async () => {
    const source = await readSource(processViewPath);

    verifyCategoryNavigationDelegation(source);
  });

  it('RED: TriggerViewはカテゴリナビProps/EventsをEntityListSectionへ委譲する', async () => {
    const source = await readSource(triggerViewPath);

    verifyCategoryNavigationDelegation(source);
  });
});

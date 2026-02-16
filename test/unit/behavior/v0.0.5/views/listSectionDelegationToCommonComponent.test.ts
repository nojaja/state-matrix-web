import { describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const artifactViewPath = resolve(process.cwd(), 'src/views/ArtifactView.vue');
const processViewPath = resolve(process.cwd(), 'src/views/ProcessView.vue');
const triggerViewPath = resolve(process.cwd(), 'src/views/TriggerView.vue');

/**
 * 処理名: ソース読込
 * @param path ファイルパス
 * @returns ソース文字列
 */
async function readSource(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}

describe('List Section commonization delegation (v0.0.5)', () => {
  it('RED: ArtifactViewはEntityListSectionをimportして利用する', async () => {
    const source = await readSource(artifactViewPath);

    expect(source.includes("import EntityListSection from '../components/common/EntityListSection.vue'"))
      .toBe(true);
    expect(source.includes('<EntityListSection')).toBe(true);
  });

  it('RED: ProcessViewはEntityListSectionをimportして利用する', async () => {
    const source = await readSource(processViewPath);

    expect(source.includes("import EntityListSection from '../components/common/EntityListSection.vue'"))
      .toBe(true);
    expect(source.includes('<EntityListSection')).toBe(true);
  });

  it('RED: TriggerViewはEntityListSectionをimportして利用する', async () => {
    const source = await readSource(triggerViewPath);

    expect(source.includes("import EntityListSection from '../components/common/EntityListSection.vue'"))
      .toBe(true);
    expect(source.includes('<EntityListSection')).toBe(true);
  });

  it('RED: 3Viewは共通操作イベント(edit/resolve-conflict/delete)を委譲する', async () => {
    const artifactSource = await readSource(artifactViewPath);
    const processSource = await readSource(processViewPath);
    const triggerSource = await readSource(triggerViewPath);

    expect(artifactSource.includes('@edit=')).toBe(true);
    expect(artifactSource.includes('@resolve-conflict=')).toBe(true);
    expect(artifactSource.includes('@delete=')).toBe(true);

    expect(processSource.includes('@edit=')).toBe(true);
    expect(processSource.includes('@resolve-conflict=')).toBe(true);
    expect(processSource.includes('@delete=')).toBe(true);

    expect(triggerSource.includes('@edit=')).toBe(true);
    expect(triggerSource.includes('@resolve-conflict=')).toBe(true);
    expect(triggerSource.includes('@delete=')).toBe(true);
  });

  it('RED: 3ViewのList Sectionタイトルは共通コンポーネント引数へ移譲される', async () => {
    const artifactSource = await readSource(artifactViewPath);
    const processSource = await readSource(processViewPath);
    const triggerSource = await readSource(triggerViewPath);

    expect(artifactSource.includes('登録済作成物一覧</h3>')).toBe(false);
    expect(processSource.includes('登録済プロセス一覧</h3>')).toBe(false);
    expect(triggerSource.includes('登録済トリガー一覧</h3>')).toBe(false);
  });
});

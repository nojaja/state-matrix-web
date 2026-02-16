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
 * 処理名: template抽出
 * @param source SFC全文
 * @returns templateブロック
 */
function extractTemplate(source: string): string {
  const startTag = '<template>';
  const endTag = '</template>';
  const startIndex = source.indexOf(startTag);
  const endIndex = source.lastIndexOf(endTag);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error('template ブロックが見つかりません');
  }
  return source.slice(startIndex + startTag.length, endIndex);
}

/**
 * 処理名: 2ペイン共通要件を検証
 * @param template 対象template
 * @param listTitle List Sectionタイトル文字列
 * @param formHeading Form Section見出し文字列
 */
function verifyTwoPaneContract(template: string, listTitle: string, formHeading: string): void {
  // Given: 2ペインレイアウト方針（v0.0.6設計書）
  // When: templateから必要トークンを探索
  const hasTwoPaneGrid =
    template.includes('grid grid-cols-1 lg:grid-cols-12 gap-6') ||
    template.includes('grid grid-cols-1 lg:grid-cols-2 gap-6');

  const hasListPane =
    template.includes('lg:col-span-7') ||
    template.includes('lg:col-span-8') ||
    template.includes('order-1');

  const hasFormPane =
    template.includes('lg:col-span-5') ||
    template.includes('lg:col-span-4') ||
    template.includes('order-2');

  const listIndex = template.indexOf(listTitle);
  const formIndex = template.indexOf(formHeading);

  // Then: 左List/右Formの2ペイン契約を満たす
  expect(hasTwoPaneGrid).toBe(true);
  expect(hasListPane).toBe(true);
  expect(hasFormPane).toBe(true);
  expect(listIndex).toBeGreaterThanOrEqual(0);
  expect(formIndex).toBeGreaterThanOrEqual(0);
  expect(listIndex).toBeLessThan(formIndex);
}

describe('Content two-pane layout contract (v0.0.6 spec, RED)', () => {
  it('RED: ArtifactViewは左List/右Formの2ペイン構成を満たす', async () => {
    const source = await readSource(artifactViewPath);
    const template = extractTemplate(source);

    verifyTwoPaneContract(template, '登録済作成物一覧', '作成物管理');
  });

  it('RED: ProcessViewは左List/右Formの2ペイン構成を満たす', async () => {
    const source = await readSource(processViewPath);
    const template = extractTemplate(source);

    verifyTwoPaneContract(template, '登録済プロセス一覧', 'プロセス管理');
  });

  it('RED: TriggerViewは左List/右Formの2ペイン構成を満たす', async () => {
    const source = await readSource(triggerViewPath);
    const template = extractTemplate(source);

    verifyTwoPaneContract(template, '登録済トリガー一覧', 'トリガー管理');
  });

  it('RED: 3ViewともList SectionはEntityListSectionを利用し続ける', async () => {
    const [artifactSource, processSource, triggerSource] = await Promise.all([
      readSource(artifactViewPath),
      readSource(processViewPath),
      readSource(triggerViewPath)
    ]);

    expect(artifactSource.includes('<EntityListSection')).toBe(true);
    expect(processSource.includes('<EntityListSection')).toBe(true);
    expect(triggerSource.includes('<EntityListSection')).toBe(true);
  });

  it('RED: 3ViewともForm Sectionの送信アクションを維持する', async () => {
    const [artifactSource, processSource, triggerSource] = await Promise.all([
      readSource(artifactViewPath),
      readSource(processViewPath),
      readSource(triggerViewPath)
    ]);

    expect(artifactSource.includes('@click="onSubmit"')).toBe(true);
    expect(processSource.includes('@click="onSubmit"')).toBe(true);
    expect(triggerSource.includes('@click="onSubmit"')).toBe(true);
  });
});

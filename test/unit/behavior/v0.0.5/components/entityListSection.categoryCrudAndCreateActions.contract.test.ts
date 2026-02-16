import { describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const componentPath = resolve(process.cwd(), 'src/components/common/EntityListSection.vue');

/**
 * 処理名: EntityListSectionソース読込
 * @returns EntityListSectionのソース文字列
 */
async function readSource(): Promise<string> {
  return readFile(componentPath, 'utf-8');
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

describe('EntityListSection category CRUD & create actions contract (v0.0.6 spec, RED)', () => {
  it('RED: 作成系ボタンのラベルPropsを公開する', async () => {
    const source = await readSource();

    expect(source.includes('createCategoryLabel')).toBe(true);
    expect(source.includes('createEntityLabel')).toBe(true);
    expect(source.includes('showCreateButtons')).toBe(true);
  });

  it('RED: 作成系イベント(create-category/create-entity)を公開する', async () => {
    const source = await readSource();

    expect(source.includes('create-category')).toBe(true);
    expect(source.includes('create-entity')).toBe(true);
  });

  it('RED: カテゴリ操作イベント(rename-category/delete-category)を公開する', async () => {
    const source = await readSource();

    expect(source.includes('rename-category')).toBe(true);
    expect(source.includes('delete-category')).toBe(true);
  });

  it('RED: move-to-parent横に新規カテゴリ追加・新規エンティティ追加ボタンを配置する', async () => {
    const source = await readSource();
    const template = extractTemplate(source);

    const parentButtonIndex = Math.max(
      template.indexOf('親カテゴリに移動'),
      template.indexOf("emit('move-to-parent')")
    );
    const createCategoryButtonIndex = template.indexOf('新規カテゴリ追加');
    const createEntityButtonIndex = template.indexOf('createEntityLabel');
    const tableIndex = template.indexOf('<table');

    expect(parentButtonIndex).toBeGreaterThanOrEqual(0);
    expect(createCategoryButtonIndex).toBeGreaterThanOrEqual(0);
    expect(createEntityButtonIndex).toBeGreaterThanOrEqual(0);
    expect(tableIndex).toBeGreaterThanOrEqual(0);

    expect(createCategoryButtonIndex).toBeGreaterThan(parentButtonIndex);
    expect(createCategoryButtonIndex).toBeLessThan(tableIndex);
    expect(createEntityButtonIndex).toBeGreaterThan(createCategoryButtonIndex);
    expect(createEntityButtonIndex).toBeLessThan(tableIndex);
  });

  it('RED: 子カテゴリ行の操作に名称変更・削除を追加し、click.stopで遷移誤発火を防ぐ', async () => {
    const source = await readSource();
    const template = extractTemplate(source);

    expect(template.includes('名称変更')).toBe(true);
    expect(template.includes('削除')).toBe(true);
    expect(template.includes('@click.stop')).toBe(true);
  });
});

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

describe('EntityListSection category navigation contract (v0.0.6 spec, RED)', () => {
  it('RED: カテゴリ階層ナビゲーション用Propsを公開する', async () => {
    const source = await readSource();

    expect(source.includes('currentCategoryId')).toBe(true);
    expect(source.includes('childCategories')).toBe(true);
    expect(source.includes('breadcrumbs')).toBe(true);
    expect(source.includes('canMoveParent')).toBe(true);
  });

  it('RED: カテゴリ遷移イベント(enter-category/move-to-parent/navigate-breadcrumb)を公開する', async () => {
    const source = await readSource();

    expect(source.includes('enter-category')).toBe(true);
    expect(source.includes('move-to-parent')).toBe(true);
    expect(source.includes('navigate-breadcrumb')).toBe(true);
  });

  it('RED: titleとtableの間に親カテゴリ移動ボタンを配置する', async () => {
    const source = await readSource();
    const template = extractTemplate(source);

    const titleIndex = template.indexOf('{{ title }}');
    const parentButtonIndex = template.indexOf('親カテゴリに移動');
    const tableIndex = template.indexOf('<table');

    expect(titleIndex).toBeGreaterThanOrEqual(0);
    expect(parentButtonIndex).toBeGreaterThanOrEqual(0);
    expect(tableIndex).toBeGreaterThanOrEqual(0);
    expect(parentButtonIndex).toBeGreaterThan(titleIndex);
    expect(parentButtonIndex).toBeLessThan(tableIndex);
  });

  it('RED: パンくず一覧をv-forで描画し、最後以外にセパレータ(›)を表示する', async () => {
    const source = await readSource();
    const template = extractTemplate(source);

    const hasBreadcrumbLoop =
      template.includes('v-for="(crumb, index) in breadcrumbs"') ||
      template.includes('v-for="crumb in breadcrumbs"');

    const hasCurrentClass = template.includes('current');
    const hasRootPathClass = template.includes('root-path');
    const hasSeparator = template.includes('›');

    expect(hasBreadcrumbLoop).toBe(true);
    expect(hasCurrentClass).toBe(true);
    expect(hasRootPathClass).toBe(true);
    expect(hasSeparator).toBe(true);
  });

  it('RED: 子カテゴリを一覧に表示し、クリックでenter-categoryをemitできる', async () => {
    const source = await readSource();
    const template = extractTemplate(source);

    const hasChildCategoryLoop =
      template.includes('v-for="category in childCategories"') ||
      template.includes('v-for="childCategory in childCategories"');

    const hasFolderHint =
      template.includes('folder_special') ||
      template.includes('フォルダ') ||
      template.includes('子カテゴリ');

    const hasEnterEmit = source.includes("emit('enter-category'");

    expect(hasChildCategoryLoop).toBe(true);
    expect(hasFolderHint).toBe(true);
    expect(hasEnterEmit).toBe(true);
  });
});

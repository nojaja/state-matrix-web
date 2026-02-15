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

describe('EntityListSection contract (v0.0.5)', () => {
  it('RED: 共通Listコンポーネントファイルが存在する', async () => {
    const source = await readSource();
    expect(source.length).toBeGreaterThan(0);
  });

  it('RED: 共通操作イベント(edit/resolve-conflict/delete)を公開する', async () => {
    const source = await readSource();

    expect(source.includes('edit')).toBe(true);
    expect(source.includes('resolve-conflict')).toBe(true);
    expect(source.includes('delete')).toBe(true);
  });

  it('RED: 列セル差し込み用のスロット設計(cell-*)を持つ', async () => {
    const source = await readSource();

    expect(source.includes('cell-')).toBe(true);
  });
});

import { describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const storePath = resolve(process.cwd(), 'src/stores/entityListNavigationStore.ts');

/**
 * 処理名: 共有カテゴリナビゲーションストア読込
 * @returns ストアソース文字列
 */
async function readSource(): Promise<string> {
  return readFile(storePath, 'utf-8');
}

describe('EntityList shared current category store contract (v0.0.6 spec, RED)', () => {
  it('RED: EntityListナビゲーション専用のPiniaストアを提供する', async () => {
    const source = await readSource();

    expect(source.includes('defineStore')).toBe(true);
    expect(source.includes('useEntityListNavigationStore')).toBe(true);
  });

  it('RED: 共有カレントカテゴリ状態 currentCategoryId を公開する', async () => {
    const source = await readSource();

    expect(source.includes('currentCategoryId')).toBe(true);
    expect(source.includes('null')).toBe(true);
  });

  it('RED: setCurrentCategory / moveToParent / resetToRoot の操作を公開する', async () => {
    const source = await readSource();

    expect(source.includes('setCurrentCategory')).toBe(true);
    expect(source.includes('moveToParent')).toBe(true);
    expect(source.includes('resetToRoot')).toBe(true);
  });

  it('RED: 初期表示時にルートカテゴリへ初期化する操作を公開する', async () => {
    const source = await readSource();

    expect(source.includes('ensureInitialRoot')).toBe(true);
    expect(source.includes('initialized')).toBe(true);
  });
});

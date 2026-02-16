import { describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const processViewPath = resolve(process.cwd(), 'src/views/ProcessView.vue');

/**
 * 処理名: ProcessViewソース読込
 * @returns ProcessViewのソース文字列
 */
async function readProcessViewSource(): Promise<string> {
  return readFile(processViewPath, 'utf-8');
}

/**
 * 処理名: template抽出
 * @param source
 * @returns templateブロック
 */
function extractTemplate(source: string): string {
  const startTag = '<template>';
  const endTag = '</template>';
  const startIndex = source.indexOf(startTag);
  const endIndex = source.lastIndexOf(endTag);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error('ProcessView.vue の template ブロックが見つかりません');
  }
  return source.slice(startIndex + startTag.length, endIndex);
}

describe('ProcessView Form Section IO配置 (v0.0.5)', () => {
  it('RED: Form SectionにInputOutputDefinitionComponentが存在する', async () => {
    // Given: ProcessView のテンプレートを読み込む
    const source = await readProcessViewSource();
    const template = extractTemplate(source);

    // When: コンポーネントタグの位置を検索する
    const componentIndex = template.indexOf('<InputOutputDefinitionComponent');

    // Then: 送信ボタン群の上部に置く前提として、まず存在していること
    expect(componentIndex).toBeGreaterThanOrEqual(0);
  });

  it('RED: InputOutputDefinitionComponentは送信ボタン(onSubmit)より前に配置される', async () => {
    // Given: ProcessView のテンプレートを読み込む
    const source = await readProcessViewSource();
    const template = extractTemplate(source);

    // When: 位置関係を取得する
    const componentIndex = template.indexOf('<InputOutputDefinitionComponent');
    const submitButtonIndex = template.indexOf('@click="onSubmit"');

    // Then: 設計どおり、buttonの上部に配置される
    expect(componentIndex).toBeGreaterThanOrEqual(0);
    expect(submitButtonIndex).toBeGreaterThanOrEqual(0);
    expect(componentIndex).toBeLessThan(submitButtonIndex);
  });

  it('RED: ProcessViewでInputOutputDefinitionComponentをimportしている', async () => {
    // Given: ProcessView の script ブロックを含む全文
    const source = await readProcessViewSource();

    // When: import 文の有無を確認
    const hasImport = source.includes(
      "import InputOutputDefinitionComponent from '../components/trigger/InputOutputDefinitionComponent.vue'"
    );

    // Then: テンプレート配置とセットでimportが必要
    expect(hasImport).toBe(true);
  });

  it('RED: ProcessViewではselected-process-idにform.Nameを渡す', async () => {
    const source = await readProcessViewSource();
    expect(source.includes(':selected-process-id="form.Name"')).toBe(true);
  });

  it('RED: ProcessViewでは設定ボタンを非表示にする', async () => {
    const source = await readProcessViewSource();
    expect(source.includes(':show-process-setting-button="false"')).toBe(true);
  });
});

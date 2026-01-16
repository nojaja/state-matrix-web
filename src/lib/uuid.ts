/**
 * 簡易 UUID 生成ユーティリティ
 *
 * ブラウザの `crypto.randomUUID()` を優先し、存在しない環境では
 * ランダムな RFC4122 v4 形式の文字列を返します（テスト/ユーティリティ用途）。
 * @returns 生成された UUID 文字列
 */
export function generateUUID(): string {
  // ブラウザ/Node の globalThis.crypto を優先
  try {
    // @ts-ignore
    const c = (globalThis as any).crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  } catch {
    // ignore
  }

  // フォールバック: RFC4122 v4 に似たランダム生成（テスト用途向け）
  // Note: 完全な衝突耐性は保証しないが、ユニークID目的には十分
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

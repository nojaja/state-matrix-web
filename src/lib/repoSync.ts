import type { ConflictTriple } from '../stores/metadataStore'
import { load as yamlLoad } from 'js-yaml'

type FileTriple = {
  path: string
  base: string | null
  local: string | null
  remote: string | null
}

/**
 * 処理名: JSONパス判定
 * @param path - ファイルパス
 * @returns JSONファイルかどうか
 */
function isJsonPath(path: string) {
  return path.endsWith('.json')
}

/**
 * 処理名: YAMLパス判定
 * @param path - ファイルパス
 * @returns YAMLファイルかどうか
 */
function isYamlPath(path: string) {
  return path.endsWith('.yaml') || path.endsWith('.yml')
}

/**
 * 処理名: 安全JSONパース
 * @param s - JSON文字列
 * @returns パース結果またはnull
 */
function safeParseJson(s: string | null) {
  if (s == null) return null
  try {
    return JSON.parse(s)
  } catch (e) {
    console.warn('[repoSync] JSON parse error:', e)
    return null
  }
}

/**
 * 処理名: 安全YAMLパース
 * @param s - YAML文字列
 * @returns パース結果またはnull
 */
function safeParseYaml(s: string | null) {
  if (s == null) return null
  try {
    return yamlLoad(s as string)
  } catch (e) {
    console.warn('[repoSync] YAML parse error:', e)
    return null
  }
}

/**
 * 処理名: ID抽出
 * @param obj - 対象
 * @returns ID文字列またはnull
 */
function extractId(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null
  if ('id' in obj) return String((obj as any).id)
  return null
}

/**
 * フォーマットを判定
 * @param path - ファイルパス
 * @returns フォーマット種別
 */
function detectFormat(path: string): 'json' | 'yaml' | 'text' {
  if (isJsonPath(path)) return 'json'
  if (isYamlPath(path)) return 'yaml'
  return 'text'
}

/**
 * IDを抽出（JSON/YAMLの場合）
 * @param path - ファイルパス
 * @param format - フォーマット種別
 * @param local - ローカルコンテンツ
 * @param base - ベースコンテンツ
 * @param remote - リモートコンテンツ
 * @returns 抽出されたID
 */
function extractIdFromContent(path: string, format: string, local: string, base: string, remote: string): string | null {
  if (format !== 'json' && format !== 'yaml') return null
  
  const parsed = isJsonPath(path)
    ? safeParseJson(local) ?? safeParseJson(base) ?? safeParseJson(remote)
    : safeParseYaml(local) ?? safeParseYaml(base) ?? safeParseYaml(remote)
  
  return extractId(parsed)
}

/**
 * 処理名: 競合マップ構築
 * @param triples - ファイルトリプルの配列
 * @returns 競合マップ
 */
export function buildConflictsMap(triples: FileTriple[]): Record<string, ConflictTriple> {
  const map: Record<string, ConflictTriple> = {}
  
  for (const t of triples) {
    const format = detectFormat(t.path)
    const base = t.base ?? ''
    const local = t.local ?? ''
    const remote = t.remote ?? ''
    const id = extractIdFromContent(t.path, format, local, base, remote)
    const key = id || t.path
    const ts = new Date().toISOString()
    
    map[key] = {
      id,
      path: t.path,
      format: format as any,
      base,
      local,
      remote,
      timestamp: ts,
      metadata: {}
    }
  }
  
  return map
}

/**
 * 競合をマップへ追加
 * @param conflictsMap - 競合マップ
 * @param triple - ファイルトリプル
 */
function addConflict(conflictsMap: Record<string, ConflictTriple>, triple: FileTriple): void {
  const map = buildConflictsMap([triple])
  Object.assign(conflictsMap, map)
}

/**
 * 構造化フォーマットか判定
 * @param format - フォーマット
 * @returns 構造化フォーマットならtrue
 */
function isStructuredFormat(format: string): format is 'json' | 'yaml' {
  return format === 'json' || format === 'yaml'
}

/**
 * 構造化データの競合判定
 * @param triple - ファイルトリプル
 * @param format - フォーマット
 * @returns 解決できればtrue
 */
function tryResolveStructured(triple: FileTriple, format: 'json' | 'yaml'): boolean {
  const baseObj = format === 'json' ? safeParseJson(triple.base) : safeParseYaml(triple.base)
  const localObj = format === 'json' ? safeParseJson(triple.local) : safeParseYaml(triple.local)
  const remoteObj = format === 'json' ? safeParseJson(triple.remote) : safeParseYaml(triple.remote)

  if (baseObj === null || localObj === null || remoteObj === null) return false
  const { conflict } = mergeValues(baseObj, localObj, remoteObj)
  return !conflict
}

/**
 * テキストデータの競合判定
 * @param triple - ファイルトリプル
 * @returns 解決できればtrue
 */
function tryResolveText(triple: FileTriple): boolean {
  const base = triple.base ?? ''
  const local = triple.local ?? ''
  const remote = triple.remote ?? ''
  if (local === remote) return true
  if (local === base && remote !== base) return true
  if (remote === base && local !== base) return true
  return false
}

// Merge two conflict maps: incoming entries overwrite existing only when timestamp is newer
/**
 * 処理名: 競合マップマージ
 * @param existing - 既存の競合マップ
 * @param incoming - 新規の競合マップ
 * @returns マージされた競合マップ
 */
export function mergeConflictsMaps(existing: Record<string, ConflictTriple>, incoming: Record<string, ConflictTriple>) {
  const out: Record<string, ConflictTriple> = { ...(existing || {}) }
  for (const k of Object.keys(incoming || {})) {
    const inc = incoming[k]
    if (!inc) continue
    const cur = out[k]
    if (!cur) {
      out[k] = inc
      continue
    }
    try {
      const tCur = Date.parse(cur.timestamp || '') || 0
      const tInc = Date.parse(inc.timestamp || '') || 0
      if (tInc >= tCur) out[k] = inc
    } catch (e) {
      console.warn('[repoSync] timestamp parse error, preferring incoming:', e)
      out[k] = inc
    }
  }
  return out
}

/**
 * 処理名: 3-wayマージ
 * @param triples - ファイルトリプルの配列
 * @returns 解決されたファイルと競合のリスト
 */
export function threeway(triples: FileTriple[]): { resolved: string[]; conflicts: Record<string, ConflictTriple> } {
  const resolved: string[] = []
  const conflictsMap: Record<string, ConflictTriple> = {}

  for (const t of triples) {
    const path = t.path
    const format = detectFormat(path)
    const resolvedOk = isStructuredFormat(format)
      ? tryResolveStructured(t, format)
      : tryResolveText(t)

    if (resolvedOk) {
      resolved.push(path)
    } else {
      addConflict(conflictsMap, t)
    }
  }

  return { resolved, conflicts: conflictsMap }
}

export default { buildConflictsMap, threeway }

// Merge helpers
/**
 * 処理名: 値マージ
 * @param base - ベース値
 * @param local - ローカル値
 * @param remote - リモート値
 * @returns マージ結果と競合フラグ
 */
function mergeValues(base: any, local: any, remote: any): { merged: any; conflict: boolean } {
  if (typeof base !== 'object' || base === null) {
    return mergeScalar(base, local, remote)
  }

  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    return mergeArray(base, local, remote)
  }

  return mergeObjects(base, local, remote)
}

/**
 * スカラー値をマージ
 * @param base - ベース値
 * @param local - ローカル値
 * @param remote - リモート値
 * @returns マージ結果
 */
function mergeScalar(base: any, local: any, remote: any): { merged: any; conflict: boolean } {
  const lChanged = isChanged(local, base)
  const rChanged = isChanged(remote, base)
  const mergedValue = decideMergeValue(local, remote, base, lChanged, rChanged)
  if (mergedValue === null && lChanged && rChanged) return { merged: null, conflict: true }
  return { merged: mergedValue !== null ? mergedValue : base, conflict: false }
}

/**
 * 配列値をマージ
 * @param base - ベース配列
 * @param local - ローカル配列
 * @param remote - リモート配列
 * @returns マージ結果
 */
function mergeArray(base: any[], local: any[], remote: any[]): { merged: any; conflict: boolean } {
  const allObjects = [...base, ...local, ...remote].every((v) => v && typeof v === 'object')
  if (!allObjects) return mergeScalar(base, local, remote)
  return mergeArrayById(base, local, remote)
}

/**
 * ID付き配列をマージ
 * @param base - ベース配列
 * @param local - ローカル配列
 * @param remote - リモート配列
 * @returns マージ結果
 */
function mergeArrayById(base: any[], local: any[], remote: any[]): { merged: any; conflict: boolean } {
  const indexById = new Map<string, { b: any; l: any; r: any }>()
  addToIndexById(indexById, base, 'b')
  addToIndexById(indexById, local, 'l')
  addToIndexById(indexById, remote, 'r')

  const mergedArr: any[] = []
  for (const [, trio] of indexById.entries()) {
    const mo = mergeObjects(trio.b, trio.l, trio.r)
    if (mo.conflict) return { merged: null, conflict: true }
    mergedArr.push(mo.merged)
  }
  return { merged: mergedArr, conflict: false }
}

/**
 * IDでインデックス化
 * @param indexById - インデックス
 * @param arr - 配列
 * @param key - キー
 */
function addToIndexById(indexById: Map<string, { b: any; l: any; r: any }>, arr: any[], key: 'b' | 'l' | 'r'): void {
  for (const it of arr) {
    const id = extractId(it)
    if (!id) continue
    const cur = indexById.get(id) || { b: null, l: null, r: null }
    cur[key] = it
    indexById.set(id, cur)
  }
}

/**
 * 値が変更されたか判定
 * @param value - 現在の値
 * @param base - ベース値
 * @returns 変更されていればtrue
 */
function isChanged(value: any, base: any): boolean {
  return JSON.stringify(value) !== JSON.stringify(base)
}

/**
 * マージ結果を決定
 * @param local - ローカル値
 * @param remote - リモート値
 * @param base - ベース値
 * @param lChanged - ローカル変更フラグ
 * @param rChanged - リモート変更フラグ
 * @returns マージ結果
 */
function decideMergeValue(local: any, remote: any, base: any, lChanged: boolean, rChanged: boolean): any {
  if (lChanged && !rChanged) return local
  if (!lChanged && rChanged) return remote
  if (!lChanged && !rChanged) return base
  return null // conflict
}

/**
 * オブジェクトをマージし、競合を検出
 * @param base - ベースオブジェクト
 * @param local - ローカル変更
 * @param remote - リモート変更
 * @returns マージ結果と競合フラグ
 */
function mergeObjects(base: any, local: any, remote: any): { merged: any; conflict: boolean } {
  const keys = new Set<string>([...Object.keys(base || {}), ...Object.keys(local || {}), ...Object.keys(remote || {})])
  const out: any = {}
  
  for (const k of keys) {
    const b = base ? base[k] : undefined
    const l = local ? local[k] : undefined
    const r = remote ? remote[k] : undefined
    const { value, conflict } = mergeObjectKey(b, l, r)
    if (conflict) return { merged: null, conflict: true }
    out[k] = value
  }
  
  return { merged: out, conflict: false }
}

/**
 * オブジェクトのキー単位マージ
 * @param baseValue - ベース値
 * @param localValue - ローカル値
 * @param remoteValue - リモート値
 * @returns マージ結果
 */
function mergeObjectKey(baseValue: any, localValue: any, remoteValue: any): { value: any; conflict: boolean } {
  const lChanged = isChanged(localValue, baseValue)
  const rChanged = isChanged(remoteValue, baseValue)
  const mergedValue = decideMergeValue(localValue, remoteValue, baseValue, lChanged, rChanged)
  if (mergedValue === null && lChanged && rChanged) return { value: null, conflict: true }
  return { value: mergedValue !== null ? mergedValue : baseValue, conflict: false }
}

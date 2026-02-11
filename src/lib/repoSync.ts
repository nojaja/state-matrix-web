import type { ConflictTriple } from '../stores/metadataStore'
import { load as yamlLoad } from 'js-yaml'

type FileTriple = {
  path: string
  base: string | null
  local: string | null
  remote: string | null
}

/**
 *
 * @param path
 */
function isJsonPath(path: string) {
  return path.endsWith('.json')
}

/**
 *
 * @param path
 */
function isYamlPath(path: string) {
  return path.endsWith('.yaml') || path.endsWith('.yml')
}

/**
 *
 * @param s
 */
function safeParseJson(s: string | null) {
  if (s == null) return null
  try {
    return JSON.parse(s)
  } catch (_e) {
    return null
  }
}

/**
 *
 * @param s
 */
function safeParseYaml(s: string | null) {
  if (s == null) return null
  try {
    return yamlLoad(s as string)
  } catch (_e) {
    return null
  }
}

/**
 *
 * @param obj
 */
function extractId(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null
  if ('id' in obj) return String((obj as any).id)
  return null
}

/**
 *
 * @param triples
 */
export function buildConflictsMap(triples: FileTriple[]): Record<string, ConflictTriple> {
  const map: Record<string, ConflictTriple> = {}
  for (const t of triples) {
    const format = isJsonPath(t.path) ? 'json' : isYamlPath(t.path) ? 'yaml' : 'text'
    const base = t.base ?? ''
    const local = t.local ?? ''
    const remote = t.remote ?? ''
    let id: string | null = null
    if (format === 'json' || format === 'yaml') {
      const parsed = isJsonPath(t.path) ? safeParseJson(local) ?? safeParseJson(base) ?? safeParseJson(remote) : safeParseYaml(local) ?? safeParseYaml(base) ?? safeParseYaml(remote)
      id = extractId(parsed)
    }
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

// Merge two conflict maps: incoming entries overwrite existing only when timestamp is newer
/**
 *
 * @param existing
 * @param incoming
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
    } catch (_e) {
      // if parse fails, prefer incoming
      out[k] = inc
    }
  }
  return out
}

/**
 *
 * @param triples
 */
export function threeway(triples: FileTriple[]): { resolved: string[]; conflicts: Record<string, ConflictTriple> } {
  const resolved: string[] = []
  const conflictsMap: Record<string, ConflictTriple> = {}

  for (const t of triples) {
    const path = t.path
    const format = isJsonPath(path) ? 'json' : isYamlPath(path) ? 'yaml' : 'text'

    if (format === 'json' || format === 'yaml') {
      const baseObj = format === 'json' ? safeParseJson(t.base) : safeParseYaml(t.base)
      const localObj = format === 'json' ? safeParseJson(t.local) : safeParseYaml(t.local)
      const remoteObj = format === 'json' ? safeParseJson(t.remote) : safeParseYaml(t.remote)

      if (baseObj === null || localObj === null || remoteObj === null) {
        const map = buildConflictsMap([t])
        Object.assign(conflictsMap, map)
        continue
      }

      const { conflict } = mergeValues(baseObj, localObj, remoteObj)
      if (conflict) {
        const map = buildConflictsMap([t])
        Object.assign(conflictsMap, map)
      } else {
        resolved.push(path)
      }
    } else {
      const base = t.base ?? ''
      const local = t.local ?? ''
      const remote = t.remote ?? ''
      if (local === remote) {
        resolved.push(path)
      } else if (local === base && remote !== base) {
        resolved.push(path)
      } else if (remote === base && local !== base) {
        resolved.push(path)
      } else {
        const map = buildConflictsMap([t])
        Object.assign(conflictsMap, map)
      }
    }
  }

  return { resolved, conflicts: conflictsMap }
}

export default { buildConflictsMap, threeway }

// Merge helpers
/**
 *
 * @param base
 * @param local
 * @param remote
 */
function mergeValues(base: any, local: any, remote: any): { merged: any; conflict: boolean } {
  if (typeof base !== 'object' || base === null) {
    const lChanged = JSON.stringify(local) !== JSON.stringify(base)
    const rChanged = JSON.stringify(remote) !== JSON.stringify(base)
    if (lChanged && !rChanged) return { merged: local, conflict: false }
    if (!lChanged && rChanged) return { merged: remote, conflict: false }
    if (!lChanged && !rChanged) return { merged: base, conflict: false }
    return { merged: null, conflict: true }
  }

  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    const allObjects = [...base, ...local, ...remote].every((v) => v && typeof v === 'object')
    if (allObjects) {
      const indexById = new Map<string, { b: any; l: any; r: any }>()
      /**
       *
       * @param arr
       * @param key
       */
      const addToIndex = (arr: any[], key: 'b' | 'l' | 'r') => {
        for (const it of arr) {
          const id = extractId(it)
          if (id) {
            const cur = indexById.get(id) || { b: null, l: null, r: null };
            (cur as any)[key] = it;
            indexById.set(id, cur);
          }
        }
      }
      addToIndex(base, 'b')
      addToIndex(local, 'l')
      addToIndex(remote, 'r')
      const mergedArr: any[] = []
      for (const [, trio] of indexById.entries()) {
        const mo = mergeObjects(trio.b, trio.l, trio.r)
        if (mo.conflict) return { merged: null, conflict: true }
        mergedArr.push(mo.merged)
      }
      return { merged: mergedArr, conflict: false }
    }
    const lChanged = JSON.stringify(local) !== JSON.stringify(base)
    const rChanged = JSON.stringify(remote) !== JSON.stringify(base)
    if (lChanged && !rChanged) return { merged: local, conflict: false }
    if (!lChanged && rChanged) return { merged: remote, conflict: false }
    if (!lChanged && !rChanged) return { merged: base, conflict: false }
    return { merged: null, conflict: true }
  }

  return mergeObjects(base, local, remote)
}

/**
 *
 * @param base
 * @param local
 * @param remote
 */
function mergeObjects(base: any, local: any, remote: any): { merged: any; conflict: boolean } {
  const keys = new Set<string>([...Object.keys(base || {}), ...Object.keys(local || {}), ...Object.keys(remote || {})])
  const out: any = {}
  for (const k of keys) {
    const b = base ? base[k] : undefined
    const l = local ? local[k] : undefined
    const r = remote ? remote[k] : undefined
    const lChanged = JSON.stringify(l) !== JSON.stringify(b)
    const rChanged = JSON.stringify(r) !== JSON.stringify(b)
    if (lChanged && !rChanged) out[k] = l
    else if (!lChanged && rChanged) out[k] = r
    else if (!lChanged && !rChanged) out[k] = b
    else {
      return { merged: null, conflict: true }
    }
  }
  return { merged: out, conflict: false }
}

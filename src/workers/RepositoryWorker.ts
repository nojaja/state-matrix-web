import repoSync from '../lib/repoSync'

export type FileTriple = {
  path: string
  base: string | null
  local: string | null
  remote: string | null
}

/**
 * 処理名: Worker側threeway
 * @param triples - ファイルトリプル
 * @returns マージ結果
 */
export async function threeway(triples: FileTriple[]) {
  // Worker-side threeway simply delegates to repoSync.threeway
  try {
    const res = repoSync.threeway(triples as any)
    return { ok: true, result: res }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/**
 * 処理名: リモートツリー取得
 * @param _cfg - 設定(未使用)
 * @returns ツリー情報
 */
export async function fetchRemoteTree(_cfg: any) {
  void _cfg
  // Placeholder: real implementation performs network IO.
  return { ok: true, result: { headSha: null, files: [] } }
}

/**
 * 処理名: プッシュ処理
 * @param _cfg - 設定(未使用)
 * @param _files - ファイル配列(未使用)
 * @returns プッシュ結果
 */
export async function push(_cfg: any, _files: { path: string; content: string }[]) {
  void _cfg
  // Placeholder: real implementation performs network IO.
  return { ok: true, result: { pushed: _files.map((f) => f.path) } }
}

// Worker message handler (for browser Worker usage)
/**
 *
 * @param ev
 */
onmessage = async (ev: MessageEvent) => {
  const msg = ev.data
  try {
    if (msg.type === 'threeway') {
      const result = repoSync.threeway(msg.triples)
      // Post normalized: resolved array and conflicts map
      // Convert conflicts map to array of keys for lightweight transport
      const conflictKeys = Object.keys(result.conflicts)
      postMessage({ type: 'threeway:result', resolved: result.resolved, conflicts: result.conflicts, conflictKeys })
    } else if (msg.type === 'ping') {
      postMessage({ type: 'pong' })
    } else {
      postMessage({ type: 'error', message: 'unknown command' })
    }
  } catch (e) {
    postMessage({ type: 'error', message: String(e) })
  }
}

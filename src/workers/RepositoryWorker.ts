import repoSync from '../lib/repoSync'

export type FileTriple = {
  path: string
  base: string | null
  local: string | null
  remote: string | null
}

/**
 *
 * @param triples
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
 *
 * @param _cfg
 */
export async function fetchRemoteTree(_cfg: any) {
  // Placeholder: real implementation performs network IO.
  return { ok: true, result: { headSha: null, files: [] } }
}

/**
 *
 * @param _cfg
 * @param _files
 */
export async function push(_cfg: any, _files: { path: string; content: string }[]) {
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

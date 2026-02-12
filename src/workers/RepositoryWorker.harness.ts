import repoSync from '../lib/repoSync'

/**
 * 処理名: Workerメッセージハンドラ
 * @param msg - メッセージ
 * @returns ハンドラ結果
 */
export async function handleWorkerMessage(msg: any) {
  try {
    if (msg.type === 'threeway') {
      const result = repoSync.threeway(msg.triples || [])
      const conflictKeys = Object.keys(result.conflicts || {})
      return { type: 'threeway:result', resolved: result.resolved, conflicts: result.conflicts, conflictKeys }
    }
    if (msg.type === 'ping') {
      return { type: 'pong' }
    }
    return { type: 'error', message: 'unknown command' }
  } catch (e) {
    return { type: 'error', message: String(e) }
  }
}

// simple fetchRemoteTree mock for harness tests (can be extended)
/**
 * 処理名: リモートツリーモック
 * @param _cfg - 設定(未使用)
 * @returns モックツリーデータ
 */
export async function fetchRemoteTreeMock(_cfg: any) {
  void _cfg
  return { headSha: 'deadbeef', files: [{ path: 'items.json', sha: 'sha1' }] }
}

export default { handleWorkerMessage, fetchRemoteTreeMock }

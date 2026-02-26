/**
 * @test-type behavior
 * @spec docs/spec/v0.0.7/browser-git-ops-v008-migration-design.md
 * @purpose ProjectConfigRepository の AdapterMeta 型が v0.0.8 新形式に対応していることを検証
 *
 * 設計書 §5.7:
 *   - ローカル AdapterMeta 型に url, branch, token フィールドを追加
 *   - setAdapter(input) / getAdapter() の呼び出し自体は変更不要
 *
 * 設計書 付録B.1:
 *   - v0.0.8 AdapterMeta 型定義の拡張
 *   - テストの assertion で新形式の meta を期待するように変更
 */
import { beforeAll, describe, expect, it, jest } from '@jest/globals'

// v0.0.8 AdapterMeta: url, branch, token がトップレベル
type AdapterMeta = {
  type: string
  url?: string
  branch?: string
  token?: string
  opts?: Record<string, unknown>
}

let ProjectConfigRepository: any

beforeAll(async () => {
  const mod = await import('../../../../../src/repositories/projectConfigRepository')
  ProjectConfigRepository = mod.ProjectConfigRepository
})

describe('ProjectConfigRepository (v0.0.8 AdapterMeta)', () => {
  it('setAdapter は v0.0.8 新形式 AdapterMeta（url, branch, token がトップレベル）を受け入れる', async () => {
    const vfs = {
      setAdapter: (jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined)
    }
    const manager = { getCurrentVfs: jest.fn(() => vfs) }
    const repo = new ProjectConfigRepository(manager)
    // v0.0.8 新形式: url, branch, token がトップレベル
    const input: AdapterMeta = {
      type: 'github',
      url: 'https://github.com/owner/repo',
      branch: 'main',
      token: 'ghp_xxx',
      opts: { owner: 'owner', repo: 'repo' }
    }

    await repo.setAdapter(input)

    // setAdapter(meta) 方式で呼ばれること
    expect(vfs.setAdapter).toHaveBeenCalledWith(input)
    expect(vfs.setAdapter).toHaveBeenCalledTimes(1)
    // 引数は 1 つ（meta のみ）
    expect(vfs.setAdapter.mock.calls[0]).toHaveLength(1)
  })

  it('setAdapter は v0.0.8 新形式 GitLab AdapterMeta を受け入れる', async () => {
    const vfs = {
      setAdapter: (jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined)
    }
    const manager = { getCurrentVfs: jest.fn(() => vfs) }
    const repo = new ProjectConfigRepository(manager)
    const input: AdapterMeta = {
      type: 'gitlab',
      url: 'https://gitlab.example.com/group/project',
      branch: 'dev',
      token: 'glpat_xxx',
      opts: { projectId: 'group/project' }
    }

    await repo.setAdapter(input)

    expect(vfs.setAdapter).toHaveBeenCalledWith(input)
    expect(vfs.setAdapter.mock.calls[0]).toHaveLength(1)
  })

  it('getAdapter は v0.0.8 新形式（url, branch, token がトップレベル）の結果を返す', async () => {
    // v0.0.8 で setAdapter 後に getAdapter が返す形式
    const adapter: AdapterMeta = {
      type: 'github',
      url: 'https://github.com/owner/repo',
      branch: 'main',
      token: 'ghp_xxx',
      opts: { owner: 'owner', repo: 'repo' }
    }
    const vfs = {
      getAdapter: (jest.fn() as jest.MockedFunction<
        () => Promise<AdapterMeta | null>
      >).mockResolvedValue(adapter)
    }
    const manager = { getCurrentVfs: jest.fn(() => vfs) }
    const repo = new ProjectConfigRepository(manager)

    const result = await repo.getAdapter()

    expect(result).toBe(adapter)
    // v0.0.8 新形式のフィールドが存在すること
    expect(result.url).toBe('https://github.com/owner/repo')
    expect(result.branch).toBe('main')
    expect(result.token).toBe('ghp_xxx')
    expect(result.opts).toEqual({ owner: 'owner', repo: 'repo' })
  })

  it('getAdapter は v0.0.7 旧形式の結果もそのまま返す（後方互換）', async () => {
    // v0.0.7 以前に保存されたデータ
    const adapter = {
      type: 'github',
      opts: { owner: 'o', repo: 'r', token: 'tok', branch: 'main' }
    }
    const vfs = {
      getAdapter: (jest.fn() as jest.MockedFunction<any>).mockResolvedValue(adapter)
    }
    const manager = { getCurrentVfs: jest.fn(() => vfs) }
    const repo = new ProjectConfigRepository(manager)

    const result = await repo.getAdapter()

    expect(result).toBe(adapter)
    expect(result.type).toBe('github')
    // 旧形式: opts に token/branch がある
    expect(result.opts.token).toBe('tok')
    expect(result.opts.branch).toBe('main')
  })

  it('プロジェクト未オープン時は例外を投げる', async () => {
    const manager = { getCurrentVfs: jest.fn(() => null) }
    const repo = new ProjectConfigRepository(manager)

    await expect(repo.getAdapter()).rejects.toThrow()
  })
})

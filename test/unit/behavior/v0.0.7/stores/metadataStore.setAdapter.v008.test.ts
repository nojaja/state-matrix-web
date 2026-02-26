/**
 * @test-type behavior
 * @spec docs/spec/v0.0.7/browser-git-ops-v008-migration-design.md
 * @purpose metadataStore の setAdapter 呼び出しが v0.0.8 新形式 AdapterMeta を使用することを検証
 *
 * 設計書 §4.1 setAdapter 呼び出しの方針:
 *   - metadataStore 内部は setAdapter(meta) 方式を継続
 *   - buildAdapterPayload の出力を新形式 { type, url, branch, token, opts } に変更
 *
 * 設計書 §5.6.1 buildAdapterPayload() の変更:
 *   - branch/token はトップレベル、opts には host/owner/repo 等のみ
 *
 * 設計書 §10.2 metadataStore → VFS（AdapterMeta 方式）:
 *   - payload = { type: 'github', url: '...', branch: 'main', token: 'tok', opts: { owner, repo } }
 */
import { jest } from '@jest/globals'
import { setActivePinia, createPinia } from 'pinia'

let useMetadataStore: any
let virtualFsManager: any

beforeAll(async () => {
  const mod = await import('../../../../../src/stores/metadataStore')
  useMetadataStore = mod.useMetadataStore
  const vfsMod = await import('../../../../../src/lib/virtualFsSingleton')
  virtualFsManager = vfsMod.virtualFsManager
})

beforeEach(() => {
  setActivePinia(createPinia())
  jest.clearAllMocks()
})

describe('metadataStore v0.0.8 setAdapter 新形式', () => {
  describe('saveRepoConfig — setAdapter に渡す payload が v0.0.8 新形式であること', () => {
    it('VFS が開いている場合、新形式 AdapterMeta（url, branch, token がトップレベル）で setAdapter を呼ぶ', async () => {
      const setAdapter = jest.fn(async () => undefined)
      const vfs: any = { setAdapter }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = {
        provider: 'github' as const,
        repositoryUrl: 'https://github.com/myowner/myrepo',
        branch: 'feature',
        token: 'ghp_test'
      }
      await store.saveRepoConfig('proj1', cfg)

      expect(setAdapter).toHaveBeenCalledTimes(1)
      // v0.0.8 新形式: url, branch, token がトップレベルに存在
      const payload = (setAdapter.mock.calls as unknown[][])[0][0] as any
      expect(payload.type).toBe('github')
      expect(payload.url).toBe('https://github.com/myowner/myrepo')
      expect(payload.branch).toBe('feature')
      expect(payload.token).toBe('ghp_test')
      // opts には owner/repo のみ（token/branch は除去されていること）
      expect(payload.opts.owner).toBe('myowner')
      expect(payload.opts.repo).toBe('myrepo')
      expect(payload.opts.token).toBeUndefined()
      expect(payload.opts.branch).toBeUndefined()
    })

    it('VFS 未オープン時は openProject して新形式 payload で setAdapter を呼ぶ', async () => {
      const tmpSetAdapter = jest.fn(async () => undefined)
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockImplementation(() => { throw new Error('no current') })
      jest.spyOn(virtualFsManager, 'openProject').mockResolvedValue({ setAdapter: tmpSetAdapter })
      jest.spyOn(virtualFsManager, 'closeProject').mockImplementation(() => undefined)

      const store = useMetadataStore()
      const cfg = {
        provider: 'github' as const,
        repositoryUrl: 'https://github.com/owner/repo',
        branch: 'main',
        token: 'tok'
      }
      await store.saveRepoConfig('projX', cfg)

      expect(tmpSetAdapter).toHaveBeenCalledTimes(1)
      const payload = (tmpSetAdapter.mock.calls as unknown[][])[0][0] as any
      // v0.0.8 新形式であること
      expect(payload.url).toBe('https://github.com/owner/repo')
      expect(payload.branch).toBe('main')
      expect(payload.token).toBe('tok')
      expect(payload.opts.token).toBeUndefined()
      expect(payload.opts.branch).toBeUndefined()
    })
  })

  describe('syncProject (ensureAdapterOnVfs) — v0.0.8 新形式 payload で setAdapter を呼ぶ', () => {
    it('ensureAdapterOnVfs が新形式 AdapterMeta で setAdapter を呼ぶ', async () => {
      const setAdapter = jest.fn(async () => undefined)
      const vfs: any = {
        getAdapter: jest.fn(async () => null),
        setAdapter,
        pull: jest.fn(async () => undefined),
        stat: jest.fn(async () => ({})),
        getIndex: jest.fn(async () => ({ head: 'h1', files: ['f'] })),
        getConflicts: jest.fn(async () => []),
        getChangeSet: jest.fn(async () => [])
      }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      store.repoConfigs['P'] = {
        provider: 'github' as const,
        repositoryUrl: 'https://github.com/o/r',
        branch: 'main',
        token: 'tok'
      }
      await store.syncProject('P')

      // ensureAdapterOnVfs → buildAdapterPayload → setAdapter(payload)
      expect(setAdapter).toHaveBeenCalled()
      const payload = (setAdapter.mock.calls as unknown[][])[0][0] as any
      // v0.0.8 新形式の検証
      expect(payload.type).toBe('github')
      expect(payload.url).toBe('https://github.com/o/r')
      expect(payload.branch).toBe('main')
      expect(payload.token).toBe('tok')
      // opts に token/branch が含まれないこと
      expect(payload.opts.token).toBeUndefined()
      expect(payload.opts.branch).toBeUndefined()
    })
  })
})

/**
 * @test-type behavior
 * @spec docs/spec/v0.0.7/browser-git-ops-v007-migration-design.md
 * @purpose metadataStore が v0.0.7 の setAdapter(meta) API を使用することを検証
 *
 * 設計書 §6.6:
 *   - setAdapterWithFallback() の setAdapter(null, payload) → setAdapter(payload) に修正
 *   - saveRepoConfig() 内の setAdapter(null, adapterPayload) → setAdapter(adapterPayload) に修正
 *
 * 設計書 §10.2:
 *   - metadataStore 内部での setAdapter 呼び出しは AdapterMeta 方式 vfs.setAdapter(payload)
 *
 * 設計書 付録B.2:
 *   - expect(mockSetAdapter).toHaveBeenCalledWith(expect.objectContaining({ type: 'github' }))
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

describe('metadataStore v0.0.7 setAdapter migration', () => {
  describe('saveRepoConfig', () => {
    it('現在の VFS が開いている場合 vfs.setAdapter(payload) を null なしで呼び出す', async () => {
      const setAdapter = jest.fn(async () => undefined)
      const vfs: any = { setAdapter }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = {
        provider: 'github',
        repositoryUrl: 'https://github.com/myowner/myrepo',
        branch: 'main',
        token: 'ghp_xxx'
      }
      await store.saveRepoConfig('proj', cfg)

      // v0.0.7: setAdapter(AdapterMeta) を直接呼び出す（§10.2）
      expect(setAdapter).toHaveBeenCalledTimes(1)
      expect(setAdapter).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'github' })
      )
      // null を第一引数に渡していないことを確認（§6.6）
      expect(setAdapter).not.toHaveBeenCalledWith(null, expect.anything())
      // 呼び出し引数が 1 つ（AdapterMeta のみ）
      expect(setAdapter.mock.calls[0]).toHaveLength(1)
    })

    it('VFS 未オープン時は openProject して setAdapter(payload) を null なしで呼び出す', async () => {
      const tmpSetAdapter = jest.fn(async () => undefined)
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockImplementation(() => { throw new Error('no current') })
      jest.spyOn(virtualFsManager, 'openProject').mockResolvedValue({ setAdapter: tmpSetAdapter })
      jest.spyOn(virtualFsManager, 'closeProject').mockImplementation(() => undefined)

      const store = useMetadataStore()
      const cfg = {
        provider: 'github',
        repositoryUrl: 'https://github.com/owner/repo',
        branch: 'main',
        token: 'tok'
      }
      await store.saveRepoConfig('projX', cfg)

      // openProject 経由でも null なしで setAdapter 呼び出し
      expect(tmpSetAdapter).toHaveBeenCalledTimes(1)
      expect(tmpSetAdapter).not.toHaveBeenCalledWith(null, expect.anything())
      expect(tmpSetAdapter.mock.calls[0]).toHaveLength(1)
    })
  })

  describe('syncProject (ensureAdapterOnVfs)', () => {
    it('adapter が未設定の場合 setAdapter(payload) を null なしで呼び出す', async () => {
      const setAdapter = jest.fn(async () => undefined)
      const vfs: any = {
        getAdapter: jest.fn(async () => null), // adapter 未設定
        setAdapter,
        pull: jest.fn(async () => undefined),
        stat: jest.fn(async () => ({})),
        getIndex: jest.fn(async () => ({ head: 'h1', files: ['f'] })),
        getConflicts: jest.fn(async () => []),
        getChangeSet: jest.fn(async () => [])
      }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      // syncProject が ensureAdapterOnVfs を通じて setAdapter(payload) を呼ぶ
      store.repoConfigs['P'] = {
        provider: 'github',
        repositoryUrl: 'https://github.com/o/r',
        branch: 'main',
        token: 'tok'
      }
      await store.syncProject('P')

      // ensureAdapterOnVfs 内で setAdapter が呼ばれること
      expect(setAdapter).toHaveBeenCalled()
      // 全ての呼び出しで null を第一引数に渡していないこと
      for (const call of setAdapter.mock.calls as unknown[][]) {
        expect(call[0]).not.toBeNull()
        expect(call).toHaveLength(1)
      }
    })
  })
})

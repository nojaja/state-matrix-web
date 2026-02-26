/**
 * @test-type behavior
 * @spec docs/spec/v0.0.7/browser-git-ops-v008-migration-design.md
 * @purpose v0.0.8 の AdapterMeta 新形式（url, branch, token がトップレベル）に対応した
 *          RepoConfig ↔ AdapterMeta 変換を検証する
 *
 * 設計書 §4.2 AdapterMeta 更新方針:
 *   - buildAdapterPayload の出力を新形式 { type, url, branch, token, opts } に変更
 *
 * 設計書 §4.3 getAdapter() 戻り値のハンドリング方針:
 *   - buildRepoConfigFromAdapter は v0.0.7 旧形式と v0.0.8 新形式の両方に対応
 *
 * 設計書 §5.6.1 buildAdapterPayload() の変更:
 *   - branch/token はトップレベル、opts には host/owner/repo 等のみ
 *
 * 設計書 §5.6.2 buildRepoConfigFromAdapter() の変更:
 *   - adapter.url をトップレベルから取得、なければ buildUrlFromAdapterOpts にフォールバック
 *   - branch/token はトップレベル優先、opts からフォールバック
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

describe('metadataStore v0.0.8 RepoConfig ↔ AdapterMeta 変換', () => {
  describe('loadRepoConfig — v0.0.8 新形式の AdapterMeta から RepoConfig への変換', () => {
    it('v0.0.8 新形式 GitHub adapter（トップレベル url/branch/token）から RepoConfig を返す', async () => {
      // v0.0.8 形式: url, branch, token がトップレベル、opts から除去
      const adapter = {
        type: 'github',
        url: 'https://github.com/myowner/myrepo',
        branch: 'main',
        token: 'ghp_xxx',
        opts: { owner: 'myowner', repo: 'myrepo' }
      }
      const vfs: any = { getAdapter: jest.fn(async () => adapter) }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = await store.loadRepoConfig('proj1')

      expect(cfg).not.toBeNull()
      expect(cfg.provider).toBe('github')
      // §5.6.2: adapter.url をトップレベルから取得
      expect(cfg.repositoryUrl).toBe('https://github.com/myowner/myrepo')
      // §5.6.2: branch/token はトップレベル優先
      expect(cfg.branch).toBe('main')
      expect(cfg.token).toBe('ghp_xxx')
    })

    it('v0.0.8 新形式 GitLab adapter（トップレベル url/branch/token）から RepoConfig を返す', async () => {
      const adapter = {
        type: 'gitlab',
        url: 'https://gitlab.example.com/group/project',
        branch: 'dev',
        token: 'glpat_xxx',
        opts: { projectId: 'group/project', host: 'https://gitlab.example.com' }
      }
      const vfs: any = { getAdapter: jest.fn(async () => adapter) }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = await store.loadRepoConfig('proj2')

      expect(cfg).not.toBeNull()
      expect(cfg.provider).toBe('gitlab')
      expect(cfg.repositoryUrl).toBe('https://gitlab.example.com/group/project')
      expect(cfg.branch).toBe('dev')
      expect(cfg.token).toBe('glpat_xxx')
    })

    it('v0.0.7 旧形式 adapter（opts 内に branch/token）からも正しく RepoConfig を返す（後方互換）', async () => {
      // §4.3 / §6.1: v0.0.7 以前に保存された IndexFile は旧形式のまま
      const adapter = {
        type: 'github',
        opts: { owner: 'oldowner', repo: 'oldrepo', token: 'ghp_old', branch: 'legacy' }
      }
      const vfs: any = { getAdapter: jest.fn(async () => adapter) }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = await store.loadRepoConfig('proj3')

      expect(cfg).not.toBeNull()
      expect(cfg.provider).toBe('github')
      // §5.6.2: url が無い場合は buildUrlFromAdapterOpts にフォールバック
      expect(cfg.repositoryUrl).toBe('https://github.com/oldowner/oldrepo')
      // §5.6.2: トップレベル未設定なら opts からフォールバック
      expect(cfg.branch).toBe('legacy')
      expect(cfg.token).toBe('ghp_old')
    })

    it('v0.0.7 旧形式 GitLab adapter からも正しく RepoConfig を返す（後方互換）', async () => {
      const adapter = {
        type: 'gitlab',
        opts: { projectId: 'mygroup/myproject', host: 'https://gitlab.com', token: 'glpat_old', branch: 'main' }
      }
      const vfs: any = { getAdapter: jest.fn(async () => adapter) }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = await store.loadRepoConfig('proj4')

      expect(cfg).not.toBeNull()
      expect(cfg.provider).toBe('gitlab')
      expect(cfg.repositoryUrl).toBe('https://gitlab.com/mygroup/myproject')
      expect(cfg.branch).toBe('main')
      expect(cfg.token).toBe('glpat_old')
    })

    it('branch がトップレベルにも opts にもない場合 main をデフォルトとする', async () => {
      const adapter = {
        type: 'github',
        url: 'https://github.com/o/r',
        opts: { owner: 'o', repo: 'r' }
      }
      const vfs: any = { getAdapter: jest.fn(async () => adapter) }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = await store.loadRepoConfig('projDefault')

      expect(cfg).not.toBeNull()
      expect(cfg.branch).toBe('main')
    })
  })

  describe('saveRepoConfig — v0.0.8 新形式 AdapterMeta の生成', () => {
    it('GitHub の RepoConfig から新形式 AdapterMeta を構築する（url, branch, token がトップレベル）', async () => {
      const setAdapter = jest.fn(async () => undefined)
      const vfs: any = { setAdapter }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = {
        provider: 'github' as const,
        repositoryUrl: 'https://github.com/myowner/myrepo',
        branch: 'main',
        token: 'ghp_xxx'
      }
      await store.saveRepoConfig('proj', cfg)

      // §5.6.1: 新形式 — branch/token はトップレベル、opts には owner/repo のみ
      expect(setAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'github',
          url: 'https://github.com/myowner/myrepo',
          branch: 'main',
          token: 'ghp_xxx'
        })
      )
      // opts に owner/repo があること
      const payload = (setAdapter.mock.calls as unknown[][])[0][0] as any
      expect(payload.opts).toBeDefined()
      expect(payload.opts.owner).toBe('myowner')
      expect(payload.opts.repo).toBe('myrepo')
      // opts に token/branch が含まれていないこと（トップレベルに移動済み）
      expect(payload.opts.token).toBeUndefined()
      expect(payload.opts.branch).toBeUndefined()
    })

    it('GitLab の RepoConfig から新形式 AdapterMeta を構築する', async () => {
      const setAdapter = jest.fn(async () => undefined)
      const vfs: any = { setAdapter }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = {
        provider: 'gitlab' as const,
        repositoryUrl: 'https://gitlab.example.com/group/project',
        branch: 'dev',
        token: 'glpat_xxx'
      }
      await store.saveRepoConfig('proj', cfg)

      // §5.6.1: GitLab でも新形式
      expect(setAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'gitlab',
          url: 'https://gitlab.example.com/group/project',
          branch: 'dev',
          token: 'glpat_xxx'
        })
      )
      const payload = (setAdapter.mock.calls as unknown[][])[0][0] as any
      expect(payload.opts).toBeDefined()
      expect(payload.opts.projectId).toBe('group/project')
      // opts に token/branch が含まれていないこと
      expect(payload.opts.token).toBeUndefined()
      expect(payload.opts.branch).toBeUndefined()
    })

    it('GitHub Enterprise の RepoConfig から正しい AdapterMeta を構築する', async () => {
      const setAdapter = jest.fn(async () => undefined)
      const vfs: any = { setAdapter }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = {
        provider: 'github' as const,
        repositoryUrl: 'https://git.example.com/owner/repo',
        branch: 'main',
        token: 'ghp_xxx'
      }
      await store.saveRepoConfig('proj', cfg)

      const payload = (setAdapter.mock.calls as unknown[][])[0][0] as any
      // §5.6.1: カスタムホスト時、url はトップレベルにそのまま
      expect(payload.url).toBe('https://git.example.com/owner/repo')
      expect(payload.type).toBe('github')
      expect(payload.branch).toBe('main')
      expect(payload.token).toBe('ghp_xxx')
      expect(payload.opts.owner).toBe('owner')
      expect(payload.opts.repo).toBe('repo')
      expect(payload.opts.host).toBe('https://git.example.com/api/v3')
    })

    it('branch 未指定の場合 main がデフォルトセットされる', async () => {
      const setAdapter = jest.fn(async () => undefined)
      const vfs: any = { setAdapter }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = {
        provider: 'github' as const,
        repositoryUrl: 'https://github.com/o/r',
        branch: '',
        token: 'tok'
      }
      await store.saveRepoConfig('proj', cfg)

      const payload = (setAdapter.mock.calls as unknown[][])[0][0] as any
      expect(payload.branch).toBe('main')
    })
  })
})

/**
 * @test-type behavior
 * @spec docs/spec/v0.0.7/browser-git-ops-v007-migration-design.md
 * @purpose RepoConfig が v0.0.7 形式(repositoryUrl ベース)に変換されることを検証
 *
 * 設計書 §5.4 RepoConfig 型変更:
 *   - owner, repository, host → repositoryUrl に統合
 *
 * 設計書 §5.5 RepoConfig ↔ URL 変換ヘルパー:
 *   - buildUrlFromAdapterOpts: AdapterMeta.opts → URL を構築
 *   - buildRepoConfigFromAdapter: AdapterMeta → 新 RepoConfig に変換
 *
 * 設計書 §7 データ移行・後方互換性:
 *   - 既存 IndexFile 上のデータは移行不要
 *   - getAdapter() が返す AdapterMeta からの逆変換で対応
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

describe('metadataStore v0.0.7 RepoConfig format', () => {
  describe('loadRepoConfig (AdapterMeta → RepoConfig 変換)', () => {
    it('GitHub adapter から repositoryUrl を持つ RepoConfig を返す', async () => {
      const adapter = {
        type: 'github',
        opts: { owner: 'myowner', repo: 'myrepo', token: 'ghp_xxx', branch: 'main' }
      }
      const vfs: any = { getAdapter: jest.fn(async () => adapter) }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = await store.loadRepoConfig('proj1')

      expect(cfg).not.toBeNull()
      // §5.4: 新 RepoConfig には repositoryUrl がある（§5.5: buildUrlFromAdapterOpts）
      expect(cfg.provider).toBe('github')
      expect(cfg.repositoryUrl).toBe('https://github.com/myowner/myrepo')
      expect(cfg.branch).toBe('main')
      expect(cfg.token).toBe('ghp_xxx')
      // §5.4: 旧フィールド owner, repository, host は存在しない
      expect(cfg).not.toHaveProperty('owner')
      expect(cfg).not.toHaveProperty('repository')
      expect(cfg).not.toHaveProperty('host')
    })

    it('GitLab adapter から repositoryUrl を持つ RepoConfig を返す', async () => {
      const adapter = {
        type: 'gitlab',
        opts: { projectId: 'group/project', host: 'https://gitlab.example.com', token: 'glpat_xxx', branch: 'dev' }
      }
      const vfs: any = { getAdapter: jest.fn(async () => adapter) }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = await store.loadRepoConfig('proj2')

      expect(cfg).not.toBeNull()
      // §5.5: GitLab の場合 host + projectId を URL に結合
      expect(cfg.provider).toBe('gitlab')
      expect(cfg.repositoryUrl).toBe('https://gitlab.example.com/group/project')
      expect(cfg.branch).toBe('dev')
      expect(cfg.token).toBe('glpat_xxx')
      // 旧フィールドが存在しないこと
      expect(cfg).not.toHaveProperty('owner')
      expect(cfg).not.toHaveProperty('repository')
      expect(cfg).not.toHaveProperty('host')
    })

    it('GitHub adapter(host 指定)から正しい repositoryUrl を返す', async () => {
      const adapter = {
        type: 'github',
        opts: { owner: 'o', repo: 'r', host: 'https://git.example.com/api/v3', token: 't', branch: 'main' }
      }
      const vfs: any = { getAdapter: jest.fn(async () => adapter) }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = await store.loadRepoConfig('proj3')

      expect(cfg).not.toBeNull()
      // §5.5: GitHub Enterprise の場合 host から /api/v3 を除去して URL を構築
      expect(cfg.repositoryUrl).toBe('https://git.example.com/o/r')
    })

    it('GitLab adapter(デフォルト host)から https://gitlab.com/... を返す', async () => {
      const adapter = {
        type: 'gitlab',
        opts: { projectId: 'mygroup/myproject', token: 'tok', branch: 'main' }
      }
      const vfs: any = { getAdapter: jest.fn(async () => adapter) }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = await store.loadRepoConfig('proj4')

      expect(cfg).not.toBeNull()
      // §5.5: host が未指定の場合はデフォルト 'https://gitlab.com'
      expect(cfg.repositoryUrl).toBe('https://gitlab.com/mygroup/myproject')
    })
  })

  describe('saveRepoConfig (新 RepoConfig → AdapterMeta 変換)', () => {
    it('GitHub の repositoryUrl から正しい AdapterMeta を構築する', async () => {
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

      // v0.0.8: url/branch/token はトップレベル、opts には owner/repo のみ
      expect(setAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'github',
          url: 'https://github.com/myowner/myrepo',
          branch: 'main',
          token: 'ghp_xxx'
        })
      )
      const payload = (setAdapter.mock.calls as unknown[][])[0][0] as any
      expect(payload.opts.owner).toBe('myowner')
      expect(payload.opts.repo).toBe('myrepo')
    })

    it('GitLab の repositoryUrl から正しい AdapterMeta を構築する', async () => {
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

      // v0.0.8: url/branch/token はトップレベル
      expect(setAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'gitlab',
          url: 'https://gitlab.example.com/group/project',
          branch: 'dev',
          token: 'glpat_xxx'
        })
      )
      const payload = (setAdapter.mock.calls as unknown[][])[0][0] as any
      expect(payload.opts.projectId).toBe('group/project')
      expect(payload.opts.host).toBe('https://gitlab.example.com')
    })

    it('GitHub Enterprise の repositoryUrl から正しい AdapterMeta を構築する', async () => {
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

      // v0.0.8: url/branch/token はトップレベル、セルフホスト時は opts.host に API エンドポイント
      expect(setAdapter).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'github',
          url: 'https://git.example.com/owner/repo',
          branch: 'main',
          token: 'ghp_xxx'
        })
      )
      const payload = (setAdapter.mock.calls as unknown[][])[0][0] as any
      expect(payload.opts.owner).toBe('owner')
      expect(payload.opts.repo).toBe('repo')
    })

    it('saveRepoConfig はストアの repoConfigs にキャッシュする', async () => {
      const setAdapter = jest.fn(async () => undefined)
      const vfs: any = { setAdapter }
      jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

      const store = useMetadataStore()
      const cfg = {
        provider: 'github' as const,
        repositoryUrl: 'https://github.com/o/r',
        branch: 'main',
        token: 'tok'
      }
      await store.saveRepoConfig('myproj', cfg)

      expect(store.repoConfigs['myproj']).toEqual(cfg)
    })
  })
})

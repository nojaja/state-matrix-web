/**
 * @test-type coverage
 * @purpose カバレッジ拡張（syncProject / push flow）
 * @policy MODIFICATION ALLOWED
 */
import { jest } from '@jest/globals'
import { setActivePinia, createPinia } from 'pinia'

let useMetadataStore: any
let virtualFsManager: any

beforeAll(async () => {
  const mod = await import('../../../../src/stores/metadataStore')
  useMetadataStore = mod.useMetadataStore
  const vfsMod = await import('../../../../src/lib/virtualFsSingleton')
  virtualFsManager = vfsMod.virtualFsManager
})

beforeEach(() => {
  setActivePinia(createPinia())
  jest.clearAllMocks()
})

describe('metadataStore sync/push coverage', () => {
  it('syncProject returns metadata and pushResults when no conflicts', async () => {
    const cfg = { provider: 'github', owner: 'o', repository: 'r', branch: 'main' }
    const vfs: any = {
      getAdapter: jest.fn(async () => ({ type: 'github', opts: { owner: 'o', repo: 'r' } })),
      pull: jest.fn(async () => undefined),
      stat: jest.fn(async () => ({ size: 1 })),
      getIndex: jest.fn(async () => ({ head: 'h', files: ['f1'] })),
      getChangeSet: jest.fn(async () => ([{ path: 'a', content: 'x' }])),
      push: jest.fn(async (p: any) => ({ ok: true }))
    }

    jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

    const store = useMetadataStore()
    store.repoConfigs['P'] = cfg

    const res = await store.syncProject('P')
    expect(res.metadata).not.toBeNull()
    expect(res.pushResults).toEqual({ ok: true })
    expect(res.needsInit).toBe(false)
  })

  it('saveRepoConfig falls back to openProject when no current VFS', async () => {
    const tmpSetAdapter = jest.fn(async () => undefined)
    jest.spyOn(virtualFsManager, 'getCurrentVfs').mockImplementation(() => { throw new Error('no current') })
    jest.spyOn(virtualFsManager, 'openProject').mockResolvedValue({ setAdapter: tmpSetAdapter })

    const store = useMetadataStore()
    const cfg = { provider: 'github', owner: 'a', repository: 'b', branch: 'main' }
    await store.saveRepoConfig('PP', cfg)
    expect(tmpSetAdapter).toHaveBeenCalled()
  })
})

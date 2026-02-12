/**
 * @test-type coverage
 * @purpose カバレッジ拡張
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

describe('metadataStore coverage additions', () => {
  it('loadRepoConfig reads adapter from current VFS', async () => {
    const adapter = { type: 'github', opts: { owner: 'o', repo: 'r', branch: 'main' } }
    const vfs: any = { getAdapter: jest.fn(async () => adapter) }
    jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

    const store = useMetadataStore()
    const cfg = await store.loadRepoConfig('proj1')
    expect(cfg).not.toBeNull()
    expect(cfg.provider).toBe('github')
    expect(cfg.owner).toBe('o')
    expect(cfg.repository).toBe('r')
  })

  it('saveRepoConfig calls setAdapter on current VFS when available', async () => {
    const setAdapter: any = jest.fn(async () => undefined)
    const vfs: any = { setAdapter }
    jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

    const store = useMetadataStore()
    const cfg = { provider: 'github', owner: 'x', repository: 'y', branch: 'main' }
    await store.saveRepoConfig('proj', cfg)
    expect(setAdapter).toHaveBeenCalled()
  })

  it('loadConflictData builds map from vfs.getConflicts', async () => {
    const conflicts = [{ id: 'k1', path: 'a' }, { path: 'b' }]
    const vfs: any = { getConflicts: jest.fn(async () => conflicts) }
    jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

    const store = useMetadataStore()
    const map = await store.loadConflictData('projX')
    expect(typeof map).toBe('object')
    expect(Object.keys(map).length).toBeGreaterThanOrEqual(1)
    const got = await store.getConflictFor('projX', 'k1')
    expect(got).not.toBeNull()
    expect(got?.path).toBe('a')
  })

  it('resolveConflict delegates to vfs.resolveConflict and updates store', async () => {
    const vfs: any = { resolveConflict: jest.fn(async () => undefined) }
    jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

    const store = useMetadataStore()
    // seed conflictData
    store.conflictData['P'] = { 'k': { id: 'k', path: 'p.txt', base: '', local: '', remote: '', format: 'text', timestamp: new Date().toISOString(), metadata: {} } }

    await store.resolveConflict('P', 'p.txt', 'local')
    expect(vfs.resolveConflict).toHaveBeenCalledWith('p.txt', 'local')
    expect(store.resolvedData['P']).toContain('p.txt')
    expect(store.conflictData['P']['k']).toBeUndefined()
  })

  it('removeConflict deletes entry and adds to resolvedData', async () => {
    const store = useMetadataStore()
    store.conflictData['Z'] = { 'id1': { id: 'id1', path: 'file1', base: '', local: '', remote: '', format: 'text', timestamp: new Date().toISOString(), metadata: {} } }
    await store.removeConflict('Z', 'id1')
    expect(store.resolvedData['Z']).toContain('file1')
    expect(store.conflictData['Z']['id1']).toBeUndefined()
  })
})

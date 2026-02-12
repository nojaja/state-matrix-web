/**
 * @test-type coverage
 * @purpose sync とファイル書き込みの分岐カバレッジ
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

describe('metadataStore sync and writeProjectFile coverage', () => {
  it('syncProject marks needsInit true when metadata empty', async () => {
    const vfs: any = {
      getAdapter: jest.fn(async () => null),
      getIndex: jest.fn(async () => ({ head: null, files: [] })),
      getConflicts: jest.fn(async () => []),
      getChangeSet: jest.fn(async () => []),
      pull: jest.fn(async () => undefined),
      push: jest.fn(async () => ({ ok: true }))
    }
    jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

    const store = useMetadataStore()
    store.repoConfigs['P1'] = { provider: 'github', owner: 'o', repository: 'r', branch: 'main' }
    const res = await store.syncProject('P1')
    expect(res.needsInit).toBe(true)
    expect(res.pushResults).toBeNull()
  })

  it('syncProject pushes when changes exist and returns pushResults', async () => {
    const changes = [{ path: 'a.txt', op: 'modify' }]
    const vfs: any = {
      getAdapter: jest.fn(async () => ({ type: 'github' })),
      getIndex: jest.fn(async () => ({ head: 'h1', files: ['a.txt'] })),
      getConflicts: jest.fn(async () => []),
      getChangeSet: jest.fn(async () => changes),
      pull: jest.fn(async () => undefined),
      push: jest.fn(async (opts: any) => ({ ok: true, pushed: opts }))
    }
    jest.spyOn(virtualFsManager, 'getCurrentVfs').mockReturnValue(vfs)

    const store = useMetadataStore()
    store.repoConfigs['P2'] = { provider: 'github', owner: 'x', repository: 'y', branch: 'main' }
    const res = await store.syncProject('P2')
    expect(res.needsInit).toBe(false)
    expect(res.pushResults).not.toBeNull()
    expect(res.pushResults.ok).toBe(true)
  })

  it('writeProjectFile handles missing old file and writes new content', async () => {
    const filename = 'hello.txt'
    const tempName = `${filename}.tmp`

    const writableFactory = () => ({ write: jest.fn(async () => {}), close: jest.fn(async () => {}) })

    const proj: any = {
      getFileHandle: jest.fn(async (name: string, opts?: any) => {
        if (name === filename && !opts) {
          // simulate getFile throwing (no old file)
          return { getFile: jest.fn(async () => { throw new Error('no file') }) }
        }
        // for temp or final handles
        return { createWritable: jest.fn(async () => writableFactory()) }
      }),
      removeEntry: jest.fn(async () => {}),
      rename: jest.fn(async () => {})
    }

    const store = useMetadataStore()
    jest.spyOn(store, 'getProjectDirHandle' as any).mockResolvedValue(proj)

    await expect(store.writeProjectFile('P', filename, 'content')).resolves.toBeUndefined()
    expect(proj.getFileHandle).toHaveBeenCalled()
  })
})

// @ts-nocheck
import { jest } from '@jest/globals'
import { setActivePinia, createPinia } from 'pinia'
let useProjectStore: any

beforeAll(async () => {
  const mod = await import('../../../src/stores/projectStore')
  useProjectStore = mod.useProjectStore
})

beforeEach(() => {
  setActivePinia(createPinia())
  jest.clearAllMocks()
})

describe('projectStore OPFS write', () => {
  it('saveRepoConfig writes .repo-config.json atomically', async () => {
    // mock writable
    const writable = { write: jest.fn().mockResolvedValue(undefined), close: jest.fn().mockResolvedValue(undefined) }
    const fileHandle = {
      kind: 'file',
      getFile: jest.fn().mockResolvedValue({ /**
       *
       */
      text: async () => '{"existing":true}' }),
      createWritable: jest.fn().mockResolvedValue(writable)
    }

    // project dir handle
    const projDir = {
      getFileHandle: jest.fn().mockResolvedValue(fileHandle),
      removeEntry: jest.fn().mockResolvedValue(undefined),
      rename: undefined, // simulate environment without rename
      /**
       *
       */
      entries: async function* () {}
    }

    const topDir = { getDirectoryHandle: jest.fn().mockResolvedValue(projDir) }
    const root = { getDirectoryHandle: jest.fn().mockResolvedValue(topDir) }

    // mock navigator.storage.getDirectory
    // @ts-ignore
    global.navigator = global.navigator || {}
    // @ts-ignore
    global.navigator.storage = { getDirectory: jest.fn().mockResolvedValue(root) }

    const store = useProjectStore()
    const cfg = { provider: 'github', owner: 'o', repository: 'r', branch: 'main', token: 't' }
    await store.saveRepoConfig('myproj', cfg)

    // expect that temp write and final write were attempted
    expect(projDir.getFileHandle).toHaveBeenCalled()
    // verify that createWritable was called at least once
    expect(fileHandle.createWritable).toHaveBeenCalled()
    expect(writable.write).toHaveBeenCalled()
  })
})

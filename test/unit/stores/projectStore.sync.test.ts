// @ts-nocheck
import { jest } from '@jest/globals'
import { setActivePinia, createPinia } from 'pinia'

let useProjectStore: any

beforeAll(async () => {
  const storeMod = await import('../../../src/stores/projectStore')
  useProjectStore = storeMod.useProjectStore
})

beforeEach(() => {
  setActivePinia(createPinia())
  jest.clearAllMocks()
  try { localStorage.clear() } catch {}
})

describe('projectStore.syncProject', () => {
  it('writes metadata and conflicts when remote tree returned', async () => {
    // mock navigator storage getDirectory minimal API used by writeProjectJsonAtomic
    const files: Record<string, string> = {}
    const projHandle = {
      getFileHandle: jest.fn().mockImplementation(async (name, opts) => {
        // simple in-memory file handle
        return {
          name,
          /**
           *
           */
          async getFile() { return { /**
           *
           */
          text: async () => files[name] || '{}' } },
          /**
           *
           */
          async createWritable() {
            return {
              /**
               *
               * @param content
               */
              write: async (content: string) => { files[name] = content },
              /**
               *
               */
              close: async () => {}
            }
          }
        }
      }),
      removeEntry: jest.fn().mockResolvedValue(undefined),
      rename: undefined
    }
    const root = { getDirectoryHandle: jest.fn().mockResolvedValue({ getDirectoryHandle: jest.fn().mockResolvedValue(projHandle) }) }
    // @ts-ignore
    global.navigator = global.navigator || {}
    // @ts-ignore
    global.navigator.storage = { getDirectory: jest.fn().mockResolvedValue(root) }

    const store = useProjectStore()
    // set selected project and repo config
    store.selectProject('pA')
    store.repoConfigs['pA'] = { provider: 'github', owner: 'o', repository: 'r', branch: 'main' }

    // mock RepositoryWorkerClient.fetchRemoteTree
    const worker = await import('../../../src/lib/repositoryWorkerClient')
    jest.spyOn(worker.RepositoryWorkerClient.prototype, 'fetchRemoteTree').mockResolvedValue({ headSha: 'abc', files: [{ path: 'a.json', sha: '1' }] })

    const res = await store.syncProject('pA')
    expect(res.metadata.headSha).toBe('abc')
    // ensure .repo-metadata.json was written into our in-memory files
    expect(files['.repo-metadata.json']).toBeDefined()
    expect(files['.repo-conflicts.json']).toBeDefined()
  })

  it('attempts push for resolved files and persists push results', async () => {
    const files: Record<string, string> = {}
    const projHandle = {
      getFileHandle: jest.fn().mockImplementation(async (name, opts) => {
        return {
          name,
          /**
           *
           */
          async getFile() { return { /**
           *
           */
          text: async () => files[name] || 'content' } },
          /**
           *
           */
          async createWritable() {
            return {
              /**
               *
               * @param content
               */
              write: async (content: string) => { files[name] = content },
              /**
               *
               */
              close: async () => {}
            }
          }
        }
      }),
      removeEntry: jest.fn().mockResolvedValue(undefined),
      rename: undefined,
      // include entries so local-only files can be enumerated
      /**
       *
       */
      async *entries() {
        yield ['foo.txt', { kind: 'file' }]
      }
    }
    const root = { getDirectoryHandle: jest.fn().mockResolvedValue({ getDirectoryHandle: jest.fn().mockResolvedValue(projHandle) }) }
    // @ts-ignore
    global.navigator = global.navigator || {}
    // @ts-ignore
    global.navigator.storage = { getDirectory: jest.fn().mockResolvedValue(root) }

    const store = useProjectStore()
    store.selectProject('pB')
    store.repoConfigs['pB'] = { provider: 'github', owner: 'o', repository: 'r', branch: 'main', token: 'ghp_dummy' }

    // mock RepositoryWorkerClient.fetchRemoteTree to return empty files
    const worker = await import('../../../src/lib/repositoryWorkerClient')
    jest.spyOn(worker.RepositoryWorkerClient.prototype, 'fetchRemoteTree').mockResolvedValue({ headSha: null, files: [] })
    // mock threeway to report foo.txt as resolved
    jest.spyOn(worker.RepositoryWorkerClient.prototype, 'threeway').mockResolvedValue({ resolved: ['foo.txt'], conflicts: {} })
    // mock pushPathsToRemote to return success
    jest.spyOn(worker.RepositoryWorkerClient.prototype, 'pushPathsToRemote').mockResolvedValue([{ path: 'foo.txt', ok: true }])

    const res = await store.syncProject('pB')
    expect(res.resolved).toContain('foo.txt')
    // ensure .repo-push.json was written
    expect(files['.repo-push.json']).toBeDefined()
    const push = JSON.parse(files['.repo-push.json'])
    expect(push.results[0].ok).toBe(true)
  })
})

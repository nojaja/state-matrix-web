/**
 * @test-type coverage
 * @purpose `projectManagerStore` の分岐カバレッジ向上
 * @policy MODIFICATION ALLOWED
 */
import { jest } from '@jest/globals'
import { setActivePinia, createPinia } from 'pinia'

let useProjectManagerStore: any

beforeAll(async () => {
  const mod = await import('../../../../src/stores/projectManagerStore')
  useProjectManagerStore = mod.useProjectManagerStore
})

beforeEach(() => {
  setActivePinia(createPinia())
  jest.clearAllMocks()
  // Ensure navigator mock is reset
  // @ts-ignore
  delete (global as any).navigator
})

describe('projectManagerStore coverage', () => {
  it('fetchAll populates projects from directory entries', async () => {
    const dir: any = {
      entries: async function* () {
        yield ['projA', { kind: 'directory' }]
        yield ['readme.md', { kind: 'file' }]
        yield ['projB', { kind: 'directory' }]
      }
    }

    const root: any = { getDirectoryHandle: jest.fn(async (name: string, opts?: any) => dir) }
    // @ts-ignore
    global.navigator = { storage: { getDirectory: jest.fn(async () => root) } }

    const store = useProjectManagerStore()
    expect(store.loading).toBe(false)
    const p = store.fetchAll()
    // loading should be true while running
    expect(store.loading).toBe(true)
    await p
    expect(store.loading).toBe(false)
    expect(Array.isArray(store.projects)).toBe(true)
    expect(store.projects).toEqual(['projA', 'projB'])
  })

  it('fetchAll handles errors and clears projects', async () => {
    const root: any = { getDirectoryHandle: jest.fn(async () => { throw new Error('fail') }) }
    // @ts-ignore
    global.navigator = { storage: { getDirectory: jest.fn(async () => root) } }

    const store = useProjectManagerStore()
    store.projects = ['x']
    await store.fetchAll()
    expect(store.projects).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('createProject validates name and creates directory then refreshes list', async () => {
    const createdNames: string[] = []
    const dir: any = {
      getDirectoryHandle: jest.fn(async (name: string, opts?: any) => {
        createdNames.push(name)
        return {}
      })
    }
    const root: any = { getDirectoryHandle: jest.fn(async () => dir) }
    // @ts-ignore
    global.navigator = { storage: { getDirectory: jest.fn(async () => root) } }

    const store = useProjectManagerStore()
    // spy fetchAll to avoid actual FS ops in this test
    const spy = jest.spyOn(store as any, 'fetchAll').mockResolvedValue(undefined)

    await store.createProject('newProj')
    expect(createdNames).toContain('newProj')
    expect(spy).toHaveBeenCalled()

    await expect(store.createProject('  ')).rejects.toThrow('名前を入力してください')
  })
})

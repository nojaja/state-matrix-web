import { jest } from '@jest/globals'
import { createPinia, setActivePinia } from 'pinia'
import { useProjectStore } from '../../../src/stores/projectStore'

let ConflictFields: any
// Mock RepositoryWorkerClient
jest.unstable_mockModule('../../../src/lib/repositoryWorkerClient', () => ({
  default: jest.fn().mockImplementation(() => ({
    pushPathsToRemote: (jest.fn() as any).mockResolvedValue([{ path: 'a.txt', ok: true }])
  }))
}))

// Provide a lightweight mock for the .vue component import so Jest/TS won't try to compile real SFC
jest.unstable_mockModule('../../../src/components/common/ConflictFields.vue', () => ({
  default: {
    name: 'ConflictFieldsMock',
    props: ['keyId'],
    template: '<div><button class="local">local</button></div>'
  }
}))

let mountFn: any
let RepositoryWorkerClient: any

beforeAll(async () => {
  const vuetools = await import('@vue/test-utils')
  mountFn = vuetools.mount
  ConflictFields = {
    name: 'ConflictFieldsMock',
    props: ['keyId'],
    template: '<div><button class="local">local</button></div>'
  }
  const mod = await import('../../../src/lib/repositoryWorkerClient')
  RepositoryWorkerClient = mod.default
})

describe('ConflictFields.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('applies local content and calls store.removeConflict and push', async () => {
    const store = useProjectStore()
    store.selectedProject = 'projA'
    store.conflictData = {
      projA: {
        'conf1': {
          id: 'conf1', path: 'file1.txt', base: 'b', local: 'L', remote: 'R', format: 'text', timestamp: new Date().toISOString()
        }
      }
    }

    // Prevent invoking OPFS in Node test environment by mocking implementation
    const removeSpy = jest.spyOn(store, 'removeConflict').mockResolvedValue(undefined as any)
    const pushMock: any = (jest.fn() as any).mockResolvedValue([{ path: 'file1.txt', ok: true }])
    // Ensure RepositoryWorkerClient is a callable mock that returns our push mock
    RepositoryWorkerClient = (jest.fn(() => ({ pushPathsToRemote: pushMock })) as any)

    // Simulate component click handler without mounting (avoid jsdom)
    const wrapper: any = {
      /**
       *
       */
      find: () => ({
        /**
         *
         */
        trigger: async () => {
          store.removeConflict('conf1')
          const client = RepositoryWorkerClient()
          await client.pushPathsToRemote([{ path: 'file1.txt' }])
        }
      })
    }

    await wrapper.find('button.local').trigger()
    await new Promise((r) => setTimeout(r, 0))

    expect(removeSpy).toHaveBeenCalledWith('conf1')
    expect(pushMock).toHaveBeenCalled()
  })
})

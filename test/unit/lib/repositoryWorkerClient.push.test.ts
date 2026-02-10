import { jest } from '@jest/globals'
import RepositoryWorkerClient from '../../../src/lib/repositoryWorkerClient'

describe('RepositoryWorkerClient.pushPathsToRemote (provider flows)', () => {
  it('github: successful update when file exists', async () => {
    const fetcher = jest.fn(async (url: any, init?: any) => {
      if (String(url).includes('/branches/')) {
        return { ok: true, status: 200, /**
         *
         */
        json: async () => ({ name: 'main' }), /**
         *
         */
        text: async () => '' }
      }
      if (String(url).includes('/contents/')) {
        if (String(url).includes('?ref=')) {
          return { ok: true, status: 200, /**
           *
           */
          json: async () => ({ sha: 'abc' }), /**
           *
           */
          text: async () => '' }
        }
        // PUT
        return { ok: true, status: 200, /**
         *
         */
        json: async () => ({}), /**
         *
         */
        text: async () => '' }
      }
      return { ok: false, status: 404, /**
       *
       */
      json: async () => ({}), /**
       *
       */
      text: async () => 'not found' }
    })

    const client = new RepositoryWorkerClient(fetcher as any)
    const cfg = { provider: 'github', owner: 'o', repository: 'r', branch: 'main', token: 'ghp_dummy' }
    const paths = [{ path: 'foo.txt', content: 'hello' }]
    const res = await client.pushPathsToRemote(cfg as any, paths as any)
    expect(res).toHaveLength(1)
    expect(res[0].ok).toBe(true)
  })

  it('github: conflict returns ok:false with conflict message', async () => {
    const fetcher = jest.fn(async (url: any, init?: any) => {
      if (String(url).includes('/branches/')) {
        return { ok: true, status: 200, /**
         *
         */
        json: async () => ({ name: 'main' }), /**
         *
         */
        text: async () => '' }
      }
      if (String(url).includes('/contents/')) {
        if (String(url).includes('?ref=')) {
          return { ok: true, status: 200, /**
           *
           */
          json: async () => ({ sha: 'abc' }), /**
           *
           */
          text: async () => '' }
        }
        // PUT returns 409
        return { ok: false, status: 409, /**
         *
         */
        json: async () => ({}), /**
         *
         */
        text: async () => 'conflict' }
      }
      return { ok: false, status: 404, /**
       *
       */
      json: async () => ({}), /**
       *
       */
      text: async () => 'not found' }
    })

    const client = new RepositoryWorkerClient(fetcher as any)
    const cfg = { provider: 'github', owner: 'o', repository: 'r', branch: 'main', token: 'ghp_dummy' }
    const paths = [{ path: 'foo.txt', content: 'hello' }]
    const res = await client.pushPathsToRemote(cfg as any, paths as any)
    expect(res).toHaveLength(1)
    expect(res[0].ok).toBe(false)
    expect(String(res[0].message)).toMatch(/conflict|precondition/i)
  })

  it('missing token yields error per path', async () => {
    const fetcher = jest.fn()
    const client = new RepositoryWorkerClient(fetcher as any)
    const cfg = { provider: 'github', owner: 'o', repository: 'r', branch: 'main' }
    const res = await client.pushPathsToRemote(cfg as any, [{ path: 'a.txt', content: 'c' } as any])
    expect(res[0].ok).toBe(false)
    expect(String(res[0].message)).toMatch(/token required/i)
  })

  it('gitlab: branch check failure yields descriptive error', async () => {
    const fetcher = jest.fn(async (url: any, init?: any) => {
      if (String(url).includes('/repository/branches/')) {
        return { ok: false, status: 404, /**
         *
         */
        json: async () => ({}), /**
         *
         */
        text: async () => 'branch missing' }
      }
      return { ok: false, status: 404, /**
       *
       */
      json: async () => ({}), /**
       *
       */
      text: async () => 'not found' }
    })

    const client = new RepositoryWorkerClient(fetcher as any)
    const cfg = { provider: 'gitlab', owner: 'o', repository: 'r', branch: 'main', token: 'glp_dummy' }
    const res = await client.pushPathsToRemote(cfg as any, [{ path: 'b.txt', content: 'c' } as any])
    expect(res[0].ok).toBe(false)
    expect(String(res[0].message)).toMatch(/gitlab branch check failed/i)
  })
})

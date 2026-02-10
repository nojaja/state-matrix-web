import { jest } from '@jest/globals'
import RepositoryWorkerClient from '../../../src/lib/repositoryWorkerClient'

describe('RepositoryWorkerClient', () => {
  it('threeway delegates to repoSync', async () => {
    const client = new RepositoryWorkerClient()
    const triples = [ { path: 'a.json', base: '{}', local: '{}', remote: '{}' } ]
    const res = await client.threeway(triples as any)
    expect(res).toHaveProperty('resolved')
    expect(res).toHaveProperty('conflicts')
  })
})

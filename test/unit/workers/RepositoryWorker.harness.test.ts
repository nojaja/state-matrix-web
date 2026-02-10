import RepositoryWorkerClient from '../../../src/lib/repositoryWorkerClient'

describe('RepositoryWorker harness (client)', () => {
  it('threeway via client returns resolved/conflicts', async () => {
    const client = new RepositoryWorkerClient()
    const triples = [
      { path: 'a.json', base: '{"x":1}', local: '{"x":2}', remote: '{"x":1}' },
      { path: 'b.txt', base: 'hello', local: 'hello', remote: 'hello' }
    ]
    const res: any = await client.threeway(triples as any)
    expect(res).toHaveProperty('resolved')
    expect(res).toHaveProperty('conflicts')
    expect(res.resolved).toEqual(expect.arrayContaining(['a.json','b.txt']))
  })

  it('detects conflict when both sides changed', async () => {
    const client = new RepositoryWorkerClient()
    const triples = [ { path: 'c.json', base: '{"x":1}', local: '{"x":2}', remote: '{"x":3}' } ]
    const res: any = await client.threeway(triples as any)
    expect(res.resolved).not.toEqual(expect.arrayContaining(['c.json']))
    expect(Object.keys(res.conflicts || {})).toContain('c.json')
  })
})

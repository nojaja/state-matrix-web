import { threeway } from '../../../src/lib/repoSync'

describe('repoSync array id-merge', () => {
  it('merges arrays by id when only one side changed', () => {
    const triples = [
      {
        path: 'items.json',
        base: JSON.stringify([{ id: '1', name: 'A' }]),
        local: JSON.stringify([{ id: '1', name: 'A2' }]),
        remote: JSON.stringify([{ id: '1', name: 'A' }])
      }
    ]
    const res = threeway(triples as any)
    expect(res.resolved).toContain('items.json')
    expect(Object.keys(res.conflicts).length).toBe(0)
  })

  it('detects conflict when both sides changed same field differently', () => {
    const triples = [
      {
        path: 'items.json',
        base: JSON.stringify([{ id: '1', name: 'A' }]),
        local: JSON.stringify([{ id: '1', name: 'A2' }]),
        remote: JSON.stringify([{ id: '1', name: 'A3' }])
      }
    ]
    const res = threeway(triples as any)
    expect(res.resolved).not.toContain('items.json')
    expect(Object.keys(res.conflicts).length).toBeGreaterThan(0)
  })

  it('treats arrays without ids as conflict when divergent', () => {
    const triples = [
      {
        path: 'items.json',
        base: JSON.stringify(['a','b']),
        local: JSON.stringify(['a','b','c']),
        remote: JSON.stringify(['a','b','d'])
      }
    ]
    const res = threeway(triples as any)
    expect(res.resolved).not.toContain('items.json')
    expect(Object.keys(res.conflicts).length).toBeGreaterThan(0)
  })
})

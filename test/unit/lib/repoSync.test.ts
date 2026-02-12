import { buildConflictsMap, threeway } from '../../../src/lib/repoSync'

describe('repoSync', () => {
  it('buildConflictsMap uses id when present', () => {
    const triples = [
      { path: 'data/item.json', base: '{}', local: '{"id":"123","name":"A"}', remote: '{"id":"123","name":"A"}' }
    ]
    const map = buildConflictsMap(triples as any)
    expect(Object.keys(map)).toContain('123')
    expect(map['123'].path).toBe('data/item.json')
  })

  it('threeway resolves simple JSON non-conflicting changes', () => {
    const triples = [
      {
        path: 'a.json',
        base: JSON.stringify({ k: 1 }),
        local: JSON.stringify({ k: 2 }),
        remote: JSON.stringify({ k: 1 })
      }
    ]
    const res = threeway(triples as any)
    expect(res.resolved).toContain('a.json')
    expect(Object.keys(res.conflicts)).toHaveLength(0)
  })

  it('threeway marks conflict when both changed same field', () => {
    const triples = [
      {
        path: 'b.json',
        base: JSON.stringify({ k: 1 }),
        local: JSON.stringify({ k: 2 }),
        remote: JSON.stringify({ k: 3 })
      }
    ]
    const res = threeway(triples as any)
    expect(res.resolved).not.toContain('b.json')
    expect(Object.keys(res.conflicts)).toContain('b.json')
  })

  it('threeway returns conflict for parse errors', () => {
    const triples = [
      { path: 'c.json', base: '{bad', local: '{bad', remote: '{bad' }
    ]
    const res = threeway(triples as any)
    expect(Object.keys(res.conflicts).length).toBeGreaterThan(0)
  })
})

import { threeway, buildConflictsMap } from '../../../src/lib/repoSync'

describe('repoSync.threeway - JSON/YAML/TEXT merge behavior', () => {
  it('resolves when only local changed from base (primitive)', () => {
    const triples = [
      { path: 'p1.json', base: JSON.stringify({ a: 1 }), local: JSON.stringify({ a: 2 }), remote: JSON.stringify({ a: 1 }) }
    ]
    const res = threeway(triples as any)
    expect(res.resolved).toContain('p1.json')
    expect(Object.keys(res.conflicts)).toHaveLength(0)
  })

  it('reports conflict when local and remote differ from base and each other (primitive)', () => {
    const triples = [
      { path: 'p2.json', base: JSON.stringify({ a: 1 }), local: JSON.stringify({ a: 2 }), remote: JSON.stringify({ a: 3 }) }
    ]
    const res = threeway(triples as any)
    expect(res.resolved).toHaveLength(0)
    expect(Object.keys(res.conflicts)).toContain('p2.json')
  })

  it('merges array-of-objects by id when all objects are present', () => {
    const base = JSON.stringify([{ id: '1', name: 'foo' }])
    const local = JSON.stringify([{ id: '1', name: 'bar' }])
    const remote = JSON.stringify([{ id: '1', name: 'foo' }])
    const triples = [{ path: 'arr.json', base, local, remote }]
    const res = threeway(triples as any)
    expect(res.resolved).toContain('arr.json')
  })

  it('text files: conflict when both changed differently', () => {
    const triples = [{ path: 'notes.txt', base: 'B', local: 'L', remote: 'R' }]
    const res = threeway(triples as any)
    expect(res.resolved).not.toContain('notes.txt')
    expect(Object.keys(res.conflicts)).toContain('notes.txt')
  })

  it('buildConflictsMap keys by id when present', () => {
    const triples = [{ path: 'item.json', base: '', local: JSON.stringify({ id: 'X', val: 1 }), remote: '' }]
    const map = buildConflictsMap(triples as any)
    expect(Object.keys(map)).toContain('X')
    const entry = map['X']
    expect(entry.path).toBe('item.json')
    expect(entry.id).toBe('X')
  })
})

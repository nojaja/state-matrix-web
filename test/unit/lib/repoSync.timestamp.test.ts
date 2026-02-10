import { mergeConflictsMaps } from '../../../src/lib/repoSync'

describe('mergeConflictsMaps timestamp behavior', () => {
  it('overwrites when incoming timestamp is newer', () => {
    const existing = {
      'id1': { id: 'id1', path: 'a.json', format: 'json', base: '', local: '', remote: '', timestamp: '2020-01-01T00:00:00.000Z', metadata: {} }
    }
    const incoming = {
      'id1': { id: 'id1', path: 'a.json', format: 'json', base: '', local: 'X', remote: '', timestamp: '2021-01-01T00:00:00.000Z', metadata: {} }
    }
    const out = mergeConflictsMaps(existing as any, incoming as any)
    expect(out['id1'].local).toBe('X')
  })

  it('keeps existing when incoming is older', () => {
    const existing = {
      'id2': { id: 'id2', path: 'b.json', format: 'json', base: '', local: 'OLD', remote: '', timestamp: '2022-01-01T00:00:00.000Z', metadata: {} }
    }
    const incoming = {
      'id2': { id: 'id2', path: 'b.json', format: 'json', base: '', local: 'NEW', remote: '', timestamp: '2021-01-01T00:00:00.000Z', metadata: {} }
    }
    const out = mergeConflictsMaps(existing as any, incoming as any)
    expect(out['id2'].local).toBe('OLD')
  })
})

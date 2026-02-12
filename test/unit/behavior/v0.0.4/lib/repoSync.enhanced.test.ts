import { threeway } from '../../../../../src/lib/repoSync'

describe('repoSync enhanced threeway', () => {
  it('merges array of objects with id when only one side changed', () => {
    const base = JSON.stringify([{ id: '1', v: 1 }, { id: '2', v: 2 }])
    const local = JSON.stringify([{ id: '1', v: 10 }, { id: '2', v: 2 }])
    const remote = JSON.stringify([{ id: '1', v: 1 }, { id: '2', v: 2 }])
    const res = threeway([{ path: 'a.json', base, local, remote }])
    expect(res.conflicts).toEqual({})
    expect(res.resolved).toContain('a.json')
  })

  it('reports conflict when both sides change same field differently', () => {
    const base = JSON.stringify([{ id: '1', v: 1 }])
    const local = JSON.stringify([{ id: '1', v: 10 }])
    const remote = JSON.stringify([{ id: '1', v: 20 }])
    const res = threeway([{ path: 'a.json', base, local, remote }])
    expect(Object.keys(res.conflicts).length).toBeGreaterThan(0)
  })

  it('parses yaml and merges similarly', () => {
    const base = '- id: 1\n  v: 1\n- id: 2\n  v: 2\n'
    const local = '- id: 1\n  v: 10\n- id: 2\n  v: 2\n'
    const remote = '- id: 1\n  v: 1\n- id: 2\n  v: 2\n'
    const res = threeway([{ path: 'b.yaml', base, local, remote }])
    expect(res.conflicts).toEqual({})
    expect(res.resolved).toContain('b.yaml')
  })
})

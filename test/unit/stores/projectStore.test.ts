// @ts-nocheck
import { jest } from '@jest/globals'
import { setActivePinia, createPinia } from 'pinia'

let useProjectStore: any

/**
 * テスト準備: モジュールを動的 import して store ファクトリを取得する
 */
beforeAll(async () => {
  const storeMod = await import('../../../src/stores/projectStore')
  useProjectStore = storeMod.useProjectStore
})

/**
 * 各テスト前処理: Pinia の初期化とローカルストレージのクリア
 */
beforeEach(() => {
  setActivePinia(createPinia())
  jest.clearAllMocks()
  try { localStorage.clear() } catch {}
})

describe('projectStore', () => {
  /**
   * テスト: fetchAll がディレクトリ一覧を取得できること
   */
  it('fetchAll lists directories', async () => {
    /**
     * entries ジェネレータ: ディレクトリエントリを列挙するモック
     */
    async function* entriesGen() {
      yield ['projA', { kind: 'directory' }]
    }
    const dir = {
      entries: entriesGen,
      getDirectoryHandle: jest.fn().mockResolvedValue(undefined)
    }
    const root = { getDirectoryHandle: jest.fn().mockResolvedValue(dir) }
    // @ts-ignore
    global.navigator = global.navigator || {}
    // @ts-ignore
    global.navigator.storage = { getDirectory: jest.fn().mockResolvedValue(root) }

    const store = useProjectStore()
    await store.fetchAll()
    expect(store.projects).toContain('projA')
  })

  /**
   * テスト: createProject がディレクトリを作成し選択状態にすること
   */
  it('createProject creates directory and selects it', async () => {
    /**
     * entries ジェネレータ（空）: createProject 用のモック
     */
    async function* entriesEmpty() { }
    const dir = {
      entries: entriesEmpty,
      getDirectoryHandle: jest.fn().mockResolvedValue(undefined)
    }
    const root = { getDirectoryHandle: jest.fn().mockResolvedValue(dir) }
    // @ts-ignore
    global.navigator = global.navigator || {}
    // @ts-ignore
    global.navigator.storage = { getDirectory: jest.fn().mockResolvedValue(root) }

    const store = useProjectStore()
    await store.createProject('newProj')
    // ensure getDirectoryHandle was called to create folder
    expect(root.getDirectoryHandle).toHaveBeenCalled()
    expect(dir.getDirectoryHandle).toHaveBeenCalledWith('newProj', { create: true })
    expect(store.selectedProject).toBe('newProj')
    if (typeof localStorage !== 'undefined') {
      expect(localStorage.getItem('selectedProject')).toBe('newProj')
    }
  })

  /**
   * テスト: selectProject が選択状態を更新し localStorage を反映すること
   */
  it('selectProject updates selection and localStorage', () => {
    const store = useProjectStore()
    store.selectProject('pX')
    expect(store.selectedProject).toBe('pX')
    if (typeof localStorage !== 'undefined') {
      expect(localStorage.getItem('selectedProject')).toBe('pX')
    }
    store.selectProject(null)
    expect(store.selectedProject).toBeNull()
    if (typeof localStorage !== 'undefined') {
      expect(localStorage.getItem('selectedProject')).toBeNull()
    }
  })
})

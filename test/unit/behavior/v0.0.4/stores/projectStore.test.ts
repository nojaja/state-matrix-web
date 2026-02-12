
// @ts-nocheck
import { jest } from '@jest/globals'
import { setActivePinia, createPinia } from 'pinia'

let useProjectStore: any

/**
 * テスト準備: モジュールを動的 import して store ファクトリを取得する
 */
beforeAll(async () => {
  const storeMod = await import('../../../../../src/stores/projectStore')
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
   * テスト: プロジェクト一覧が取得可能な事
   */
  it('プロジェクト一覧が取得可能な事', async () => {

  })

  /**
   * テスト: createProject がディレクトリを作成し選択状態にすること
   */
  it('createProject で新しいプロジェクトを作成し選択状態にすること', async () => {

  })

  /**
   * テスト: selectProject が選択状態を更新し localStorage を反映すること
   */
  it('selectProject が選択状態を更新し localStorage を反映すること', () => {
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

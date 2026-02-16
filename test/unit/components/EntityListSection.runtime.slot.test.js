const { mount } = require('@vue/test-utils')

const EntityListSection = require('../../../../src/components/common/EntityListSection.vue').default

describe('EntityListSection runtime slots', () => {
  /**
   * 正常系: 名前付きスロット `cell-name` が提供されている場合に表示されること
   */
  it('renders named slot cell-name when provided', () => {
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' }
    ]
    const rows = [{ ID: '1', name: 'Proc A', description: 'desc A', categoryId: 'c1' }]

    /**
     * 名前付きスロット `cell-name` のレンダラ
     * @param {{row: object}} param0 スロット引数
      * @returns {string}
     */
    const namedCellSlot = ({ row }) => `slot:${row.name}`;

    const wrapper = mount(EntityListSection, {
      props: {
        title: 'Test',
        columns,
        rows,
        currentCategoryId: 'c1',
        childCategories: []
      },
      slots: {
        'cell-name': namedCellSlot
      }
    })

    expect(wrapper.html()).toContain('slot:Proc A')
    expect(wrapper.html()).toContain('desc A')
  })

  /**
   * 正常系: 名前付きスロットがない場合は汎用スロット `cell` が使用されること
   */
  it('renders generic cell slot when named slot missing', () => {
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' }
    ]
    const rows = [{ ID: '1', name: 'Proc A', description: 'desc A', categoryId: 'c1' }]

    /**
     * 汎用セルスロットのレンダラ
     * @param {{row: object, columnKey: string}} param0 スロット引数
     * @returns {string}
     */
    const genericCellSlot = ({ row, columnKey }) => `generic-${columnKey}:${row[columnKey]}`;

    const wrapper = mount(EntityListSection, {
      props: {
        title: 'Test',
        columns,
        rows,
        currentCategoryId: 'c1',
        childCategories: []
      },
      slots: {
        cell: genericCellSlot
      }
    })

    expect(wrapper.html()).toContain('generic-name:Proc A')
    expect(wrapper.html()).toContain('generic-description:desc A')
  })
})

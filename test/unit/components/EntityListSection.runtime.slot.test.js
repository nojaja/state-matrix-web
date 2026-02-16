const { mount } = require('@vue/test-utils')

const EntityListSection = require('../../../../src/components/common/EntityListSection.vue').default

describe('EntityListSection runtime slots', () => {
  it('renders named slot cell-name when provided', () => {
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' }
    ]
    const rows = [{ ID: '1', name: 'Proc A', description: 'desc A', categoryId: 'c1' }]

    const wrapper = mount(EntityListSection, {
      props: {
        title: 'Test',
        columns,
        rows,
        currentCategoryId: 'c1',
        childCategories: []
      },
      slots: {
        'cell-name': ({ row }) => `slot:${row.name}`
      }
    })

    expect(wrapper.html()).toContain('slot:Proc A')
    expect(wrapper.html()).toContain('desc A')
  })

  it('renders generic cell slot when named slot missing', () => {
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' }
    ]
    const rows = [{ ID: '1', name: 'Proc A', description: 'desc A', categoryId: 'c1' }]

    const wrapper = mount(EntityListSection, {
      props: {
        title: 'Test',
        columns,
        rows,
        currentCategoryId: 'c1',
        childCategories: []
      },
      slots: {
        cell: ({ row, columnKey }) => `generic-${columnKey}:${row[columnKey]}`
      }
    })

    expect(wrapper.html()).toContain('generic-name:Proc A')
    expect(wrapper.html()).toContain('generic-description:desc A')
  })
})

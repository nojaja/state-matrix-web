import { describe, it, expect } from '@jest/globals'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('EntityListSection: template slot contract', () => {
  const file = resolve(process.cwd(), 'src/components/common/EntityListSection.vue')
  const src = readFileSync(file, 'utf-8')

  it('uses dynamic named slot for cells', () => {
    // Expect slot to be invoked with a dynamic name binding like :name="`cell-${column.key}`"
    expect(src).toMatch(/<slot\s+:name=\"`cell-\$\{column\.key\}`\"/) 
  })

  it('provides fallback text using resolveCellText', () => {
    expect(src).toMatch(/resolveCellText\(row, column\.key\)/)
  })
})

import { describe, it, expect } from 'vitest'
import { ContextAssembler } from '../../src/brain/context.js'
import type { PromptFragment } from '../../src/model/fragments.js'

describe('ContextAssembler', () => {
  const mockFragments: PromptFragment[] = [
    { id: 1, label: '系统提示词', content: 'You are Claudio DJ.' },
    { id: 2, label: '用户品味料', content: 'Likes jazz.' },
    { id: 3, label: '环境注入', content: 'Weather: rainy' },
    { id: 4, label: '已检索记忆', content: 'Played: Song A' },
    { id: 5, label: '用户输入', content: 'Play jazz' },
    { id: 6, label: '执行轨迹', content: 'Scheduler: morning' },
  ]

  it('should assemble all 6 fragments into a single prompt', () => {
    const result = ContextAssembler.assemble(mockFragments)
    expect(result).toContain('You are Claudio DJ.')
    expect(result).toContain('Likes jazz.')
    expect(result).toContain('Weather: rainy')
    expect(result).toContain('Played: Song A')
    expect(result).toContain('Play jazz')
    expect(result).toContain('Scheduler: morning')
  })

  it('should use fragment labels as section headers', () => {
    const result = ContextAssembler.assemble(mockFragments)
    expect(result).toContain('## 系统提示词')
    expect(result).toContain('## 用户品味料')
    expect(result).toContain('## 环境注入')
    expect(result).toContain('## 已检索记忆')
    expect(result).toContain('## 用户输入')
    expect(result).toContain('## 执行轨迹')
  })

  it('should handle empty fragments gracefully', () => {
    const result = ContextAssembler.assemble([])
    expect(result).toBe('')
  })

  it('should preserve order of fragments', () => {
    const result = ContextAssembler.assemble(mockFragments)
    const sysIdx = result.indexOf('系统提示词')
    const userIdx = result.indexOf('用户品味料')
    const envIdx = result.indexOf('环境注入')
    expect(sysIdx).toBeLessThan(userIdx)
    expect(userIdx).toBeLessThan(envIdx)
  })

  it('should handle fragments with empty content', () => {
    const fragments: PromptFragment[] = [
      { id: 1, label: '系统提示词', content: 'sys' },
      { id: 2, label: '用户品味料', content: '' },
      { id: 3, label: '环境注入', content: '' },
      { id: 4, label: '已检索记忆', content: '' },
      { id: 5, label: '用户输入', content: '' },
      { id: 6, label: '执行轨迹', content: '' },
    ]
    const result = ContextAssembler.assemble(fragments)
    expect(result).toContain('## 系统提示词')
    expect(result).toContain('sys')
  })
})

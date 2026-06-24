// FragmentsBuilder — assembles the 6 prompt fragments for Claude

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { PlayRecord } from '../brain/state.db.js'

export interface PromptFragment {
  id: number
  label: string
  content: string
}

export interface BuildOptions {
  userMessage?: string
  recentPlays?: PlayRecord[]
  weather?: string
  now?: string
  schedulerInfo?: string
}

export class FragmentsBuilder {
  private readonly cachedSystemPrompt: string
  private readonly cachedUserTaste: string

  constructor(private readonly rootDir: string) {
    // Pre-read static prompt fragments at construction time to avoid
    // synchronous disk I/O on every forward pass (hot path).
    const personaPath = join(this.rootDir, 'prompts', 'dj-persona.md')
    this.cachedSystemPrompt = existsSync(personaPath)
      ? readFileSync(personaPath, 'utf-8').trim()
      : ''

    const userDir = join(this.rootDir, 'user')
    const parts: string[] = []
    for (const file of ['taste.md', 'routines.md', 'mood-rules.md']) {
      const path = join(userDir, file)
      if (existsSync(path)) {
        parts.push(`## ${file}\n${readFileSync(path, 'utf-8').trim()}`)
      }
    }
    this.cachedUserTaste = parts.join('\n\n')
  }

  build(opts: BuildOptions = {}): PromptFragment[] {
    return [
      this.fragment1_SystemPrompt(),
      this.fragment2_UserTaste(),
      this.fragment3_Environment(opts.weather, opts.now),
      this.fragment4_Memory(opts.recentPlays),
      this.fragment5_UserInput(opts.userMessage),
      this.fragment6_Execution(opts.schedulerInfo),
    ]
  }

  // ① 系统提示词
  private fragment1_SystemPrompt(): PromptFragment {
    return { id: 1, label: '系统提示词', content: this.cachedSystemPrompt }
  }

  // ② 用户品味料
  private fragment2_UserTaste(): PromptFragment {
    return { id: 2, label: '用户品味料', content: this.cachedUserTaste }
  }

  // ③ 环境注入
  private fragment3_Environment(weather?: string, now?: string): PromptFragment {
    const parts: string[] = []
    if (weather) parts.push(`天气: ${weather}`)
    if (now) parts.push(`当前时间: ${now}`)
    return { id: 3, label: '环境注入', content: parts.join('\n') }
  }

  // ④ 已检索记忆
  private fragment4_Memory(recentPlays?: PlayRecord[]): PromptFragment {
    if (!recentPlays || recentPlays.length === 0) {
      return { id: 4, label: '已检索记忆', content: '（暂无播放记录）' }
    }
    const lines = recentPlays.map(
      (p) => `- ${p.title} — ${p.artist}`
    )
    return { id: 4, label: '已检索记忆', content: lines.join('\n') }
  }

  // ⑤ 用户输入
  private fragment5_UserInput(message?: string): PromptFragment {
    return { id: 5, label: '用户输入', content: message ?? '' }
  }

  // ⑥ 执行轨迹
  private fragment6_Execution(schedulerInfo?: string): PromptFragment {
    const parts: string[] = []
    if (schedulerInfo) parts.push(`调度器: ${schedulerInfo}`)
    return { id: 6, label: '执行轨迹', content: parts.join('\n') }
  }
}

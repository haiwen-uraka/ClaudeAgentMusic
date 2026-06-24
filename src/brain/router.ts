// Router — classifies user input into intent routes

export type Route =
  | { kind: 'ncm-search'; query: string }
  | { kind: 'ncm-play'; songId: string }
  | { kind: 'ncm-next' }
  | { kind: 'ncm-pause' }
  | { kind: 'chat'; message: string }
  | { kind: 'weather'; city?: string }
  | { kind: 'plan' }

export class Router {
  static route(input: string): Route {
    const trimmed = input.trim()

    if (!trimmed) {
      return { kind: 'chat', message: '' }
    }

    // Simple commands → NCM
    if (/^播放/.test(trimmed)) {
      const query = trimmed.replace(/^播放\s*/, '')
      return { kind: 'ncm-search', query }
    }

    if (/^下一首$|^next$/i.test(trimmed)) {
      return { kind: 'ncm-next' }
    }

    if (/^暂停$|^pause$/i.test(trimmed)) {
      return { kind: 'ncm-pause' }
    }

    // Weather (match at start to avoid false positives in mid-sentence)
    if (/^天气|^weather|^温度|^下雨/.test(trimmed)) {
      return { kind: 'weather' }
    }

    // Schedule / plan (match at start to avoid false positives)
    if (/^安排|^日程|^计划|^schedule|^plan/.test(trimmed)) {
      return { kind: 'plan' }
    }

    // Default: chat (Claude handles it)
    return { kind: 'chat', message: trimmed }
  }
}

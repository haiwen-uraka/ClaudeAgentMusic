import { describe, it, expect } from 'vitest'
import { Router, Route } from '../../src/brain/router.js'

describe('Router', () => {
  it('should route simple play command to ncm-search', () => {
    const result = Router.route('播放晴天')
    expect(result.kind).toBe('ncm-search')
    expect((result as any).query).toBe('晴天')
  })

  it('should route play with artist to ncm-search', () => {
    const result = Router.route('播放周杰伦的晴天')
    expect(result.kind).toBe('ncm-search')
    expect((result as any).query).toBe('周杰伦的晴天')
  })

  it('should route next command to ncm-next', () => {
    const result = Router.route('下一首')
    expect(result.kind).toBe('ncm-next')
  })

  it('should route English "next" to ncm-next', () => {
    const result = Router.route('next')
    expect(result.kind).toBe('ncm-next')
  })

  it('should route pause command to ncm-pause', () => {
    const result = Router.route('暂停')
    expect(result.kind).toBe('ncm-pause')
  })

  it('should route English "pause" to ncm-pause', () => {
    const result = Router.route('pause')
    expect(result.kind).toBe('ncm-pause')
  })

  it('should route weather command at start to weather', () => {
    const result = Router.route('天气怎么样')
    expect(result.kind).toBe('weather')
  })

  it('should route rain mention at start to weather', () => {
    const result = Router.route('下雨天听什么')
    expect(result.kind).toBe('weather')
  })

  it('should route casual rainy mention in sentence to chat', () => {
    // "适合下雨天听的歌" contains 下雨 but should NOT route to weather
    const result = Router.route('帮我找点适合下雨天听的歌')
    expect(result.kind).toBe('chat')
  })

  it('should route schedule command at start to plan', () => {
    const result = Router.route('安排我今天')
    expect(result.kind).toBe('plan')
  })

  it('should route English "schedule" to plan', () => {
    const result = Router.route('schedule my day')
    expect(result.kind).toBe('plan')
  })

  it('should route casual schedule mention in sentence to chat', () => {
    // "我今天有什么安排" contains 安排 but should go to chat — Claude handles it
    const result = Router.route('我今天有什么安排')
    expect(result.kind).toBe('chat')
  })

  it('should route complex/natural language to chat', () => {
    const result = Router.route('给我讲个笑话')
    expect(result.kind).toBe('chat')
    expect((result as any).message).toBe('给我讲个笑话')
  })

  it('should route general recommendation to chat', () => {
    const result = Router.route('推荐点好听的歌')
    expect(result.kind).toBe('chat')
    expect((result as any).message).toBe('推荐点好听的歌')
  })

  it('should handle empty string as chat', () => {
    const result = Router.route('')
    expect(result.kind).toBe('chat')
    expect((result as any).message).toBe('')
  })
})

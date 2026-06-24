// Configuration schema and defaults

export const VERSION = '0.1.0'

export interface Config {
  port: number
  host: string
  ncmApiUrl: string
  fishAudioApiKey: string
  weatherApiKey: string
  feishuAppId: string
  feishuAppSecret: string
}

export const DEFAULT_CONFIG: Config = {
  port: 8080,
  host: '0.0.0.0',
  ncmApiUrl: 'http://localhost:3000',
  fishAudioApiKey: '',
  weatherApiKey: '',
  feishuAppId: '',
  feishuAppSecret: '',
}

export function loadConfig(): Config {
  const env = process.env as Record<string, string | undefined>

  const rawPort = env.PORT ?? String(DEFAULT_CONFIG.port)
  const port = Number(rawPort)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT "${rawPort}": must be a number between 1 and 65535`)
  }

  return {
    port,
    host: env.HOST ?? DEFAULT_CONFIG.host,
    ncmApiUrl: env.NCM_API_URL ?? DEFAULT_CONFIG.ncmApiUrl,
    fishAudioApiKey: env.FISH_AUDIO_API_KEY ?? DEFAULT_CONFIG.fishAudioApiKey,
    // weatherApiKey is loaded from env for future weather integration
  // (not yet consumed by the weather service — reserved for Phase 4+)
  weatherApiKey: env.WEATHER_API_KEY ?? DEFAULT_CONFIG.weatherApiKey,
    feishuAppId: env.FEISHU_APP_ID ?? DEFAULT_CONFIG.feishuAppId,
    feishuAppSecret: env.FEISHU_APP_SECRET ?? DEFAULT_CONFIG.feishuAppSecret,
  }
}

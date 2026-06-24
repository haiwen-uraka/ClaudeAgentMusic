// ============================================================
// Claudio PWA — Main Application
// ============================================================

const API_BASE = '/api'
const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/stream`
const MAX_MSG_LENGTH = 10240

// --- State ---
const state = {
  currentTrack: null,
  queue: [],
  isPlaying: false,
  ws: null,
  listeners: 1,
}

// --- DOM Refs ---
const $ = (sel) => document.querySelector(sel)
const $$ = (sel) => document.querySelectorAll(sel)

const dom = {
  clock: $('#clock'),
  clockDay: $('#clock-day'),
  clockDate: $('#clock-date'),
  equalizer: $('#equalizer'),
  npTitle: $('#np-title'),
  npArtist: $('#np-artist'),
  npStatus: $('#np-status'),
  npfTrack: $('#npf-track'),
  progressFill: $('#progress-fill'),
  progressBar: $('#progress-bar'),
  timeCurrent: $('#time-current'),
  timeTotal: $('#time-total'),
  btnPlayPause: $('#btn-play-pause'),
  chatMessages: $('#chat-messages'),
  chatInput: $('#chat-input'),
  queueCount: $('#queue-count'),
  listenerCount: $('#listener-count'),
  profileOverlay: $('#profile-overlay'),
  headerAvatar: $('#header-avatar'),
  audio: $('#audio-player'),
  volume: $('#volume'),
}

// ============================================================
// Clock
// ============================================================
function updateClock() {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  if (dom.clock) dom.clock.textContent = `${h}:${m}`

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  if (dom.clockDay) dom.clockDay.textContent = days[now.getDay()]
  if (dom.clockDate) dom.clockDate.textContent = `${now.getDate()} · ${months[now.getMonth()]} · ${now.getFullYear()}`
}

// ============================================================
// Theme
// ============================================================
function initTheme() {
  const saved = localStorage.getItem('claudio-theme') || 'dark'
  document.documentElement.setAttribute('data-theme', saved)
  $$('.theme-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === saved)
  })
}

$$('.theme-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const theme = btn.dataset.theme
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('claudio-theme', theme)
    $$('.theme-btn').forEach((b) => b.classList.remove('active'))
    btn.classList.add('active')
  })
})

// ============================================================
// Navigation / Profile Modal
// ============================================================
function openProfile() {
  dom.profileOverlay?.classList.add('active')
  document.body.style.overflow = 'hidden'
}

function closeProfile() {
  dom.profileOverlay?.classList.remove('active')
  document.body.style.overflow = ''
}

dom.headerAvatar?.addEventListener('click', openProfile)
$('#profile-close')?.addEventListener('click', closeProfile)
dom.profileOverlay?.addEventListener('click', (e) => {
  if (e.target === dom.profileOverlay) closeProfile()
})

// ============================================================
// Format time
// ============================================================
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ============================================================
// Audio Controls
// ============================================================
function setPlaying(playing) {
  state.isPlaying = playing
  if (dom.btnPlayPause) dom.btnPlayPause.textContent = playing ? '⏸' : '▶'
  if (dom.npStatus) dom.npStatus.textContent = playing ? 'PLAYING' : 'PAUSED'
  if (dom.equalizer) {
    playing ? dom.equalizer.classList.remove('paused') : dom.equalizer.classList.add('paused')
  }
}

async function togglePlay() {
  if (!state.currentTrack) {
    await fetchNow()
    return
  }

  if (!dom.audio.src || dom.audio.src === location.href) {
    await playCurrentTrack()
    return
  }

  try {
    if (dom.audio.paused) {
      await dom.audio.play()
      setPlaying(true)
    } else {
      dom.audio.pause()
      setPlaying(false)
    }
  } catch (e) {
    console.error('Play toggle error:', e)
  }
}

dom.btnPlayPause?.addEventListener('click', togglePlay)

// Progress bar interaction
let isDragging = false

function getProgressPct(e) {
  const rect = dom.progressBar.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
}

dom.progressBar?.addEventListener('click', (e) => {
  if (!dom.audio.duration) return
  dom.audio.currentTime = getProgressPct(e) * dom.audio.duration
})

dom.progressBar?.addEventListener('mousedown', (e) => {
  if (!dom.audio.duration) return
  isDragging = true
  dom.audio.currentTime = getProgressPct(e) * dom.audio.duration
})

document.addEventListener('mousemove', (e) => {
  if (!isDragging || !dom.audio.duration) return
  dom.audio.currentTime = getProgressPct(e) * dom.audio.duration
  updateProgress()
})

document.addEventListener('mouseup', () => { isDragging = false })

// Touch
dom.progressBar?.addEventListener('touchstart', (e) => {
  if (!dom.audio.duration) return
  isDragging = true
  dom.audio.currentTime = getProgressPct(e) * dom.audio.duration
}, { passive: true })

document.addEventListener('touchmove', (e) => {
  if (!isDragging || !dom.audio.duration) return
  dom.audio.currentTime = getProgressPct(e) * dom.audio.duration
  updateProgress()
}, { passive: true })

document.addEventListener('touchend', () => { isDragging = false })

dom.audio?.addEventListener('timeupdate', updateProgress)

function updateProgress() {
  if (!dom.audio.duration || isDragging) return
  const pct = (dom.audio.currentTime / dom.audio.duration) * 100
  if (dom.progressFill) dom.progressFill.style.width = `${pct}%`
  if (dom.timeCurrent) dom.timeCurrent.textContent = formatTime(dom.audio.currentTime)
  if (dom.timeTotal) dom.timeTotal.textContent = formatTime(dom.audio.duration)
}

dom.audio?.addEventListener('loadedmetadata', () => {
  if (dom.timeTotal) dom.timeTotal.textContent = formatTime(dom.audio.duration)
})

dom.audio?.addEventListener('ended', async () => {
  await playNext()
})

// ============================================================
// Playback
// ============================================================
async function playCurrentTrack() {
  if (!state.currentTrack) return
  await playTrack(state.currentTrack)
}

async function playTrack(track) {
  state.currentTrack = track
  if (dom.npTitle) dom.npTitle.textContent = track.title || 'Unknown'
  if (dom.npArtist) dom.npArtist.textContent = (track.artist || 'Unknown').toUpperCase()
  if (dom.npfTrack) dom.npfTrack.textContent = `${track.title || 'Unknown'} - ${track.artist || 'Unknown'}`
  if (dom.queueCount) dom.queueCount.textContent = `${state.queue.length} TRACKS`

  try {
    dom.audio.pause()
    const res = await fetch(`${API_BASE}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songId: track.id,
        title: track.title,
        artist: track.artist,
      }),
    })
    const data = await res.json()

    if (data.url) {
      dom.audio.src = data.url
      dom.audio.volume = dom.volume ? Number(dom.volume.value) / 100 : 0.8

      await new Promise((resolve) => {
        const onReady = () => { dom.audio.removeEventListener('canplay', onReady); resolve(true) }
        const onErr = () => { dom.audio.removeEventListener('canplay', onReady); resolve(true) }
        dom.audio.addEventListener('canplay', onReady)
        dom.audio.addEventListener('error', onErr)
        setTimeout(resolve, 5000)
      })

      await dom.audio.play()
      setPlaying(true)
    } else {
      setPlaying(false)
      if (dom.npTitle) dom.npTitle.textContent = `${track.title || 'Unknown'} (无法播放)`
    }
  } catch (e) {
    console.error('Failed to play track:', e)
    setPlaying(false)
  }
}

async function playNext() {
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '下一首' }),
    })
    const data = await res.json()
    if (data.play && data.play.length > 0) {
      await playTrack(data.play[0])
    }
  } catch (e) {
    console.error('Failed to get next track:', e)
  }
}

async function playPrev() {
  try {
    const res = await fetch(`${API_BASE}/next?count=20`)
    const data = await res.json()
    const queue = data.queue || []
    if (queue.length > 1) {
      await playTrack(queue[1])
    }
  } catch (e) {
    console.error('Failed to play previous:', e)
  }
}

$('#btn-next')?.addEventListener('click', playNext)
$('#btn-prev')?.addEventListener('click', playPrev)
$('#btn-stop')?.addEventListener('click', () => {
  dom.audio.pause()
  dom.audio.currentTime = 0
  setPlaying(false)
})

// Volume
dom.volume?.addEventListener('input', () => {
  dom.audio.volume = Number(dom.volume.value) / 100
})

// Heart / Fav / Hide buttons (visual feedback)
$('#btn-heart')?.addEventListener('click', function () {
  this.textContent = this.textContent === '♡' ? '♥' : '♡'
  this.style.color = this.textContent === '♥' ? 'var(--danger)' : ''
})

$('#btn-fav')?.addEventListener('click', function () {
  this.style.color = this.style.color === 'var(--accent)' ? '' : 'var(--accent)'
})

// ============================================================
// API: Now Playing
// ============================================================
async function fetchNow() {
  try {
    const res = await fetch(`${API_BASE}/now`)
    const data = await res.json()
    if (data.nowPlaying) {
      updateNowPlaying(data.nowPlaying)
    }
    if (data.queue) {
      state.queue = data.queue
      if (dom.queueCount) dom.queueCount.textContent = `${data.queue.length} TRACKS`
    }
  } catch (e) {
    console.error('fetchNow error:', e)
  }
}

function updateNowPlaying(track) {
  state.currentTrack = track
  if (dom.npTitle) dom.npTitle.textContent = track.title || 'Unknown'
  if (dom.npArtist) dom.npArtist.textContent = (track.artist || 'Unknown').toUpperCase()
  if (dom.npfTrack) dom.npfTrack.textContent = `${track.title || 'Unknown'} - ${track.artist || 'Unknown'}`
  if (track.progress !== undefined && dom.progressFill) {
    dom.progressFill.style.width = `${track.progress * 100}%`
  }
}

// ============================================================
// Chat
// ============================================================
function appendMessage(role, content, meta) {
  const wrapper = document.createElement('div')
  wrapper.className = `chat-msg ${role}`

  const avatar = document.createElement('img')
  avatar.className = 'chat-msg-avatar'
  avatar.src = role === 'assistant'
    ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudio'
    : 'https://api.dicebear.com/7.x/avataaars/svg?seed=MMGUO'
  avatar.alt = role

  const body = document.createElement('div')

  const bubble = document.createElement('div')
  bubble.className = 'chat-msg-bubble'
  bubble.textContent = content

  const timeEl = document.createElement('div')
  timeEl.className = 'chat-msg-meta'
  const now = new Date()
  timeEl.textContent = meta || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  body.appendChild(bubble)
  body.appendChild(timeEl)
  wrapper.appendChild(avatar)
  wrapper.appendChild(body)
  dom.chatMessages?.appendChild(wrapper)
  dom.chatMessages?.scrollIntoView({ behavior: 'smooth', block: 'end' })
}

async function sendMessage() {
  const msg = dom.chatInput?.value?.trim()
  if (!msg || msg.length > MAX_MSG_LENGTH) return

  appendMessage('user', msg)
  if (dom.chatInput) dom.chatInput.value = ''

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg }),
    })
    const data = await res.json()
    if (data.say) {
      appendMessage('assistant', data.say)
    }
    if (data.nowPlaying) {
      updateNowPlaying(data.nowPlaying)
      if (data.play && data.play.length > 0) {
        state.queue = data.play
        if (dom.queueCount) dom.queueCount.textContent = `${data.play.length} TRACKS`
      }
    }
    // Auto-play if a track was returned
    if (data.play && data.play.length > 0 && !state.isPlaying) {
      await playTrack(data.play[0])
    }
  } catch (e) {
    appendMessage('assistant', '连接失败，请检查服务器')
  }
}

$('#send-btn')?.addEventListener('click', sendMessage)
dom.chatInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
})

// Mic button (placeholder — would need MediaRecorder API)
$('#mic-btn')?.addEventListener('click', () => {
  appendMessage('user', '🎤 语音输入...')
  setTimeout(() => {
    appendMessage('assistant', '语音识别功能即将上线，敬请期待！')
  }, 800)
})

// ============================================================
// WebSocket
// ============================================================
function connectWS() {
  try {
    state.ws = new WebSocket(WS_URL)

    state.ws.onopen = () => {
      console.log('WS connected')
      if (dom.profileOverlay) {
        // Show connected dot in footer
      }
    }

    state.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'assistant' && msg.say) {
          appendMessage('assistant', msg.say)
        }
        if (msg.type === 'nowPlaying' && msg.track) {
          updateNowPlaying(msg.track)
        }
        if (msg.type === 'queueUpdate' && msg.queue) {
          state.queue = msg.queue
          if (dom.queueCount) dom.queueCount.textContent = `${msg.queue.length} TRACKS`
        }
        if (msg.type === 'error') {
          appendMessage('assistant', `错误: ${msg.message}`)
        }
      } catch {
        // ignore
      }
    }

    state.ws.onclose = () => {
      setTimeout(connectWS, 3000)
    }

    state.ws.onerror = () => {
      state.ws?.close()
    }
  } catch (e) {
    console.error('WS connection error:', e)
    setTimeout(connectWS, 3000)
  }
}

// ============================================================
// Search
// ============================================================
const searchInput = $('#search-input')
const searchBtn = $('#search-btn')
const searchResults = $('#search-results')

async function doSearch() {
  const query = searchInput?.value?.trim()
  if (!query) return

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    renderSearchResults(data.results || [])
  } catch {
    if (searchResults) searchResults.innerHTML = '<div class="search-result-item" style="color:var(--text-muted)">搜索失败</div>'
  }
}

function renderSearchResults(results) {
  if (!searchResults) return
  searchResults.innerHTML = ''
  if (results.length === 0) {
    searchResults.innerHTML = '<div class="search-result-item" style="color:var(--text-muted)">未找到结果</div>'
    return
  }

  for (const song of results) {
    const item = document.createElement('div')
    item.className = 'search-result-item'

    const info = document.createElement('div')
    info.className = 'search-result-info'

    const titleEl = document.createElement('div')
    titleEl.className = 'search-result-title'
    titleEl.textContent = song.title

    const artistEl = document.createElement('div')
    artistEl.className = 'search-result-artist'
    artistEl.textContent = song.artist || '未知歌手'

    info.appendChild(titleEl)
    info.appendChild(artistEl)

    const playBtn = document.createElement('button')
    playBtn.className = 'search-result-play'
    playBtn.textContent = '播放'
    playBtn.addEventListener('click', () => {
      playTrack({ id: song.id, title: song.title, artist: song.artist })
      searchResults.innerHTML = ''
      searchInput.value = ''
    })

    item.appendChild(info)
    item.appendChild(playBtn)
    searchResults.appendChild(item)
  }
}

searchBtn?.addEventListener('click', doSearch)
searchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch()
})

// ============================================================
// Settings
// ============================================================
const settingFishKey = $('#setting-fish-key')
const settingWeatherKey = $('#setting-weather-key')
const settingTts = $('#setting-tts')

function loadSettings() {
  try {
    const saved = localStorage.getItem('claudio-settings')
    if (!saved) return
    const s = JSON.parse(saved)
    if (s.fishKey && settingFishKey) settingFishKey.value = s.fishKey
    if (s.weatherKey && settingWeatherKey) settingWeatherKey.value = s.weatherKey
    if (typeof s.ttsEnabled === 'boolean' && settingTts) settingTts.checked = s.ttsEnabled
  } catch {
    // ignore
  }
}

$('#settings-save')?.addEventListener('click', () => {
  const settings = {
    fishKey: settingFishKey?.value || '',
    weatherKey: settingWeatherKey?.value || '',
    ttsEnabled: settingTts?.checked || false,
  }
  localStorage.setItem('claudio-settings', JSON.stringify(settings))
  const btn = $('#settings-save')
  if (btn) {
    const orig = btn.textContent
    btn.textContent = '已保存 ✓'
    setTimeout(() => { btn.textContent = orig }, 1500)
  }
})

// ============================================================
// Init
// ============================================================
function init() {
  initTheme()
  loadSettings()
  updateClock()
  setInterval(updateClock, 10000)

  // Volume
  if (dom.audio && dom.volume) {
    dom.audio.volume = Number(dom.volume.value) / 100
  }

  // Set initial equalizer state
  dom.equalizer?.classList.add('paused')

  fetchNow()
  connectWS()

  // Simulate a welcome message from Claudio
  setTimeout(() => {
    appendMessage('assistant', '这是 Claudio。It\'s late on a Monday, and here\'s a song that moves with your breath. Back in 1971, David Gates picked up a nylon-string guitar and let every line end in a whisper — you\'ll feel yourself lift off the ground a little. This one\'s called If. After a long day with Claude Code, just breathe.')
  }, 500)
}

init()

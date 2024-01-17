/**
 * @file a simple audio library based on WebAudio (may fallback to HTML5 audio)
 * @refer https://github.com/goldfire/howler.js/blob/master/src/howler.core.js
 */

function noop() {}

function isString(val: unknown): boolean {
  return typeof val == 'string'
}

let loadingCache: { [key: string]: boolean } = {}

class AudioManager {
  private _sources: AudioSource[] = []

  counter = 0
  cache: { [key: string]: AudioBuffer } = {}
  spriteMap: { [k: string]: number } = {}

  masterGain: GainNode
  ctx: AudioContext

  globalTime = 0

  constructor() {
    this.createContext()
  }

  createContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    this.ctx = new AudioContext()

    this.masterGain = this.ctx.createGain()
    // this.masterGain!.gain.value = 1
    this.masterGain!.connect(this.ctx!.destination)
  }

  mute(muted: boolean) {
    this.masterGain.gain.value = muted ? 0 : 1
  }
  pause() {
    this._sources.forEach((source: AudioSource) => {
      source.pause()
    })
  }
  play() {
    this._sources.forEach((source: AudioSource) => {
      Object.keys(source._sprite).forEach((spriteName) => {
        const idOrName =
          this.spriteMap[spriteName] && source.playing(this.spriteMap[spriteName])
            ? this.spriteMap[spriteName]
            : spriteName

        const soundId = source.play(idOrName)

        if (soundId) {
          this.spriteMap[spriteName] = soundId
        }
      })
    })
  }
  playSprite(name: string) {
    const source = this._sources.find(s => Object.keys(s._sprite).includes(name))
    source?.playSprite(name)
  }
  addSource(sourceOptions: IAudioSourceOption | IAudioSourceOption[]) {
    if (Array.isArray(sourceOptions)) {
      return sourceOptions.map((item) => this.addSource(item)).filter(Boolean)
    }

    if (!sourceOptions.src) return

    const ins = new AudioSource({
      ...sourceOptions,
      manager: this,
    })

    this._sources.push(ins)

    return ins
  }

  private _events = {}
  on(name, fn) {
    if (!this._events[name]) this._events[name] = []
    this._events[name].push(fn)
  }
  emit(name, data) {
    this._events[name].forEach(fn => fn(data))
  }
}

type ISprite = { [k: string]: [number, number, number] }

interface IAudioSourceOption {
  src: string
  manager: AudioManager
  sprite: ISprite
}

class AudioSource {
  _duration = 0
  _state = 'unloaded'
  _sounds: Sound[] = []

  _src: string
  _sprite: ISprite
  _manager: AudioManager

  constructor(options: IAudioSourceOption) {
    this._src = options.src
    this._sprite = options.sprite || {}
    this._manager = options.manager

    new Sound(this)
    this.loadBuffer()
  }

  //
  private onLoading() {
    this._state = 'loading'
    this._manager.emit('source:startLoad', {
      src: this._src,
    })
  }
  private onLoad() {
    this._state = 'loaded'
    this._manager.emit('source:load', {
      src: this._src,
      duration: this._duration,
    })
  }
  private onError(e: Error) {
    this._state = 'error'
    this._manager.emit('source:loadError', e)
  }
  private finishLoad(buffer: AudioBuffer) {
    this._duration = buffer.duration * 1000

    if (!Object.keys(this._sprite).length) {
      this._sprite = { __default: [0, 0, this._duration] }
    }

    this.onLoad()
  }
  private loadBuffer() {
    const url = this._src

    this.onLoading()

    const cache = this._manager.cache
    if (cache[url]) {
      console.log('load from cache', url)
      this.finishLoad(cache[url])
      return
    }

    if (loadingCache[url]) {
      console.log('loading repeat', url)
      return
    }

    loadingCache[url] = true

    // load buffer from url
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'arraybuffer'
    xhr.onload = () => {
      if (xhr.status !== 200) {
        this.onError(new Error('failed to fetch url'))
        return
      }

      const error = () => {
        this.onError(new Error('decodeAudioData failed'))
      }
      const success = (buffer: AudioBuffer) => {
        if (buffer) {
          this._manager.cache[url] = buffer
          this.finishLoad(buffer)
        } else {
          error()
        }
      }
      this._manager.ctx.decodeAudioData(xhr.response).then(success).catch(error).finally(() => {
        loadingCache[url] = false
      })
    }
    xhr.onerror = () => {
      loadingCache[url] = false
      this.onError(new Error('xhr error'))
      return
    }
    xhr.send()
  }

  //
  play(spriteName?: number | string) {
    if (this._state != 'loaded') {
      this._manager.emit('source:playError', 'sound is not loaded')
      return
    }

    if (typeof spriteName == 'string' && !this._sprite[spriteName]) {
      this._manager.emit('source:playError', 'spriteName is invalid')
      return
    }

    let id
    if (typeof spriteName == 'number') {
      id = spriteName
      spriteName = ''
    }
    //
    else if (typeof spriteName == 'undefined') {
      spriteName = '__default'
    }

    let sound
    if (id) {
      sound = this.findSoundById(id)

      if (!sound) {
        this._manager.emit('source:playError', 'sound is not found')
        return
      }

      spriteName = sound._sprite || '__default'
    }

    const isPlayingMe = this._sounds.find((o: Sound) => !o._paused && !o._ended && o._sprite == spriteName)

    const segment = this._sprite[spriteName as string]
    // 未开始、或者 已经结束
    const isNotMyTurn = this._manager.globalTime < segment[0] || this._manager.globalTime >= segment[0] + segment[2]

    //
    if (!isPlayingMe && isNotMyTurn) {
      return
    }

    sound = isPlayingMe || this.findInactiveSound()
    sound._sprite = spriteName

    if (isNotMyTurn) {
      this.ended(sound)
      return sound._id
    }

    if (!sound._paused) {
      return sound._id
    }

    // @see: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start
    const whenPlay = 0
    const start = segment[1] / 1000
    const stop = (segment[1] + segment[2]) / 1000

    const seekPosition = start + (this._manager.globalTime - segment[0]) / 1000
    const duration = Math.max(0, stop - seekPosition)

    sound._ended = false
    sound._paused = false
    sound._whenPlay = whenPlay
    sound._seek = seekPosition
    sound._duration = duration

    sound._bufferNode = this._manager.ctx.createBufferSource()
    sound._bufferNode.buffer = this._manager.cache[this._src]
    sound._bufferNode.connect(sound._gainNode as GainNode)
    sound._bufferNode.start(sound._whenPlay, sound._seek, duration)

    return sound._id
  }
  playSprite(name) {
    const sound = this._sounds.find((o: Sound) => !o._paused && !o._ended && o._sprite == name) || this.findInactiveSound()

    sound._sprite = name

    sound._ended = false
    sound._paused = false
    sound._whenPlay = 0
    const segment = this._sprite[name]
    const duration = segment[2] / 1000
    sound._seek = segment[1] / 1000
    sound._duration = duration

    sound._bufferNode = this._manager.ctx.createBufferSource()
    sound._bufferNode.buffer = this._manager.cache[this._src]
    sound._bufferNode.connect(sound._gainNode as GainNode)
    sound._bufferNode.start(sound._whenPlay, sound._seek, duration)

    setTimeout(() => {
      this.ended(sound)
    }, duration * 1000)

    return sound._id
  }

  pause() {
    this._sounds.forEach((sound: Sound) => {
      if (sound._paused) return
      sound._bufferNode?.stop(0)
      sound._bufferNode?.disconnect(0)
      sound._paused = true
    })
  }
  ended(sound: Sound) {
    if (sound._ended) return
    this._manager.emit('source:playEnd', sound._sprite)
    sound.reset()
    sound._bufferNode.disconnect(0)
    // @ts-ignore
    sound._bufferNode = null
  }
  playing(id?: number) {
    if (id) {
      const sound = this.findSoundById(id)
      return sound ? !sound._paused && !sound._ended : false
    }

    return this._sounds.some((o: Sound) => !o._paused && !o._ended)
  }
  findSoundById(id: number) {
    return this._sounds.find((o) => o._id == id)
  }

  private findInactiveSound() {
    let firstAvailableSound = this._sounds.find((o: Sound) => o._ended)
    if (firstAvailableSound) {
      firstAvailableSound.reset()
      return firstAvailableSound
    }

    firstAvailableSound = this._sounds.find((o: Sound) => o._paused)
    if (firstAvailableSound) {
      return firstAvailableSound
    }

    console.log('new Sound')
    return new Sound(this)
  }

  destroy() {
    this._sounds.forEach((s: Sound) => {
      s._bufferNode?.disconnect(0)
      s._bufferNode = null

      s._gainNode?.disconnect(0)
      s._gainNode = null
    })
    this._sounds = []
  }
}

class Sound {
  private parent: AudioSource

  _sprite = '__default'
  _volume = 1
  _gainNode: GainNode
  _bufferNode: AudioBufferSourceNode

  _id = 0

  _seek = 0
  _whenPlay = 0
  _duration = 0

  _paused = true
  _ended = true

  constructor(source: AudioSource) {
    this.reset()
    this._id = ++source._manager.counter

    this.parent = source
    this.parent._sounds.push(this)

    this.create()
  }
  create() {
    this._gainNode = this.parent._manager.ctx.createGain()
    this._gainNode.gain.setValueAtTime(this._volume, this.parent._manager.ctx.currentTime)
    this._gainNode.connect(this.parent._manager.masterGain as GainNode)
  }
  reset() {
    this._seek = 0
    this._whenPlay = 0
    this._duration = 0

    this._paused = true
    this._ended = true
  }
}

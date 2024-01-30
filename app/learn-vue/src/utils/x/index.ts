import { inject, reactive } from "vue"

interface IOption {
  state: { [k: string]: any }
}

export function createStore(options: IOption) {
  return new Store(options)
}

export const storeKey = Symbol()

export function useStore() {
  return inject(storeKey)
}

export class Store {
  private _state
  private _mutations
  private _subscribers = []

  private _actions

  constructor(options: IOption) {
    this._state = reactive({
      data: options.state,
    })

    this._mutations = options.mutations

    const { commit, dispatch } = this

    this.commit = commit.bind(this)
    this.dispatch = dispatch.bind(this)

    this._actions = Object.keys(options.actions).reduce((m, t) => {
      m[t] = (d) => options.actions[t]({
        commit: this.commit,
        dispatch: this.dispatch
      }, d)
      return m
    }, {})
  }
  get state() {
    return this._state.data
  }
  install(app) {
    app.provide(storeKey, this)
    app.config.globalProperties.$store = this
  }

  commit(type, payload) {
    const cb = this._mutations && this._mutations[type]
    if (cb) {
      cb(this.state, payload)
    }

    this._subscribers.forEach((fn) => fn(type, payload))
  }
  subscribe(fn) {
    this._subscribers.push(fn)
  }
  dispatch(type, payload) {
    const cb = this._actions && this._actions[type]
    if (cb) {
      return new Promise((res) => {
        res(cb(payload))
      })
    }
  }
}

import { createStore } from './utils/x'

export { useStore } from './utils/x'

export default createStore({
  state: {
    count: 0,
  },
  mutations: {
    increment(state, payload) {
      state.count += payload
    }
  },
  actions: {
    incrementByStep({ commit }, d) {
      commit('increment', d)
    },
    incrementAsync({ commit, dispatch }) {
      return new Promise((res) => {
        setTimeout(() => {
          dispatch('incrementByStep', 1)
          res()
        }, 1000)
      })
    },
  }
})


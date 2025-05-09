import { defineStore } from 'pinia'
import { store } from '../index'

interface AppState {
  siteId: string
}

export const useAppStore = defineStore({
  id: 'app',
  state: (): AppState => ({
    siteId: '',
  }),
  actions: {
    setSiteId(id: string) {
      this.siteId = id
    },
  },
  getters: {},
})

// Need to be used outside the setup
export function useAppStoreWithout() {
  return useAppStore(store)
}

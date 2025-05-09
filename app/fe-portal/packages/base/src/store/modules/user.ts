import { defineStore } from 'pinia'
import { ROLE_TYPE, TOKEN_KEY, USER_INFO_KEY, parseJSON } from '@fe-portal/shared'

import { store } from '@/store'
import router from '@/router'
import AccountService from '@/api/account'

interface UserState {
  userInfo: {
    name: string
    userId: string
    avatar?: string
    role: string
  } | null
  token?: string
  isDynamicAddedRoute: boolean
}

export const useUserStore = defineStore({
  id: 'user',
  state: (): UserState => ({
    userInfo: null,

    token: '',

    isDynamicAddedRoute: false,
  }),
  getters: {
    getUserInfo(): any {
      // @ts-ignore
      return this.userInfo || parseJSON(localStorage.getItem(USER_INFO_KEY)) || {}
    },
    getRole(): string {
      return this.getUserInfo?.role || ROLE_TYPE.GUEST
    },
    getDynamicAddedRoute(): boolean {
      return this.isDynamicAddedRoute
    },
    getToken(): any {
      return this.token || localStorage.getItem(TOKEN_KEY)
    },
  },
  actions: {
    setToken(token: string | undefined) {
      this.token = token || ''
      localStorage.setItem(TOKEN_KEY, token || '')
    },
    setUserInfo(user: { name: string; userId: string; avatar?: string; role: string } | null) {
      this.userInfo = user
      if (user) {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(user))
      } else {
        localStorage.removeItem(USER_INFO_KEY)
      }
    },
    setDynamicAddedRoute(t: boolean) {
      this.isDynamicAddedRoute = t
    },
    async getUserInfoAction() {
      if (!this.getToken) return null
      const res = await AccountService.getUserInfo()
      this.setUserInfo(res?.data)
    },
    reLogin(data?: { path?: string }) {
      this.setToken('')
      this.setUserInfo(null)
      router.push({ path: data?.path || '/login' })
    },
  },
})

// Need to be used outside the setup
export function useUserStoreWithout() {
  return useUserStore(store)
}

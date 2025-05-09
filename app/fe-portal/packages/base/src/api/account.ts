import { createAxios } from '@fe-portal/shared'

const axios = createAxios({ baseURL: import.meta.env.VITE_API_URL })

export default {
  async toAuth(params: { redirect_uri: string }) {
    return (await axios.get('/account/auth', { params })).data
  },

  async getAccessToken(data: { redirect_uri: string; code: string }) {
    return (await axios.post('/account/token', data)).data
  },

  async getUserInfo() {
    return (await axios.get('/account/getUserInfo')).data
  },

  // 获取所有访问过我们页面的成员
  async getUserList() {
    return (await axios.get('/account/getUserList')).data
  },
  async getAuditableUserList() {
    return (await axios.get('/account/getAuditableUserList')).data
  },
  // 删除用户
  async removeUser(data: { id: string }) {
    return (await axios.post('/account/removeUser', data)).data
  },
  // 修改用户角色
  async updateUserRole(data: { _id: string; role: string }) {
    return (await axios.post('/account/updateUserRole', data)).data
  },
  // 修改是否审批权限
  async updateUserAuditable(data: { _id: string; auditable: number }) {
    return (await axios.post('/account/updateUserAuditable', data)).data
  },
}

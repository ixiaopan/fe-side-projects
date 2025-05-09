import { createAxios } from '@fe-portal/shared'

const axios = createAxios({ baseURL: import.meta.env.VITE_API_URL })

export default {
  async createReport(data: { userId: string; name?: string; content: string; dateOfFriday: string }) {
    return (await axios.post('/report', data)).data
  },

  async queryWeekReport(params: { dateOfFriday: string }) {
    return (await axios.get(`/report/${params.dateOfFriday}`)).data
  },

  async queryReportArchive() {
    return (await axios.get('/report')).data
  },

  async queryPersonalReport(params: { userId: string; dateOfFriday: string }) {
    return (await axios.get(`/report/user/detail`, { params })).data
  },
}

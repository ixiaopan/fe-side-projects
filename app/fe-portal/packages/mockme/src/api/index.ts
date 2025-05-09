import { createAxios } from '@fe-portal/shared'

const axios = createAxios({ baseURL: import.meta.env.VITE_API_URL })

export default {
  // 添加项目
  async createProject(data: { projectId: string, projectName: string, projectDesc?: string }) {
    return (await axios.post('/mockme/project', data)).data
  },
  async queryProjectList() {
    return (await axios.get('/mockme/project')).data
  },
  async queryProjectById(id: string) {
    return (await axios.get(`/mockme/project/${id}`)).data
  },
  async updateProjectById(data: {
    projectId: string,
    projectName: string,
    projectDesc?: string,
  }) {
    return (await axios.post(`/mockme/project/${data.projectId}`, data)).data
  },
  async removeProjectById(id: string) {
    return (await axios.delete(`/mockme/project/${id}`)).data
  },

  // API
  async createAPI(data: {
    projectId: string
    url: string
    method?: string
    desc?: string,
  }) {
    return (await axios.post('/mockme/api', data)).data
  },
  async queryAPIList(params: { projectId: string }) {
    return (await axios.get('/mockme/api', { params })).data
  },
  async queryAPIById(id: string) {
    return (await axios.get(`/mockme/api/${id}`)).data
  },
  async updateAPI(data: {
    id: string,

    url?: string,
    desc?: string,
    method?: string

    mocked?: boolean,

    headers?: string,
    body?: string
    json?: string
  }) {
    return (await axios.post(`/mockme/api/${data.id}`, data)).data
  }
}

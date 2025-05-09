import { createAxios } from '@fe-portal/shared'

const axios = createAxios({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60 * 1000, // 因为拉取git和发布包都比较耗时
})

export default {
  // 添加包
  async addPackage(data: IAddPackageRequest) {
    return await axios.post('/npmPlatform/addPackage', data)
  },
  // 添加包
  async removePackage(data: { id: string }) {
    return await axios.post('/npmPlatform/removePackage', data)
  },

  // 查找包
  async queryPackages(): Promise<CommonResponse<IPackage[]>> {
    return (await axios.get('/npmPlatform/queryPackages')).data
  },

  // 包详情
  async queryPackageDetail({ id }: { id: string }): Promise<CommonResponse<IPackage>> {
    return (await axios.get('/npmPlatform/queryPackageDetail', { params: { id } })).data
  },

  // 设置包的maintainer
  async setPackageMaintainer(data: ISetPackageMaintainerRequest) {
    return await axios.post('/npmPlatform/setPackageMaintainer', data)
  },

  // 发布包
  async publishPackage(data: IPublishPackageRequest) {
    return await axios.post('/npmPlatform/publishPackage', data)
  },

  // 包的发布记录
  async queryPublishRecords({ id }: { id: string }): Promise<CommonResponse<IPackage[]>> {
    return (await axios.get('/npmPlatform/queryPublishRecords', { params: { id } })).data
  },

  // 包的changelog
  async queryChangelog({ projectId }: { projectId: number | null }): Promise<CommonResponse<IChangelog>> {
    return (await axios.get('/npmPlatform/queryChangelog', { params: { projectId } })).data
  },

  // 查找所有branches
  async queryAllBranches({ projectId }: { projectId: number | null }): Promise<CommonResponse<IBranch[]>> {
    return (
      await axios.get('/npmPlatform/queryAllBranches', {
        params: { projectId },
      })
    ).data
  },

  // 查找monorepo
  async queryMonorepo({ gitlab }: { gitlab: string }): Promise<CommonResponse<IMonorepo[]>> {
    return (await axios.get('/npmPlatform/queryMonorepo', { params: { gitlab } })).data
  },
}

export type CommonResponse<T> = {
  data: T
}

export interface IMonorepo {
  dirname: string
  filePath: string
  name: string
  version: string
  publishDirname?: string
  ossFilename?: string
}

export type IMaintainer = {
  userId: string
  name: string
}

export interface ISubPkg {
  name: string
  dirname: string
  filePath: string
  version: string
}

export interface IPackage {
  name: string
  gitlab: string
  maintainer: IMaintainer[]
  projectId: number | null
  isMonorepo: boolean
  publishDirname?: string
  packageList: ISubPkg[]
  ossFilename: string
  monorepoList?: IMonorepo[]
}

export type IAddPackageRequest = Pick<
  IPackage,
  'name' | 'maintainer' | 'gitlab' | 'projectId' | 'publishDirname' | 'isMonorepo' | 'ossFilename' | 'monorepoList'
>

export interface ISetPackageMaintainerRequest {
  id: string
  maintainer: IMaintainer[]
}

export interface IPublishPackageRequest {
  id: string
  branch: string
  tag: string
  bumpType: string
  isMonorepo?: boolean // 多包模式
  subModule?: string // 多包中的子包
}

export interface IChangelog {
  allTags: { name: string; commit: { committed_date: string } }[]
  allMergeRequests: {
    merged_at: string
    author: { username: string }
    title: string
    web_url: string
    merge_commit_sha: string
  }[]
}

export interface IBranch {
  name: string
}

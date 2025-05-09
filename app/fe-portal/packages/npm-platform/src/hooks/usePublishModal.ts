import { reactive, ref } from 'vue'

import type { IPackage } from '@/api/npmPlatform'

interface IData extends Omit<IPackage, 'publishDirname'> {
  _id: string
}

const visible = ref(false)
const packageData = reactive<IData>({
  _id: '',
  gitlab: '',
  maintainer: [],
  name: '',
  version: '',
  projectId: null,
})

export const usePublishModal = () => {
  const openPublishModal = (data: IData) => {
    visible.value = true
    Object.assign(packageData, data)
  }

  const closePublishModal = () => {
    visible.value = false
  }

  return {
    visible,
    packageData,
    openPublishModal,
    closePublishModal,
  }
}

import { ref } from 'vue'

const visible = ref(false)

export const useAddPackageModal = () => {
  const openAddPackageModal = () => {
    visible.value = true
  }

  const closeAddPackageModal = () => {
    visible.value = false
  }

  return {
    visible,
    openAddPackageModal,
    closeAddPackageModal,
  }
}

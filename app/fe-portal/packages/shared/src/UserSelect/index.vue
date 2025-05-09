<template>
  <a-spin :spinning="loading">
    <a-select
      show-search
      placeholder="Select People"
      option-filter-prop="children"
      mode="multiple"
      :options="options"
      :filter-option="filterOption"
      v-model:value="userIdList"
      @change="onChange"
    />
  </a-spin>
</template>

<script lang="ts" setup>
import { ref, watchEffect, computed } from 'vue'

const props = defineProps({
  defaultIdList: Array,
})

const emits = defineEmits(['update:value', 'change'])

// 默认值发生变化
const userIdList = ref<string[]>([])
watchEffect(() => {
  userIdList.value = (props.defaultIdList || []) as string[]
})
function clear() {
  userIdList.value  = []
}
// entry
const loading = ref(false)
const userList = ref([])
const options = computed(() =>
  userList.value?.map((u: any) => ({
    label: u.name,
    value: '' + u.userId,
  }))
)
async function getUserList() {
  loading.value = true

  const res = await (window.microApp?.getGlobalData() || {}).fetchUserList()
  userList.value = res.data || []

  loading.value = false
}
getUserList()

// 选择
function filterOption(input: string, option: { label: string }) {
  return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
}
function onChange(value: string[]) {
  const nameList = value?.map((id: string) => ({
    userId: id,
    name: userList.value.find((u: any) => u.userId == id)?.name || '',
  }))
  emits('change', nameList)
}
defineExpose({
  onChange,
  clear,
})
</script>

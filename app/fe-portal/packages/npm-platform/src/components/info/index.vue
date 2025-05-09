<template>
  <a-page-header
    style="border: 1px solid rgb(235, 237, 240); background: #fff"
    :title="name"
    @back="() => $router.push('/')"
  >
    <a-descriptions>
      <a-descriptions-item label="gitlab">
        <a target="_blank" :href="gitlab">{{ gitlab }}</a>
      </a-descriptions-item>

      <a-descriptions-item label="管理者">
        <div>
          <a-tag v-for="user of maintainer" :key="user.name" color="blue">{{ user.name }}</a-tag>
        </div>
      </a-descriptions-item>

      <a-descriptions-item label="isMonorepo">{{ isMonorepo ? '是' : '否' }}</a-descriptions-item>

      <a-descriptions-item v-if="isMonorepo" label="包列表">
        <div>
          <div v-for="item in packageList" :key="item.name">
            <span>{{ item.name }}</span>
            <a-tag style="margin-left: 10px">{{ item.version }}</a-tag>
          </div>
        </div>
      </a-descriptions-item>

      <a-descriptions-item v-else label="版本">{{ ((packageList || [])[0] || {}).version }}</a-descriptions-item>
    </a-descriptions>
  </a-page-header>
</template>

<script setup lang="ts">
interface IPackage {
  name: string
  gitlab: string
  isMonorepo: boolean
  maintainer: { name: string }[]
  packageList: { name: string; version: string }[]
}
defineProps<IPackage>()
</script>

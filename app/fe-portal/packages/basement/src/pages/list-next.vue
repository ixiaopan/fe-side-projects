<template>
  <div class="bs-project-page">
    <div class="bs-project-head" @click="goBasementPage">
      <left-outlined />
      <span>{{ projectName }}</span>
    </div>

    <a-tabs v-model:activeKey="activeKey" tab-position="left">
      <a-tab-pane key="iteration">
        <template #tab>
          <span>
            <code-outlined class="bs-project-tab-icon" />
            迭代管理
          </span>
        </template>

        <IterList :appId="appId" :projectId="projectId" :projectName="projectName" :branchMode="branchMode" />
      </a-tab-pane>

      <a-tab-pane key="branch">
        <template #tab>
          <span>
            <branches-outlined class="bs-project-tab-icon" />
            分支管理
          </span>
        </template>
        <BranchList :appId="appId" :projectId="projectId" />
      </a-tab-pane>

      <a-tab-pane key="mr">
        <template #tab>
          <span>
            <pull-request-outlined class="bs-project-tab-icon" />
            合并请求
          </span>
        </template>

        <MergeRequest :appId="appId" :projectId="projectId" />
      </a-tab-pane>

      <a-tab-pane key="publish">
        <template #tab>
          <span>
            <tag-outlined class="bs-project-tab-icon" />
            上线记录
          </span>
        </template>
        <PublishList :appId="appId" :projectId="projectId" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { LeftOutlined, TagOutlined, CodeOutlined, PullRequestOutlined, BranchesOutlined } from '@ant-design/icons-vue'

import BasementService from '@/api/basement'
import { goBasementPage } from '@/router/goto'

import IterList from '@/components/iterList.vue'
import BranchList from '@/components/branchList.vue'
import PublishList from '@/components/publishList.vue'
import MergeRequest from '@/components/mergeRequest.vue'

const route = useRoute()
const appId = route.params?.id as any

const projectName = ref('')
const branchMode = ref(false)
const projectId = ref(-1)

async function init() {
  const projRes = await BasementService.fetchBasementDetail({ id: appId })

  projectId.value = projRes?.data?.projectId
  projectName.value = projRes?.data?.nameAlias || projRes?.data?.name
  branchMode.value = projRes?.data?.branchMode
}
init()

const activeKey = ref('iteration')
</script>

<style lang="less">
.bs-project-page {
  .bs-project-head {
    display: flex;
    align-items: center;
    margin: 10px 0 20px;
    padding-left: 20px;
    font-size: 20px;
    cursor: pointer;
  }

  .bs-project-tab-icon {
    margin-right: 6px;
  }

  .ant-tabs {
    overflow: visible !important;
  }
  .ant-tabs-tab-disabled,
  .ant-tabs-tab-disabled:hover,
  .ant-tabs-tab-disabled .ant-tabs-tab-btn:active {
    color: rgba(0, 0, 0, 0.85) !important;
    cursor: default !important;
    font-weight: 500;
    font-size: 18px;
  }
  .ant-tabs-content.ant-tabs-content-left {
    width: 94% !important;
    margin: 0 auto;
  }
  .ant-tabs-tabpane {
    padding-left: 0 !important;
  }
}
</style>

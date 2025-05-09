<!-- 分支管理 -->
<template>
  <div class="bs-project-branch">
    <div class="bs-project-branch-head">
      <a-radio-group v-model:value="branchCate">
        <a-radio-button v-for="item in BRANCH_CATE" :key="item.id" :value="item.id" :disabled="item.disabled">
          {{ item.name }}
        </a-radio-button>
      </a-radio-group>
    </div>

    <a-table rowKey="name" :loading="loading" :columns="columns" :data-source="branchList">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <!-- story tab 特有-->
          <safety-certificate-outlined v-if="branchCate == BRANCH_PREFIX.STORY" :style="{ color: '#389e0d' }" />

          {{ record.name }}

          <!-- 非活跃分支 -->
          <a-tag color="#d46b08" v-if="record.inactive">inactive</a-tag>

          <!-- 已经合入 -->
          <a-tag color="#87d068" v-if="record.merged">merged</a-tag>

          <!-- release tab 特有 -->
          <a-tag color="blue" v-if="branchCate == BRANCH_PREFIX.RELEASE && record.latest">latest</a-tag>

          <!-- 关联迭代状态 -->
          <a-tag v-if="ITER_STATUS_TEXT[record.status]" :color="ITER_STATUS_TAG_COLOR[record.status]">
            {{ ITER_STATUS_TEXT[record.status] }}
          </a-tag>
        </template>

        <template v-if="column.key === 'action'">
          <span
            v-if="!record.status || record.status == ITER_STATUS.PUBLISHED"
            class="g-text-link"
            @click="() => onDelConfirm(record.name)"
          >
            删除
          </span>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script lang="ts" setup>
import { ref, watchEffect } from 'vue'
import { replaceHost } from '@fe-portal/shared'
import dayjs from 'dayjs'
import { Modal, message } from 'ant-design-vue'
import { SafetyCertificateOutlined } from '@ant-design/icons-vue'

import BasementService from '@/api/basement'
import { BRANCH_PREFIX, ITER_STATUS, ITER_STATUS_TEXT, ITER_STATUS_TAG_COLOR } from '@/enums/appEnum'

const props = defineProps({
  projectId: {
    type: Number,
    required: true,
  },
  appId: {
    type: String,
    required: true,
  },
})

const BRANCH_CATE = [
  {
    id: BRANCH_PREFIX.STORY,
    name: 'story',
  },
  {
    id: BRANCH_PREFIX.HOTFIX,
    name: 'hotfix',
  },
  {
    id: BRANCH_PREFIX.REFACTOR,
    name: 'refactor',
  },
  {
    id: BRANCH_PREFIX.RELEASE,
    name: 'release',
  },
  {
    id: 'my',
    name: '我的',
    disabled: true,
  },
  {
    id: 'other',
    name: '其他',
    disabled: true,
  },
]

// --
const branchCate = ref<string>(BRANCH_CATE[0].id)
const loading = ref(false)
const branchList = ref([])
const columns = [
  {
    title: '分支名',
    key: 'name',
    dataIndex: 'name',
  },
  {
    title: '需求标题',
    key: 'title',
    dataIndex: 'title',
  },
  {
    title: '创建者',
    key: 'authorName',
    dataIndex: 'authorName',
  },
  {
    title: 'Action',
    key: 'action',
  },
]

type IBranch = {
  name: string
  iid?: string // 【story tab】 特有
  title?: string // 【story tab】 特有
  status?: ITER_STATUS // 【story tab】 特有
  authorName: string
  url: string
  latest?: boolean // 【release tab】特有
  inactive?: boolean // 超过1个月没有更新
  merged: boolean
  protected: boolean
  commit?: {
    committed_date: string
    author_name: string
  }
  web_url: string
}
function getLatestReleaseName(arr: IBranch[]) {
  arr?.sort((a: IBranch, b: IBranch) => {
    let at: any = a.name.split('-').slice(1)
    let bt: any = b.name.split('-').slice(1)

    at = dayjs(`${at[0]}-${at[1]}-${at[2]} ${at[3]}:${at[4]}:${at[5]}`)
    bt = dayjs(`${bt[0]}-${bt[1]}-${bt[2]} ${bt[3]}:${bt[4]}:${bt[5]}`)

    return at.isAfter(bt) ? -1 : 1
  })
  return arr?.length && arr[0].name
}

async function init() {
  loading.value = true

  // 后端默认会获取50个，目测足够了就不做分页了
  const res = await BasementService.queryBranchByReg({
    appId: props.appId,
    projectId: props.projectId!,
    type: branchCate.value,
  })

  const nextList = res.data?.map((o: IBranch) => {
    return {
      name: o.name,
      protected: o.protected,
      merged: o.merged,
      inactive: o.commit?.committed_date ? dayjs().isAfter(dayjs(o.commit?.committed_date).add(30, 'day')) : false,
      authorName: o.commit?.author_name,
      url: replaceHost(o.web_url),
    }
  })

  // 显示是否已经上线
  if (
    branchCate.value == BRANCH_PREFIX.STORY ||
    branchCate.value == BRANCH_PREFIX.HOTFIX ||
    branchCate.value == BRANCH_PREFIX.REFACTOR
  ) {
    const res = await BasementService.queryIterStatusByName({
      appId: props.appId!,
      nameList: nextList.map((o: IBranch) => o.name).join(','),
    })

    branchList.value = nextList.map((o: IBranch) => {
      const iter: any = res.data?.find((c: any) => c.branch == o.name)

      if (iter) {
        o.status = iter.status
        o.title = iter.title
        o.iid = iter._id
      }

      return o
    })
  }

  // 对 release 区分哪个是最近的一次集成
  else if (branchCate.value == BRANCH_PREFIX.RELEASE) {
    // 开发环境集成
    const devReleaseList = nextList?.filter((o: IBranch) => o.name.includes('dev'))
    // 测试环境集成
    const betaReleaseList = nextList?.filter((o: IBranch) => o.name.includes('beta'))

    nextList.forEach(
      (o: IBranch) =>
        (o.latest = o.name == getLatestReleaseName(devReleaseList) || o.name == getLatestReleaseName(betaReleaseList))
    )

    branchList.value = nextList
  }

  // 其他
  else {
    branchList.value = nextList
  }

  loading.value = false
}
watchEffect(async () => {
  init()
})

// -- 删除分支提示
function onDelConfirm(name: string) {
  Modal.confirm({
    title: `确认删除 ${name}`,
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      try {
        const ok = await BasementService.delBranchByName({ projectId: props.projectId!, branch: name })
        message.success('删除成功！因为gitlab删除有延时，列表存在缓存，多等待10s后再次确认')
        return ok
      } catch {
        return console.log('Oops errors!')
      }
    },
    onCancel() {},
  })
}
</script>

<style lang="less">
.bs-project-branch-head {
  margin-bottom: 20px;

  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

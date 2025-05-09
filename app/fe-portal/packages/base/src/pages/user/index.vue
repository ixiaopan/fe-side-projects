<template>
  <div class="base-user-page">
    <a-table :columns="columns" :data-source="userList">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <img class="base-user-card-avatar" :src="record.avatar" alt="" />
          <span>{{ record.name }}</span>
        </template>

        <template v-if="column.key == 'role'">
          <div class="base-user-select">
            <span v-if="!record.optionList?.length">{{ ROLE_TYPE_TEXT[record.role] }}</span>

            <a-select
              v-if="record.optionList?.length"
              placeholder="Select Role"
              :options="record.optionList"
              :value="ROLE_TYPE_TEXT[record.role]"
              @change="(v: string) => onChange(v, record)"
            />
          </div>
        </template>

        <template v-if="column.key == 'action'">
          <a-popconfirm title="Sure to delete?" @confirm="() => onDelete(record)">
            <a>Delete</a>
          </a-popconfirm>
          <a-divider type="vertical" />

          <span v-if="[ROLE_TYPE.ADMIN, ROLE_TYPE.MANAGER].includes(record.role)">
            <a-checkbox v-model:checked="record.auditable" @change="() => onAuditChange(record)" />
            设置为发布审批人
          </span>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'

import AccountService from '@/api/account'
import { useUserStore } from '@/store/modules/user'
import { ROLE_TYPE, ROLE_TYPE_TEXT } from '@fe-portal/shared'

const userStore = useUserStore()
const userInfo = computed(() => userStore.getUserInfo)

interface IUser {
  name: string
  avatar: string
  role: string
  _id: string
  auditable: number
  optionList?: any
}

// 发布审批
async function onAuditChange(record: { _id: string; auditable: boolean }) {
  const res = await AccountService.updateUserAuditable({
    _id: record._id,
    auditable: Number(record.auditable),
  })
  if (res.data) {
    message.success('修改成功')
    init()
  } else {
    message.error('修改失败')
  }
}

// 删除用户
async function onDelete(record: { _id: string }) {
  const res = await AccountService.removeUser({ id: record._id })
  if (res?.code == 200) {
    message.success('删除成功')
    init()
  }
}

// 修改用户角色
const onChange = async (role: string, u: IUser) => {
  const res = await AccountService.updateUserRole({ _id: u._id, role })
  if (res.data) {
    message.success('修改角色成功')
    init()
  } else {
    message.error('修改角色失败')
  }
}

const userList = ref<IUser[]>([])
const columns = [
  {
    title: '姓名',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
  },
  {
    title: 'Action',
    dataIndex: 'action',
    key: 'action',
  },
]
async function init() {
  const res = await AccountService.getUserList()

  const userRole = userInfo.value?.role

  userList.value = res.data?.map((d: any) => {
    let optionList: any = []

    if (!userRole) {
      optionList = []
    }
    // 当前登录用户是 普通成员
    else if (userRole == ROLE_TYPE.MEMBER) {
      optionList = []
    }
    // 当前登录用户是 管理员
    else if (userRole == ROLE_TYPE.MANAGER) {
      optionList =
        d.role == ROLE_TYPE.MEMBER || d.role == ROLE_TYPE.REPORTER || d.role == ROLE_TYPE.GUEST
          ? [
              {
                value: ROLE_TYPE.MANAGER,
                label: '管理员',
              },
              {
                value: ROLE_TYPE.MEMBER,
                label: '普通成员',
                disabled: d.role == ROLE_TYPE.MEMBER,
              },
              {
                value: ROLE_TYPE.REPORTER,
                label: 'reporter',
                disabled: d.role == ROLE_TYPE.REPORTER,
              },
              {
                value: ROLE_TYPE.GUEST,
                label: '游客',
                disabled: d.role == ROLE_TYPE.GUEST,
              },
            ]
          : []
    }
    // 当前登录用户是 admin
    else if (userRole == ROLE_TYPE.ADMIN) {
      optionList =
        d.role == ROLE_TYPE.ADMIN
          ? []
          : [
              {
                value: ROLE_TYPE.MANAGER,
                label: '管理员',
              },
              {
                value: ROLE_TYPE.MEMBER,
                label: '普通成员',
                disabled: d.role == ROLE_TYPE.MEMBER,
              },
              {
                value: ROLE_TYPE.REPORTER,
                label: 'reporter',
                disabled: d.role == ROLE_TYPE.REPORTER,
              },
              {
                value: ROLE_TYPE.GUEST,
                label: '游客',
                disabled: d.role == ROLE_TYPE.GUEST,
              },
            ]
    }

    return {
      ...d,
      auditable: d.auditable == 1,
      optionList,
    }
  })
}
init()
</script>

<style lang="less">
.base-user-page {
  width: 80%;
  margin: 0 auto;

  .base-user-card {
    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 10px;
    color: #000000b3;
    font: 12px/14px PingFang SC;

    & + .base-user-card {
      border-top: 1px solid rgb(216 216 216 / 90%);
    }
  }

  .ant-select {
    width: 100px;
  }

  .base-user-card-avatar {
    border-radius: 50%;
    width: 30px;
    height: 30px;
    margin-right: 10px;
  }
}
</style>

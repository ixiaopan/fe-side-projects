<template>
  <div>
    <div class="mockme-api-title" @click="goHome">
      <left-outlined />
      <span>{{ projectName }}</span>
    </div>

    <a-tabs class="mockme-api-tab" v-model:activeKey="activeKey" tab-position="left">
      <a-tab-pane key="iteration">
        <template #tab>
          <span>接口列表</span>
        </template>

        <div class="mockme-api">
          <!-- 左边 -->
          <div class="mockme-api-tree">
            <div class="mockme-api-tree-head">
              <a-button type="link" @click="openModal">
                <plus-outlined />
                新建接口
              </a-button>
            </div>

            <div class="list-tree">
              <div
                v-if="list?.length"
                :class="['list-tree-item', item._id == activeRecord?._id ? 'selected' : '']"
                v-for="item in list"
                :key="item._id"
                @click="() => onSelect(item)"
              >
                <div>
                  <div>
                    <a-tag v-if="item.mocked" color="purple">mock</a-tag>
                    <a-tag color="blue">{{ item.method }}</a-tag>
                    <span>{{ item.url }}</span>
                  </div>

                  <p class="list-tree-item-desc">{{ item.desc }}</p>
                </div>

                <div class="list-tree-item-action">
                  <a-tooltip :title="activeMocked ? '关闭mock' : '开启mock'">
                    <a-switch
                      v-if="activeRecord && activeRecord._id == item._id"
                      v-model:checked="activeMocked"
                      @change="onMockChange"
                    >
                      开启mock
                    </a-switch>
                  </a-tooltip>
                </div>
              </div>

              <a-empty v-else />
            </div>
          </div>

          <!-- 右侧 -->
          <div class="mockme-api-body">
            <Edit v-if="activeRecord?._id" :id="activeRecord?._id" />
            <a-empty v-else />
          </div>

          <a-modal v-model:visible="visible" title="添加API" @ok="onSubmit" :maskClosable="false">
            <a-form :model="formState" :label-col="{ span: 4 }" :rules="rules" ref="formRef">
              <a-form-item label="url" name="url">
                <a-input v-model:value="formState.url" placeholder="/query/tag" />
              </a-form-item>

              <a-form-item label="method" name="method">
                <a-select v-model:value="formState.method" style="width: 120px; margin-left: 10px">
                  <a-select-option :value="Method_TYPE.GET">GET</a-select-option>
                  <a-select-option :value="Method_TYPE.POST">POST</a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item label="描述" name="desc">
                <a-input v-model:value="formState.desc" />
              </a-form-item>
            </a-form>
          </a-modal>
        </div>
      </a-tab-pane>

      <a-tab-pane key="setting">
        <template #tab>
          <span>设置</span>
        </template>

        <Project :id="route.params.id" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import { watch, reactive, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute } from 'vue-router'
import { LeftOutlined, PlusOutlined } from '@ant-design/icons-vue'

import type { IAPI } from '@/enums'
import { Method_TYPE } from '@/enums'
import MockmeService from '@/api'
import { goHome } from '@/router'

import Edit from '@/components/Edit.vue'
import Project from '@/components/Project.vue'

const route = useRoute()

const activeKey = ref('iteration')

// 新建接口
const visible = ref(false)
function openModal() {
  visible.value = true
}
const formRef = ref()
interface FormState {
  url: string
  method: string
  desc?: string
}
const formState: FormState = reactive({
  url: '',
  method: Method_TYPE.GET,
  desc: '',
})
const rules = {
  url: [{ required: true, trigger: 'blur' }],
  method: [{ required: true, trigger: 'blur' }],
}
function onSubmit() {
  formRef.value.validate().then(async () => {
    const res = await MockmeService.createAPI({
      ...formState,
      projectId: route.params.id,
    })
    if (res.data) {
      formRef.value.resetFields()
      visible.value = false
      message.success('添加成功!')
      init()
    }
  })
}

// 选择
const activeRecord = ref() // TODO: 路由
const activeMocked = ref(false)
watch(
  () => activeRecord.value,
  (nv) => {
    activeMocked.value = nv.mocked
  }
)

function onSelect(item: IAPI) {
  activeRecord.value = item
  // TODO: 路由
}
let ing = false
async function onMockChange(v: boolean) {
  if (ing) return

  ing = true
  const res = await MockmeService.updateAPI({ mocked: v, id: activeRecord.value._id })

  if (res.data) {
    activeMocked.value = v
    message.success('切换成功!')
    init()
  }

  ing = false
}

// entry
const projectName = ref('')
onMounted(async () => {
  const res = await MockmeService.queryProjectById(route.params.id)
  projectName.value = res.data.name
})
const list = ref<IAPI[]>([])
async function init() {
  const res = await MockmeService.queryAPIList({
    projectId: route.params.id,
  })

  list.value = res.data || []
}
init()
</script>

<style lang="less" scoped>
.mockme-api-title {
  display: flex;
  align-items: center;
  margin: 0 0 12px;
  font-size: 20px;
  cursor: pointer;
}
.mockme-api-tab {
  margin-left: -20px;
}
.mockme-api {
  display: flex;
  background: #fff;
  height: calc(100vh - 100px - 40px);

  .mockme-api-tree {
    width: 260px;
    border-right: 1px solid #eee;

    height: 100%;
    overflow-y: auto;

    .mockme-api-tree-head {
      display: flex;
      justify-content: space-between;
      background: #fff;
      padding: 10px 0;

      position: sticky;
      top: 0;
    }

    .list-tree {
      .list-tree-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        column-gap: 4px;
        padding: 6px 10px;

        font-size: 14px;
        transition: all 0.1s;
        cursor: pointer;

        .list-tree-item-action {
          flex: 0 0 60px;
        }

        &:hover,
        &.selected {
          background: #eee;
        }

        p {
          margin: 0;
        }

        .list-tree-item-desc {
          color: #ccc;
        }

        & + .list-tree-item {
          margin-top: 4px;
        }
      }
    }
  }

  .mockme-api-body {
    flex: 1;
    padding: 10px 30px;
    height: 100%;
    overflow-y: auto;

    display: flex;
    flex-direction: column;
    #mockme-json-editor {
      flex: 1;
    }
  }
}
</style>

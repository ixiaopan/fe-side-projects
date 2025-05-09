<template>
  <div class="report-form-page">
    <ReportHeader withWeek :dateOfFriday="dateOfFriday" />

    <a-result v-if="done" status="success" title="已提交">
      <template #extra>
        <a-button key="console" type="primary" @click="onViewWeek">查看本周周报</a-button>
      </template>
    </a-result>

    <div v-else class="report-form-inner">
      <a-form class="report-form" ref="formRef" :model="formState" :rules="rules">
        <a-form-item label="姓名">{{ userInfo?.name }}</a-form-item>

        <a-form-item label="内容" name="content" class="report-textarea">
          <MdEditor v-model="formState.content" previewTheme="cyanosis" :toolbars="[]" />
        </a-form-item>
      </a-form>

      <div class="report-form-footer">
        <a-button type="primary" :disabled="disabled" @click="onSubmit">提交</a-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watchEffect, computed, reactive } from 'vue'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import { message } from 'ant-design-vue'
import MdEditor from 'md-editor-v3'

import { goReportWeekPage } from '@/router/goto'
import ReportService from '@/api/report'

import ReportHeader from '@/components/ReportHeader.vue'

const userInfo = computed(() => window.microApp?.getGlobalData().fetchUserInfo())

dayjs.extend(weekOfYear)
const now = dayjs()
const dateOfFriday = now
  .subtract(now.day() == 0 ? 7 : now.day(), 'day')
  .add(5, 'day')
  .format('YYYY-MM-DD')

// 获取本周个人周报详情
watchEffect(async () => {
  const res = await ReportService.queryPersonalReport({ userId: userInfo.value?.userId, dateOfFriday })
  formState.content = res.data?.content || `#### 本周工作\n- 项目1\n描述\n\n#### 下周工作\n- 项目2\n描述`
})

interface FormState {
  content: string
}
const formRef = ref()
const formState = reactive<FormState>({
  content: '',
})
const rules = reactive({
  content: { required: true, message: 'content is required' },
})
const disabled = ref(false)
const done = ref(false)
function onSubmit() {
  formRef.value?.validate().then(async () => {
    const data = {
      content: formState.content.trim(),
      dateOfFriday,
      userId: userInfo.value.userId,
      name: userInfo.value.name,
    }

    disabled.value = true
    try {
      const res = await ReportService.createReport(data)
      // 创建成功
      if (res.data) {
        done.value = true
      } else {
        throw new Error(res.msg)
      }
    } catch (e: Error | any) {
      message.error(e.msg | e.message)
    }

    disabled.value = false
  })
}

//
function onViewWeek() {
  goReportWeekPage(dateOfFriday)
}
</script>

<style lang="less" scoped>
.report-form-page {
  width: 60%;
  margin: 0 auto;
}

.report-form-inner {
  padding: 24px 0;

  .report-textarea {
    position: relative;
  }
  .report-textarea-count {
    position: absolute;
    bottom: 0;
    right: 18px;
    color: #aaa;
  }

  .report-form {
    width: 80%;
    margin: 0 auto;
  }

  .report-form-footer {
    margin: 20px 0;
    display: flex;
    justify-content: center;
  }
}
</style>

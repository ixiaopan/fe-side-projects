<template>
  <div v-for="(c, index) of content" :key="index" class="changelog-container">
    <div class="title">
      <span class="c1">{{ c.name }}</span>
      ({{ c.committedDate }})
    </div>

    <ul class="content">
      <li v-for="record of c.records" :key="record.mergeCommitSha">
        {{ record.title }}
        <a>@{{ record.username }}</a>
        (
        <a :href="record.webUrl" target="_blank">{{ record.mergeCommitSha }}</a>
        )
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { replaceHost } from '@fe-portal/shared'

import npmPlatformService from '@/api/npmPlatform'

export interface IProps {
  projectId: number | null
}

const props = defineProps<IProps>()

const content = ref<IContentItem[]>([])

interface IContentItem {
  name: string
  committedDate: string
  records: {
    username: string
    title: string
    webUrl: string
    mergeCommitSha: string
  }[]
}

onMounted(async () => {
  const res = await npmPlatformService.queryChangelog({
    projectId: props.projectId,
  })
  res.data.allTags.map((tag, index, arr) => {
    const committedDate = tag.commit.committed_date
    const beforeCommittedDate = arr[index + 1]?.commit.committed_date
    const obj: IContentItem = {
      name: tag.name,
      records: [],
      committedDate: dayjs(committedDate).format('YYYY-MM-DD'),
    }
    res.data.allMergeRequests.map((mr) => {
      const {
        merged_at,
        title,
        author: { username },
        web_url,
        merge_commit_sha,
      } = mr
      if (
        dayjs(merged_at).valueOf() <= dayjs(committedDate).valueOf() &&
        dayjs(merged_at).valueOf() > dayjs(beforeCommittedDate).valueOf()
      ) {
        obj.records.push({
          username,
          title,
          webUrl: replaceHost(web_url),
          mergeCommitSha: merge_commit_sha.slice(0, 7),
        })
      }
    })
    content.value.push(obj)
  })
})
</script>

<style scoped lang="less">
.changelog-container {
  background: #fff;
  .title {
    font-size: 24px;
    border-bottom: 1px solid #d0d7de;
    padding: 20px;

    .c1 {
      color: #0969da;
    }
  }
  .content {
    padding: 20px;

    > li {
      margin: 4px 0;
    }
  }
}
</style>

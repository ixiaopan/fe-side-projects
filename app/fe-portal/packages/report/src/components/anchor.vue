<template>
  <div class="anchor-container">
    <div v-for="(item, idx) in list" :key="idx" @click="() => jumpTo(idx)">
      <a :class="[idx === currentIdx ? 'active' : '']">{{ item.name }}</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'

interface IProps {
  list: { name: string }[]
  box: Element
}

const props = defineProps<IProps>()

const currentIdx = ref(0)
const childrenList: number[] = []
let calcFn = () => {}

watch(
  () => [props.list, props.box],
  ([list, box]) => {
    if (list.length > 0 && box) {
      nextTick(() => {
        ;[...box.children].forEach((item) => {
          let childTop = item.getBoundingClientRect().top
          childrenList.push(childTop)
        })
        calcFn = throttle(function () {
          childrenList.forEach((item, idx) => {
            if (item - window.scrollY <= 100) {
              currentIdx.value = idx
            }
          })
        }, 100)
        window.addEventListener('scroll', calcFn)
      })
    }
  }
)

onUnmounted(() => {
  window.removeEventListener('scroll', calcFn)
})

function jumpTo(idx: any) {
  currentIdx.value = idx
  ;[...props.box.children][idx]?.scrollIntoView({
    behavior: 'smooth',
  })
}

function throttle(fn: Function, time: number) {
  let timer: null | number = null
  return function () {
    if (timer) {
      clearInterval(timer)
    }
    timer = setTimeout(() => {
      fn()
      timer = null
    }, time)
  }
}
</script>

<style lang="less">
.anchor-container {
  position: fixed;
  top: 28%;
  left: 16%;
  padding: 10px;
  border-radius: 3%;

  > div {
    margin: 4px 0;

    > a {
      color: #000;

      &:hover,
      &.active {
        color: #1890ff;
      }
    }
  }
}
</style>

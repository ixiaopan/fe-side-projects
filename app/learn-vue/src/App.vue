<template>
  <div>
    <Counter />
    <CounterSetup />
  </div>
</template>

<script setup lang="ts">
import Counter from './Counter.vue'
import CounterSetup from './Counter-setup.vue'

// import { callWithErrorHandling, callWithErrorHandlingAsync } from './utils/v/errorHandler'
// callWithErrorHandling(() => {
//   console.log(age)
// })
// callWithErrorHandlingAsync(() => {
//   return Promise.reject('test error')
// })

let activeEffect, effectStack = []
const bucket = new WeakMap()

const person = { name: 'wxp', ok: true, age: 1 }

const obj = new Proxy(person, {
  get(target, p) {
    if (activeEffect) {
      let depsMap = bucket.get(target)
      if (!depsMap) {
        bucket.set(target, (depsMap = new Map()))
      }
      let deps = depsMap.get(p)
      if (!deps) {
        depsMap.set(p, (deps = new Set()))
      }
      deps.add(activeEffect)

      activeEffect.deps.push(deps)
    }
    return target[p]
  },
  set(target, k, v) {
    target[k] = v

    const depsMap = bucket.get(target)
    if (depsMap) {
      const depSet = depsMap.get(k)
      if (depSet) {
        const newDepSet = new Set(depSet)
        newDepSet.forEach((f) => {
          if (activeEffect != f) {
            if (f.options?.scheduler) {
              f.options?.scheduler(f)
            } else {
              f()
            }
          }
        })
      }
    }

    return true
  }
})
function cleanup(ef) {
  ef?.deps?.forEach((d) => {
    d.delete(ef)
  })
  ef.deps.length = 0
}
function effect(fn, options) {
  function effectFn() {
    cleanup(effectFn)
    activeEffect = effectFn
    effectStack.push(effectFn)
    fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
  }

  effectFn.deps = []
  effectFn.options = options

  effectFn()
}
// effect(() => {
//   console.log('effect 1')

//   effect(() => {
//     console.log('effect 2')
//     document.body.appendChild(document.createTextNode(obj.name))
//   })
//   document.body.appendChild(document.createTextNode(obj.ok))
// })
// setTimeout(() => {
//   obj.ok = false
// }, 1000)
// setTimeout(() => {
//   obj.name = 'alice'
// }, 2000)

// effect(() => {
//   console.log('add', obj.age++)
// })
const jobQueue = new Set()
let isFlushing = false
const p = Promise.resolve()
function flushJob() {
  if (isFlushing) return
  isFlushing = true
  p.then(() => {
    jobQueue.forEach((f) => f())
  }).finally(() => isFlushing = false)
}
effect(() => {
  console.log(obj.age)
}, {
  scheduler(f) {
    // setTimeout(f)
    jobQueue.add(f)
    flushJob()
  }
})
obj.age++
obj.age++
console.log('done')
</script>

<template>
  <div>
    <h3>Hello Counter setup</h3>

    <p>count is {{ store.state.count }}</p>

    <button @click="increment">+</button>
    <!-- <button @click="decrement">-</button>
    <button @click="incrementIfOdd">Increment if odd</button>
    <button @click="incrementAsync">Increment async</button> -->
  </div>
</template>

<script lang="ts" setup>
import { useStore } from './store'

const store = useStore()

store.subscribe((type, d) => console.log(`mutation: ${type}: ${d}`))

function increment() {
  // store.state.count += 3
  // store.commit('increment', 3)
  store.dispatch('incrementAsync', 2).then(() => console.log('hhhh'))
}
</script>

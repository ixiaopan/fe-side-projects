<template>
  <div>
    <h3>Hello Counter</h3>

    <p>Clicked: {{ name }} times, count is {{ count }}.</p>

    <button @click="increment">+</button>
    <!-- <button @click="decrement">-</button>
    <button @click="incrementIfOdd">Increment if odd</button>
    <button @click="incrementAsync">Increment async</button> -->
  </div>
</template>

<script lang="ts">
export default {
  data() {
    return {
      name: 1
    }
  },
  computed: {
    count(): number {
      return this.$store.state.count
    }
  },
  methods: {
    increment() {
      // this.$store.state.count += 1
      // this.$store.commit('increment', 1)
      this.$store.dispatch('incrementAsync', 1)
    },
  },
}
</script>

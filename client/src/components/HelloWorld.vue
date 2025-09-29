<template>
  <div>
    <h1>{{ msg }}</h1>
    <button @click="increment">Count: {{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
defineProps({ msg: { type: String, default: 'Hello' } });
const count = ref(0);
function increment() { count.value += 1; }
</script>

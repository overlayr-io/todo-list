<script setup>
import { computed } from 'vue';
import { rgba } from '../utils/format.js';

const props = defineProps({
  name: { type: String, default: '' },
  color: { type: String, default: '#7e858d' },
});

const style = computed(() => ({
  background: rgba(props.color, 0.16),
  color: props.color,
}));
</script>

<template>
  <span class="status" :style="style">{{ name }}</span>
</template>

<style scoped>
.status {
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}
</style>

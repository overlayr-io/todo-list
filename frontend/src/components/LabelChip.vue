<script setup>
import { computed } from 'vue';
import { rgba } from '../utils/format.js';

const props = defineProps({
  label: { type: Object, required: true }, // { name, color }
  size: { type: String, default: 'md' }, // sm | md
});

const style = computed(() => ({
  background: rgba(props.label.color, 0.15),
  color: props.label.color,
}));
</script>

<template>
  <span class="chip" :class="size" :style="style">
    <span class="dot" :style="{ background: label.color }" />
    {{ label.name }}
  </span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  font-weight: 500;
  white-space: nowrap;
}
.chip.md {
  padding: 3px 9px;
  font-size: 11px;
}
.chip.sm {
  padding: 3px 8px;
  font-size: 10.5px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}
.chip.sm .dot {
  width: 5px;
  height: 5px;
}
</style>

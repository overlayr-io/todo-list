<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: { type: Number, default: 0 },
  color: { type: String, default: 'var(--accent)' },
  showLabel: { type: Boolean, default: true },
  height: { type: Number, default: 5 },
  labelWidth: { type: Number, default: 30 },
});

const pct = computed(() => Math.max(0, Math.min(100, props.value)));
const isFull = computed(() => pct.value >= 100);
</script>

<template>
  <div class="pbar">
    <div class="track" :style="{ height: height + 'px' }">
      <div class="fill" :style="{ width: pct + '%', background: color }" />
    </div>
    <span
      v-if="showLabel"
      class="pct"
      :style="{ width: labelWidth + 'px', color: isFull ? color : pct === 0 ? 'var(--mut)' : 'var(--tx2)' }"
    >{{ pct }}%</span>
  </div>
</template>

<style scoped>
.pbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.track {
  flex: 1;
  border-radius: 999px;
  background: var(--track);
  overflow: hidden;
}
.fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.25s ease;
}
.pct {
  font-weight: 600;
  font-size: 11px;
  text-align: right;
}
</style>

<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import LabelChip from './LabelChip.vue';
import ProgressBar from './ProgressBar.vue';
import { formatDate } from '../utils/format.js';

const props = defineProps({
  task: { type: Object, required: true },
  dragging: { type: Boolean, default: false },
});
defineEmits(['open']);

const primaryLabel = computed(() => props.task.labels?.[0] || null);
const barColor = computed(() => primaryLabel.value?.color || 'var(--accent)');
const hasSub = computed(() => props.task.counts?.subtasks > 0);
</script>

<template>
  <div
    class="task-card"
    :class="{ done: task.isDone, dragging }"
    @click="$emit('open', task.id)"
  >
    <div class="top">
      <LabelChip v-if="primaryLabel" :label="primaryLabel" size="sm" />
      <span v-else class="spacer" />
      <svg v-if="task.isDone" class="check" width="16" height="16" viewBox="0 0 24 24" :fill="barColor" stroke="var(--bg)" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12l3 3 5-6" fill="none" stroke="var(--bg)" />
      </svg>
    </div>

    <div class="title" :class="{ struck: task.isDone }">{{ task.title }}</div>

    <div v-if="(hasSub || task.dueDate) && !task.isDone" class="meta">
      <span v-if="hasSub"><Icon name="checkbox" :size="12" :stroke="2" />{{ task.counts.subtasksDone }}/{{ task.counts.subtasks }}</span>
      <span v-if="task.dueDate"><Icon name="calendar" :size="12" :stroke="1.8" />{{ formatDate(task.dueDate) }}</span>
    </div>

    <ProgressBar :value="task.progress" :color="barColor" :label-width="34" />
  </div>
</template>

<style scoped>
.task-card {
  background: var(--card);
  border: 1px solid var(--bd);
  border-radius: 11px;
  padding: 13px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: var(--shadow-card);
  cursor: pointer;
}
.task-card:hover {
  border-color: var(--bd2);
}
.task-card.done {
  opacity: 0.72;
}
.task-card.dragging {
  border-color: var(--accent);
  box-shadow: 0 16px 34px -12px rgba(0, 0, 0, 0.7);
}
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 18px;
}
.spacer {
  flex: 1;
}
.check {
  flex: none;
}
.title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
}
.title.struck {
  text-decoration: line-through;
  color: var(--tx2);
}
.meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: var(--mut);
}
.meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>

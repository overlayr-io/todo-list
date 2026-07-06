<script setup>
import { computed } from 'vue';
import LabelChip from '../LabelChip.vue';
import ProgressBar from '../ProgressBar.vue';
import CheckCircle from '../CheckCircle.vue';
import { useDataStore } from '../../stores/data.js';
import { useUiStore } from '../../stores/ui.js';
import { formatDate } from '../../utils/format.js';

const props = defineProps({ project: { type: Object, required: true } });
const store = useDataStore();
const ui = useUiStore();

const tasks = computed(() => [...props.project.tasks].sort((a, b) => a.position - b.position));

function barColor(t) {
  return t.labels?.[0]?.color || 'var(--accent)';
}
async function complete(t) {
  await store.completeTask(t.id);
}
</script>

<template>
  <div class="wrap">
    <div class="head-row">
      <span class="c-check" />
      <span class="c-title">Tâche</span>
      <span class="c-label">Étiquette</span>
      <span class="c-date">Début</span>
      <span class="c-date">Échéance</span>
      <span class="c-prog">Progression</span>
    </div>
    <div class="card">
      <div v-for="t in tasks" :key="t.id" class="row" @click="ui.openTask(t.id)">
        <CheckCircle class="c-check" :done="t.isDone" :color="barColor(t)" @toggle="complete(t)" />
        <span class="c-title title" :class="{ struck: t.isDone }">{{ t.title }}</span>
        <span class="c-label"><LabelChip v-if="t.labels[0]" :label="t.labels[0]" /></span>
        <span class="c-date muted">{{ formatDate(t.startDate) }}</span>
        <span class="c-date muted">{{ formatDate(t.dueDate) }}</span>
        <span class="c-prog"><ProgressBar :value="t.progress" :color="barColor(t)" /></span>
      </div>
      <div v-if="!tasks.length" class="empty">Aucune tâche dans ce projet.</div>
    </div>
  </div>
</template>

<style scoped>
.wrap { flex: 1; overflow-y: auto; padding: 18px 26px 40px; }
.head-row,
.row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 15px;
}
.head-row {
  padding-bottom: 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--mut);
}
.row {
  padding: 13px 15px;
  border-bottom: 1px solid var(--bd);
  cursor: pointer;
}
.row:last-child { border-bottom: none; }
.row:hover { background: var(--sel); }
.c-check { width: 17px; flex: none; }
.c-title { flex: 1; }
.title { font-size: 13.5px; font-weight: 500; }
.title.struck { text-decoration: line-through; color: var(--tx2); }
.c-label { width: 130px; }
.c-date { width: 80px; font-size: 12px; }
.c-prog { width: 130px; display: flex; align-items: center; }
.empty { padding: 16px; color: var(--mut); }
</style>

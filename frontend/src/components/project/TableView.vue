<script setup>
import { computed } from 'vue';
import StatusPill from '../StatusPill.vue';
import { useUiStore } from '../../stores/ui.js';
import { formatShort } from '../../utils/format.js';

const props = defineProps({ project: { type: Object, required: true } });
const ui = useUiStore();

const columnsById = computed(() => new Map(props.project.columns.map((c) => [c.id, c])));
const tasks = computed(() => [...props.project.tasks].sort((a, b) => a.position - b.position));

function statusColor(t) {
  return columnsById.value.get(t.columnId)?.color || '#7e858d';
}
</script>

<template>
  <div class="wrap">
    <div class="grid">
      <div class="th">Tâche</div>
      <div class="th">Début</div>
      <div class="th">Échéance</div>
      <div class="th">Étiquette</div>
      <div class="th">Statut</div>
      <div class="th right">%</div>

      <template v-for="t in tasks" :key="t.id">
        <div class="td name" :class="{ struck: t.isDone }" @click="ui.openTask(t.id)">{{ t.title }}</div>
        <div class="td dim">{{ formatShort(t.startDate) }}</div>
        <div class="td dim">{{ formatShort(t.dueDate) }}</div>
        <div class="td">
          <span v-if="t.labels[0]" class="lbl">
            <span class="sq" :style="{ background: t.labels[0].color }" />{{ t.labels[0].name }}
          </span>
        </div>
        <div class="td"><StatusPill :name="t.status" :color="statusColor(t)" /></div>
        <div class="td right pct" :class="{ full: t.progress >= 100, zero: t.progress === 0 }">{{ t.progress }}</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.wrap { flex: 1; overflow: auto; padding: 20px 26px 40px; }
.grid {
  border: 1px solid var(--bd);
  border-radius: 10px;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 92px 92px 150px 120px 54px;
  font-size: 12.5px;
  min-width: 720px;
}
.th {
  padding: 11px 12px;
  background: var(--card2);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--mut);
  border-bottom: 1px solid var(--bd);
  border-right: 1px solid var(--bd);
}
.th:last-child { border-right: none; }
.td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--bd);
  border-right: 1px solid var(--bd);
  display: flex;
  align-items: center;
}
.grid > .td:nth-child(6n) { border-right: none; }
.grid > .td:nth-last-child(-n + 6) { border-bottom: none; }
.name { font-weight: 500; cursor: pointer; }
.name:hover { color: var(--accent); }
.name.struck { text-decoration: line-through; color: var(--tx2); }
.dim { color: var(--tx2); }
.right { justify-content: flex-end; text-align: right; }
.pct { font-weight: 600; color: var(--tx2); }
.pct.full { color: var(--accent); }
.pct.zero { color: var(--mut); }
.lbl { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; }
.sq { width: 8px; height: 8px; border-radius: 2px; }
</style>

<script setup>
import { computed } from 'vue';
import Icon from '../Icon.vue';
import { useUiStore } from '../../stores/ui.js';

const props = defineProps({ project: { type: Object, required: true } });
const ui = useUiStore();

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const tasks = computed(() => [...props.project.tasks].sort((a, b) => a.position - b.position));

// Reference year: the earliest year any task starts (fallback current year).
const year = computed(() => {
  const years = tasks.value
    .map((t) => t.startDate || t.dueDate)
    .filter(Boolean)
    .map((d) => new Date(d.slice(0, 10) + 'T00:00:00').getFullYear());
  return years.length ? Math.min(...years) : new Date().getFullYear();
});

function frac(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  const start = new Date(year.value, 0, 1);
  const end = new Date(year.value + 1, 0, 1);
  return Math.max(0, Math.min(1, (d - start) / (end - start)));
}

function bar(startDate, dueDate) {
  const s = frac(startDate);
  const e = frac(dueDate);
  if (s == null && e == null) return null; // no dates: no bar drawn
  const left = (s ?? 0) * 100;
  const right = (e ?? 1) * 100;
  return { left, width: Math.max(2, right - left) };
}

function taskColor(t) {
  return t.labels?.[0]?.color || 'var(--accent)';
}
</script>

<template>
  <div class="gantt">
    <div class="ghead">
      <div class="glabel">Tâche · {{ year }}</div>
      <div class="months">
        <div v-for="(m, i) in MONTHS" :key="i" class="month">{{ m }}</div>
      </div>
    </div>

    <div class="grows">
      <template v-for="t in tasks" :key="t.id">
        <div class="grow-line task">
          <div class="row-label" @click="ui.openTask(t.id)">
            <Icon v-if="t.subtasks.length" name="chevron" :size="11" :stroke="2.4" />
            <span class="rl-text">{{ t.title }}</span>
          </div>
          <div class="lane">
            <div v-if="bar(t.startDate, t.dueDate)" class="bar main"
              :style="{ left: bar(t.startDate, t.dueDate).left + '%', width: bar(t.startDate, t.dueDate).width + '%', background: taskColor(t) }">
              <span class="bar-pct">{{ t.progress }}%</span>
            </div>
          </div>
        </div>
        <div v-for="s in t.subtasks" :key="s.id" class="grow-line sub">
          <div class="row-label sub-label">{{ s.title }}</div>
          <div class="lane">
            <div v-if="bar(s.startDate, s.dueDate)" class="bar thin"
              :style="{ left: bar(s.startDate, s.dueDate).left + '%', width: bar(s.startDate, s.dueDate).width + '%', background: taskColor(t), opacity: 0.55 }"
            />
          </div>
        </div>
      </template>
      <div v-if="!tasks.length" class="empty">Aucune tâche à afficher.</div>
    </div>
  </div>
</template>

<style scoped>
.gantt { flex: 1; overflow: auto; }
.ghead {
  display: flex;
  border-bottom: 1px solid var(--bd);
  background: var(--card2);
  position: sticky;
  top: 0;
  z-index: 1;
}
.glabel {
  width: 224px;
  flex: none;
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--mut);
  border-right: 1px solid var(--bd);
}
.months { flex: 1; display: flex; min-width: 480px; }
.month {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 11px;
  color: var(--mut);
}
.grow-line { display: flex; align-items: center; border-bottom: 1px solid var(--bd); }
.grow-line.task { height: 42px; }
.grow-line.sub { height: 34px; }
.row-label {
  width: 224px;
  flex: none;
  padding: 0 16px;
  border-right: 1px solid var(--bd);
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.row-label:hover .rl-text { color: var(--accent); }
.sub-label {
  padding-left: 34px;
  font-size: 12px;
  color: var(--tx2);
  font-weight: 400;
  cursor: default;
}
.lane {
  flex: 1;
  min-width: 480px;
  height: 100%;
  position: relative;
  background: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent calc(8.333% - 1px),
    var(--bd) calc(8.333% - 1px),
    var(--bd) 8.333%
  );
}
.bar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 5px;
  box-sizing: border-box;
}
.bar.main {
  height: 15px;
  display: flex;
  align-items: center;
  padding-left: 8px;
}
.bar.thin { height: 9px; border-radius: 4px; }
.bar-pct {
  font-size: 9.5px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}
.empty { padding: 20px; color: var(--mut); }
</style>

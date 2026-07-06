<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import PageHeader from '../components/PageHeader.vue';
import LabelChip from '../components/LabelChip.vue';
import ProgressBar from '../components/ProgressBar.vue';
import CheckCircle from '../components/CheckCircle.vue';
import { api } from '../api.js';
import { useDataStore } from '../stores/data.js';
import { useUiStore } from '../stores/ui.js';
import { dayBadge } from '../utils/format.js';

const store = useDataStore();
const ui = useUiStore();
const { tick } = storeToRefs(store);

const data = ref({ overdue: [], week: [], month: [], later: [] });

async function load() {
  data.value = await api.get('/upcoming');
}
onMounted(load);
watch(tick, load);

const groups = computed(() => [
  { key: 'overdue', label: 'EN RETARD', danger: true, tasks: data.value.overdue },
  { key: 'week', label: 'CETTE SEMAINE', tasks: data.value.week },
  { key: 'month', label: 'CE MOIS-CI', tasks: data.value.month },
  { key: 'later', label: 'PLUS TARD', tasks: data.value.later },
].filter((g) => g.tasks.length));

function barColor(t) {
  return t.labels?.[0]?.color || 'var(--accent)';
}
async function complete(t) {
  await store.completeTask(t.id);
}
</script>

<template>
  <PageHeader title="À venir">
    <div class="seg">
      <span class="on">Échéance</span>
      <span>Priorité</span>
    </div>
  </PageHeader>

  <div class="content">
    <div v-for="g in groups" :key="g.key" class="group">
      <div class="group-head">
        <span class="glabel" :class="{ danger: g.danger }">{{ g.label }}</span>
        <span class="gcount" :class="{ danger: g.danger }">{{ g.tasks.length }}</span>
      </div>
      <div class="card" :class="{ 'danger-card': g.danger }">
        <div v-for="t in g.tasks" :key="t.id" class="row" @click="ui.openTask(t.id)">
          <div class="badge">
            <div class="badge-day" :class="{ danger: g.danger }">{{ dayBadge(t.dueDate).day }}</div>
            <div class="badge-month">{{ dayBadge(t.dueDate).month }}</div>
          </div>
          <CheckCircle :done="t.isDone" :color="barColor(t)" @toggle="complete(t)" />
          <span class="rtitle">{{ t.title }}</span>
          <LabelChip v-if="t.labels[0]" :label="t.labels[0]" />
          <div class="rbar"><ProgressBar :value="t.progress" :color="barColor(t)" /></div>
        </div>
      </div>
    </div>
    <div v-if="!groups.length" class="empty">Rien à venir. 🎉</div>
  </div>
</template>

<style scoped>
.seg {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--card);
  border: 1px solid var(--bd);
  border-radius: 8px;
  padding: 3px;
  font-size: 12px;
}
.seg span {
  padding: 5px 10px;
  border-radius: 6px;
  color: var(--mut);
}
.seg span.on { background: var(--card2); color: var(--tx); }
.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 26px 40px;
}
.group { margin-bottom: 24px; }
.group-head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 11px;
}
.glabel {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--tx2);
}
.glabel.danger { color: var(--danger); }
.gcount {
  font-size: 11px;
  color: var(--mut);
  background: var(--card2);
  padding: 1px 7px;
  border-radius: 999px;
}
.gcount.danger { background: rgba(248, 113, 113, 0.13); color: var(--danger); }
.card { overflow: hidden; }
.danger-card { border-color: rgba(248, 113, 113, 0.22); }
.row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 15px;
  border-bottom: 1px solid var(--bd);
  cursor: pointer;
}
.row:last-child { border-bottom: none; }
.row:hover { background: var(--sel); }
.badge { flex: none; text-align: center; width: 44px; }
.badge-day { font-size: 16px; font-weight: 700; line-height: 1; }
.badge-day.danger { color: var(--danger); }
.badge-month { font-size: 10px; color: var(--mut); text-transform: uppercase; }
.rtitle { flex: 1; font-size: 13.5px; font-weight: 500; }
.rbar { width: 120px; }
.empty { color: var(--mut); font-size: 14px; padding: 20px; }
</style>

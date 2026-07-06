<script setup>
import { ref, watch, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import PageHeader from '../components/PageHeader.vue';
import Icon from '../components/Icon.vue';
import LabelChip from '../components/LabelChip.vue';
import ProgressBar from '../components/ProgressBar.vue';
import CheckCircle from '../components/CheckCircle.vue';
import { api } from '../api.js';
import { useDataStore } from '../stores/data.js';
import { useUiStore } from '../stores/ui.js';
import { formatDate, relativeTime } from '../utils/format.js';

const store = useDataStore();
const ui = useUiStore();
const { tick } = storeToRefs(store);

const recent = ref([]);
const current = ref([]);
const search = ref('');

async function load() {
  const data = await api.get('/overview');
  recent.value = data.recent;
  current.value = data.current;
}
onMounted(load);
watch(tick, load);

const filtered = () =>
  current.value.filter((t) => t.title.toLowerCase().includes(search.value.toLowerCase()));

function open(id) {
  ui.openTask(id);
}
async function complete(t) {
  await store.completeTask(t.id);
}
function barColor(t) {
  return t.labels?.[0]?.color || 'var(--accent)';
}
</script>

<template>
  <PageHeader title="Vue d'ensemble">
    <div class="search">
      <Icon name="search" :size="15" :stroke="1.8" />
      <input v-model="search" placeholder="Rechercher…" />
    </div>
    <button class="btn-accent" @click="ui.startNewTask()">
      <Icon name="plus" :size="15" :stroke="2.2" /> Nouvelle tâche
    </button>
  </PageHeader>

  <div class="content">
    <div class="section-head">
      <h2>Dernières consultations</h2>
      <span class="muted">Voir tout</span>
    </div>
    <div class="recent">
      <div v-for="t in recent" :key="t.id" class="rcard" @click="open(t.id)">
        <LabelChip v-if="t.labels[0]" :label="t.labels[0]" />
        <div class="rtitle">{{ t.title }}</div>
        <div class="rtime">{{ relativeTime(t.lastViewedAt) }}</div>
        <ProgressBar :value="t.progress" :color="barColor(t)" />
      </div>
      <div v-if="!recent.length" class="empty">Aucune consultation récente.</div>
    </div>

    <div class="section-head">
      <h2>Tâches actuelles</h2>
      <span class="muted">{{ filtered().length }} tâches</span>
    </div>
    <div class="card list">
      <div v-for="t in filtered()" :key="t.id" class="trow" @click="open(t.id)">
        <CheckCircle :done="t.isDone" :color="barColor(t)" @toggle="complete(t)" />
        <span class="ttitle" :class="{ struck: t.isDone }">{{ t.title }}</span>
        <LabelChip v-if="t.labels[0]" :label="t.labels[0]" />
        <span class="tdue muted">{{ formatDate(t.dueDate) }}</span>
        <div class="tbar"><ProgressBar :value="t.progress" :color="barColor(t)" /></div>
      </div>
      <div v-if="!filtered().length" class="empty pad">Aucune tâche.</div>
    </div>
  </div>
</template>

<style scoped>
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--card);
  border: 1px solid var(--bd);
  border-radius: 9px;
  padding: 7px 11px;
  width: 230px;
  color: var(--mut);
  font-size: 13px;
}
.search input {
  border: none;
  background: none;
  outline: none;
  color: var(--tx);
  width: 100%;
}
.content {
  flex: 1;
  overflow-y: auto;
  padding: 26px 26px 40px;
}
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}
.section-head h2 {
  font-size: 13.5px;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
}
.recent {
  display: flex;
  gap: 14px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}
.rcard {
  flex: 1;
  min-width: 220px;
  background: var(--card);
  border: 1px solid var(--bd);
  border-radius: 12px;
  padding: 15px;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.rcard:hover { border-color: var(--bd2); }
.rtitle { font-size: 14px; font-weight: 600; }
.rtime { font-size: 11.5px; color: var(--mut); margin-top: -6px; }
.list { overflow: hidden; }
.trow {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--bd);
  cursor: pointer;
}
.trow:last-child { border-bottom: none; }
.trow:hover { background: var(--sel); }
.ttitle { flex: 1; font-size: 13.5px; font-weight: 500; }
.ttitle.struck { text-decoration: line-through; color: var(--tx2); }
.tdue { font-size: 12px; width: 78px; text-align: right; }
.tbar { width: 120px; }
.empty { color: var(--mut); font-size: 13px; }
.empty.pad { padding: 16px; }
</style>

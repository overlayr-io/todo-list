<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import Icon from './Icon.vue';
import LabelChip from './LabelChip.vue';
import { api } from '../api.js';
import { useDataStore } from '../stores/data.js';
import { formatDate, RECURRENCE_LABELS } from '../utils/format.js';

const props = defineProps({ taskId: { type: [Number, String], required: true } });
const emit = defineEmits(['close']);

const store = useDataStore();
const { labels, projects } = storeToRefs(store);

const task = ref(null);
const newSubtask = ref('');
const newChecklist = ref('');
const newLink = ref('');
const addingLink = ref(false);
const showLabelMenu = ref(false);

const projectName = computed(() => projects.value.find((p) => p.id === task.value?.projectId)?.name || '');
const projectColor = computed(() => projects.value.find((p) => p.id === task.value?.projectId)?.color || '#a78bfa');

const availableLabels = computed(() =>
  labels.value.filter((l) => !task.value?.labels.some((tl) => tl.id === l.id))
);

const progressNote = computed(() => {
  const c = task.value?.counts;
  if (!c) return '';
  if (c.subtasks === 0 && c.checklist === 0) return 'Progression saisie manuellement';
  const parts = [];
  if (c.subtasks) parts.push(`${c.subtasksDone} / ${c.subtasks} sous-tâches terminées`);
  if (c.checklist) parts.push(`${c.checklistDone} / ${c.checklist} items de checklist`);
  return 'Calcul : ' + parts.join(' + ');
});

async function load() {
  task.value = await api.get(`/tasks/${props.taskId}`);
  api.post(`/tasks/${props.taskId}/view`).catch(() => {});
}
onMounted(load);
watch(() => props.taskId, load);

function set(t) {
  if (t && t.id) task.value = t;
}

// ---- field edits ----
async function commitField(field, value) {
  set(await store.updateTask(task.value.id, { [field]: value }));
}
async function toggleAuto() {
  set(await store.updateTask(task.value.id, { autoProgress: !task.value.autoProgress }));
}

// ---- subtasks ----
async function toggleSubtask(s) {
  set(await store.updateSubtask(s.id, { done: !s.done }));
}
async function addSubtask() {
  if (!newSubtask.value.trim()) return;
  set(await store.addSubtask(task.value.id, { title: newSubtask.value.trim() }));
  newSubtask.value = '';
}
async function removeSubtask(s) {
  set(await store.deleteSubtask(s.id));
}

// ---- checklist ----
async function toggleCheck(c) {
  set(await store.updateChecklistItem(c.id, { done: !c.done }));
}
async function addCheck() {
  if (!newChecklist.value.trim()) return;
  set(await store.addChecklistItem(task.value.id, { title: newChecklist.value.trim() }));
  newChecklist.value = '';
}
async function removeCheck(c) {
  set(await store.deleteChecklistItem(c.id));
}

// ---- links ----
async function addLink() {
  const url = newLink.value.trim();
  if (!/^https?:\/\//i.test(url)) return;
  addingLink.value = true;
  try {
    set(await store.addLink(task.value.id, { url }));
    newLink.value = '';
  } finally {
    addingLink.value = false;
  }
}
async function removeLink(l) {
  set(await store.deleteLink(l.id));
}

// ---- labels ----
async function addLabel(l) {
  const ids = [...task.value.labels.map((x) => x.id), l.id];
  set(await store.setTaskLabels(task.value.id, ids));
  showLabelMenu.value = false;
}
async function removeLabel(l) {
  const ids = task.value.labels.filter((x) => x.id !== l.id).map((x) => x.id);
  set(await store.setTaskLabels(task.value.id, ids));
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div v-if="task" class="panel">
      <!-- Header -->
      <div class="head">
        <div class="head-main">
          <div class="crumb">
            <span class="dot" :style="{ background: projectColor }" />
            {{ projectName }} · {{ task.status || 'Sans statut' }}
          </div>
          <input class="title-input" :value="task.title" @change="commitField('title', $event.target.value)" />
        </div>
        <button class="icon-btn" @click="emit('close')"><Icon name="close" :size="15" :stroke="2" /></button>
      </div>

      <div class="body">
        <!-- Left column -->
        <div class="left">
          <textarea
            class="desc"
            :value="task.description"
            placeholder="Ajouter une description…"
            @change="commitField('description', $event.target.value)"
          />

          <!-- Progress -->
          <div>
            <div class="section-line">
              <span class="section-title">Progression pondérée</span>
              <span class="accent">{{ task.progress }}%</span>
            </div>
            <div class="big-track"><div class="big-fill" :style="{ width: task.progress + '%' }" /></div>
            <div class="note">
              {{ progressNote }}
              <button class="linkish" @click="toggleAuto">
                · {{ task.autoProgress ? 'passer en manuel' : 'calcul auto' }}
              </button>
            </div>
            <input
              v-if="!task.autoProgress"
              class="input manual"
              type="number" min="0" max="100"
              :value="task.progress"
              @change="commitField('progress', Number($event.target.value))"
            />
          </div>

          <!-- Subtasks -->
          <div>
            <div class="section-line">
              <span class="section-title">Sous-tâches</span>
              <span class="muted small">{{ task.counts.subtasksDone }} / {{ task.counts.subtasks }}</span>
            </div>
            <div class="list">
              <div v-for="s in task.subtasks" :key="s.id" class="srow">
                <button class="cbtn" @click="toggleSubtask(s)">
                  <svg v-if="s.done" width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--card)" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6" fill="none" stroke="var(--card)"/></svg>
                  <span v-else class="empty-circle" />
                </button>
                <span class="srow-title" :class="{ struck: s.done }">{{ s.title }}</span>
                <span v-if="s.dueDate" class="muted small">{{ formatDate(s.dueDate) }}</span>
                <button class="del" @click="removeSubtask(s)"><Icon name="close" :size="12" :stroke="2" /></button>
              </div>
              <div class="add-row">
                <Icon name="plus" :size="14" :stroke="2" />
                <input v-model="newSubtask" class="add-input" placeholder="Ajouter une sous-tâche" @keyup.enter="addSubtask" />
              </div>
            </div>
          </div>

          <!-- Checklist -->
          <div>
            <div class="section-line">
              <span class="section-title">Checklist</span>
              <span class="muted small">{{ task.counts.checklistDone }} / {{ task.counts.checklist }}</span>
            </div>
            <div class="list">
              <div v-for="c in task.checklist" :key="c.id" class="srow">
                <button class="cbtn" @click="toggleCheck(c)">
                  <span v-if="c.done" class="square-on"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" stroke-width="3.2"><path d="M5 12l5 5L20 6"/></svg></span>
                  <span v-else class="square-off" />
                </button>
                <span class="srow-title" :class="{ struck: c.done }">{{ c.title }}</span>
                <button class="del" @click="removeCheck(c)"><Icon name="close" :size="12" :stroke="2" /></button>
              </div>
              <div class="add-row">
                <Icon name="plus" :size="14" :stroke="2" />
                <input v-model="newChecklist" class="add-input" placeholder="Ajouter un item" @keyup.enter="addCheck" />
              </div>
            </div>
          </div>

          <!-- Links -->
          <div>
            <div class="section-line"><span class="section-title">Liens</span></div>
            <div class="list">
              <div v-for="l in task.links" :key="l.id" class="link-card">
                <div class="thumb" :style="l.imageUrl ? { backgroundImage: `url(${l.imageUrl})` } : {}" />
                <div class="link-meta">
                  <div class="link-title">{{ l.title || l.url }}</div>
                  <div class="link-url">{{ l.url }}</div>
                </div>
                <a :href="l.url" target="_blank" rel="noopener" class="link-ext"><Icon name="external" :size="14" :stroke="2" /></a>
                <button class="del" @click="removeLink(l)"><Icon name="close" :size="12" :stroke="2" /></button>
              </div>
              <div class="add-row">
                <Icon name="plus" :size="14" :stroke="2" />
                <input v-model="newLink" class="add-input" placeholder="Coller une URL (https://…)" @keyup.enter="addLink" />
                <span v-if="addingLink" class="muted small">…</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column -->
        <div class="right">
          <div>
            <div class="side-h">Dates</div>
            <label class="date-row">
              <Icon name="calendar" :size="14" :stroke="1.8" /><span class="muted">Début</span>
              <input type="date" class="date-input" :value="task.startDate ? task.startDate.slice(0,10) : ''" @change="commitField('startDate', $event.target.value)" />
            </label>
            <label class="date-row">
              <Icon name="calendar" :size="14" :stroke="1.8" /><span class="muted">Échéance</span>
              <input type="date" class="date-input" :value="task.dueDate ? task.dueDate.slice(0,10) : ''" @change="commitField('dueDate', $event.target.value)" />
            </label>
          </div>

          <div>
            <div class="side-h">Récurrence</div>
            <div class="rec-tabs">
              <button v-for="r in ['none','weekly','monthly','yearly']" :key="r"
                :class="{ on: task.recurrence === r }" @click="commitField('recurrence', r)">
                {{ r === 'none' ? 'Aucune' : RECURRENCE_LABELS[r].slice(0,5) }}
              </button>
            </div>
          </div>

          <div>
            <div class="side-h">Étiquettes</div>
            <div class="chips">
              <span v-for="l in task.labels" :key="l.id" class="chip-wrap">
                <LabelChip :label="l" />
                <button class="chip-x" @click="removeLabel(l)"><Icon name="close" :size="10" :stroke="2.4" /></button>
              </span>
              <div class="label-add">
                <button class="chip-plus" @click="showLabelMenu = !showLabelMenu">+</button>
                <div v-if="showLabelMenu && availableLabels.length" class="label-menu">
                  <button v-for="l in availableLabels" :key="l.id" @click="addLabel(l)">
                    <span class="sq" :style="{ background: l.color }" />{{ l.name }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button class="btn-accent save" @click="emit('close')">Enregistrer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 26px;
  z-index: 50;
}
.panel {
  width: 100%;
  max-width: 720px;
  max-height: 100%;
  background: var(--card);
  border: 1px solid var(--bd);
  border-radius: 16px;
  box-shadow: var(--shadow-pop);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--bd);
}
.head-main { flex: 1; min-width: 0; }
.crumb {
  font-size: 11.5px;
  color: var(--mut);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.crumb .dot { width: 8px; height: 8px; border-radius: 2px; }
.title-input {
  width: 100%;
  border: none;
  background: none;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--tx);
  outline: none;
  padding: 0;
}
.icon-btn {
  width: 30px; height: 30px;
  flex: none;
  border-radius: 8px;
  border: 1px solid var(--bd);
  background: none;
  color: var(--mut);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-btn:hover { color: var(--tx); background: var(--sel); }

.body { flex: 1; overflow: hidden; display: flex; min-height: 0; }
.left {
  flex: 1;
  min-width: 0;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  overflow-y: auto;
}
.right {
  width: 220px;
  flex: none;
  border-left: 1px solid var(--bd);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}
.desc {
  width: 100%;
  border: none;
  background: none;
  resize: vertical;
  min-height: 44px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--tx2);
  outline: none;
  font-family: inherit;
}
.section-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.section-title { font-size: 12px; font-weight: 600; }
.accent { font-weight: 600; font-size: 12px; color: var(--accent); }
.small { font-size: 11px; }
.big-track { height: 8px; border-radius: 999px; background: var(--track); overflow: hidden; }
.big-fill { height: 100%; border-radius: 999px; background: var(--accent); transition: width 0.25s ease; }
.note { font-size: 11px; color: var(--mut); margin-top: 7px; }
.linkish { border: none; background: none; color: var(--accent); cursor: pointer; font-size: 11px; padding: 0; }
.manual { margin-top: 8px; max-width: 120px; }

.list { display: flex; flex-direction: column; gap: 9px; }
.srow { display: flex; align-items: center; gap: 11px; }
.srow-title { flex: 1; font-size: 13px; }
.srow-title.struck { color: var(--tx2); text-decoration: line-through; }
.cbtn { border: none; background: none; padding: 0; cursor: pointer; display: inline-flex; line-height: 0; }
.empty-circle { width: 16px; height: 16px; border-radius: 50%; border: 1.8px solid var(--bd2); display: block; }
.square-on { width: 16px; height: 16px; border-radius: 5px; background: var(--accent); display: flex; align-items: center; justify-content: center; }
.square-off { width: 16px; height: 16px; border-radius: 5px; border: 1.8px solid var(--bd2); display: block; }
.del { border: none; background: none; color: var(--mut); cursor: pointer; opacity: 0; display: inline-flex; padding: 2px; }
.srow:hover .del, .link-card:hover .del { opacity: 1; }
.del:hover { color: var(--danger); }
.add-row { display: flex; align-items: center; gap: 8px; color: var(--mut); }
.add-input { flex: 1; border: none; background: none; outline: none; font-size: 12px; color: var(--tx); }
.add-input::placeholder { color: var(--mut); }

.link-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card2);
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 10px;
}
.thumb {
  width: 60px; height: 46px; flex: none; border-radius: 6px;
  background: repeating-linear-gradient(45deg, var(--card2), var(--card2) 4px, var(--bd) 4px, var(--bd) 8px);
  background-size: cover; background-position: center;
}
.link-meta { flex: 1; min-width: 0; }
.link-title { font-size: 12.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.link-url { font-size: 11px; color: var(--mut); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.link-ext { color: var(--mut); flex: none; }

.side-h {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mut);
  margin-bottom: 9px;
}
.date-row {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12.5px;
  margin-bottom: 7px;
}
.date-input {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--tx);
  font-size: 12px;
  font-weight: 500;
  outline: none;
  color-scheme: dark;
}
.rec-tabs { display: flex; flex-wrap: wrap; gap: 5px; }
.rec-tabs button {
  flex: 1;
  min-width: 46px;
  text-align: center;
  padding: 5px 0;
  border-radius: 6px;
  font-size: 11px;
  border: none;
  background: var(--card2);
  color: var(--mut);
  cursor: pointer;
}
.rec-tabs button.on { background: var(--soft); color: var(--accent); font-weight: 500; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.chip-wrap { position: relative; display: inline-flex; align-items: center; }
.chip-x {
  border: none; background: none; color: var(--mut); cursor: pointer;
  display: inline-flex; margin-left: -2px; padding: 2px;
}
.chip-x:hover { color: var(--danger); }
.label-add { position: relative; }
.chip-plus {
  border: 1px dashed var(--bd2);
  background: none;
  color: var(--mut);
  border-radius: 999px;
  padding: 3px 9px;
  cursor: pointer;
  font-size: 11px;
}
.label-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 6px;
  background: var(--card);
  border: 1px solid var(--bd2);
  border-radius: 9px;
  box-shadow: var(--shadow-pop);
  padding: 5px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 150px;
  max-height: 220px;
  overflow-y: auto;
}
.label-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: none;
  color: var(--tx);
  padding: 7px 9px;
  border-radius: 7px;
  cursor: pointer;
  font-size: 12.5px;
  text-align: left;
}
.label-menu button:hover { background: var(--sel); }
.label-menu .sq { width: 10px; height: 10px; border-radius: 3px; }
.save { justify-content: center; margin-top: auto; }

:root[data-theme='light'] .date-input { color-scheme: light; }

@media (max-width: 640px) {
  .body { flex-direction: column; overflow-y: auto; }
  .right { width: auto; border-left: none; border-top: 1px solid var(--bd); }
}
</style>

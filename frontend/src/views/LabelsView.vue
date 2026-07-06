<script setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import PageHeader from '../components/PageHeader.vue';
import Icon from '../components/Icon.vue';
import LabelChip from '../components/LabelChip.vue';
import { useDataStore } from '../stores/data.js';

const store = useDataStore();
const { labels } = storeToRefs(store);

const PALETTE = [
  '#a78bfa', '#60a5fa', '#22d3ee', '#34d399', '#fbbf24', '#fb923c',
  '#fb7185', '#f472b6', '#14b8a6', '#818cf8', '#a3e635', '#94a3b8',
];

const name = ref('');
const color = ref('#22d3ee');
const editingId = ref(null);
const editName = ref('');

const preview = computed(() => ({ name: name.value || 'Aperçu', color: color.value }));

onMounted(() => store.loadLabels());

async function create() {
  if (!name.value.trim()) return;
  await store.createLabel({ name: name.value.trim(), color: color.value });
  name.value = '';
}
function startEdit(l) {
  editingId.value = l.id;
  editName.value = l.name;
}
async function saveEdit(l) {
  if (editName.value.trim() && editName.value !== l.name) {
    await store.updateLabel(l.id, { name: editName.value.trim() });
  }
  editingId.value = null;
}
async function remove(l) {
  if (confirm(`Supprimer l'étiquette « ${l.name} » ?`)) await store.deleteLabel(l.id);
}
</script>

<template>
  <PageHeader title="Étiquettes" />

  <div class="content">
    <!-- Create -->
    <div class="create">
      <div class="card pad">
        <div class="card-title">Nouvelle étiquette</div>

        <label class="lbl">Nom</label>
        <input v-model="name" class="input" placeholder="Ex. Voyages" @keyup.enter="create" />

        <label class="lbl">Couleur</label>
        <div class="palette">
          <button
            v-for="c in PALETTE"
            :key="c"
            class="swatch"
            :class="{ on: color === c }"
            :style="{ background: c }"
            @click="color = c"
          />
        </div>

        <label class="lbl">Aperçu</label>
        <div class="preview"><LabelChip :label="preview" /></div>

        <button class="btn-accent full" @click="create">Créer l'étiquette</button>
      </div>
    </div>

    <!-- List -->
    <div class="existing">
      <div class="section-head">
        <div class="card-title">Étiquettes existantes</div>
        <span class="muted">{{ labels.length }} étiquettes</span>
      </div>
      <div class="card">
        <div v-for="l in labels" :key="l.id" class="row">
          <span class="sq" :style="{ background: l.color }" />
          <input
            v-if="editingId === l.id"
            v-model="editName"
            class="edit-input"
            @keyup.enter="saveEdit(l)"
            @blur="saveEdit(l)"
          />
          <span v-else class="lname">{{ l.name }}</span>
          <span class="muted count">{{ l.taskCount }} {{ l.taskCount > 1 ? 'tâches' : 'tâche' }}</span>
          <button class="act" title="Renommer" @click="startEdit(l)"><Icon name="edit" :size="15" :stroke="1.9" /></button>
          <button class="act danger" title="Supprimer" @click="remove(l)"><Icon name="trash" :size="15" :stroke="1.8" /></button>
        </div>
        <div v-if="!labels.length" class="empty">Aucune étiquette.</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content {
  flex: 1;
  overflow-y: auto;
  padding: 26px;
  display: flex;
  gap: 26px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.create { width: 300px; flex: none; }
.existing { flex: 1; min-width: 300px; }
.pad { padding: 20px; }
.card-title { font-size: 13.5px; font-weight: 600; }
.pad .card-title { margin-bottom: 16px; }
.lbl {
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--mut);
  margin-bottom: 7px;
}
.pad .input { margin-bottom: 18px; }
.palette {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 9px;
  margin-bottom: 18px;
}
.swatch {
  aspect-ratio: 1;
  border-radius: 7px;
  border: none;
  cursor: pointer;
}
.swatch.on { box-shadow: 0 0 0 2px var(--card), 0 0 0 4px currentColor; }
.preview { margin-bottom: 20px; }
.full { width: 100%; justify-content: center; }
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 13px;
}
.row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--bd);
}
.row:last-child { border-bottom: none; }
.sq { width: 12px; height: 12px; border-radius: 3px; flex: none; }
.lname { flex: 1; font-size: 13.5px; font-weight: 500; }
.edit-input {
  flex: 1;
  background: var(--bg);
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13.5px;
  color: var(--tx);
  outline: none;
}
.count { font-size: 12px; }
.act {
  border: none;
  background: none;
  color: var(--mut);
  cursor: pointer;
  display: inline-flex;
  padding: 3px;
  border-radius: 6px;
}
.act:hover { color: var(--tx); background: var(--sel); }
.act.danger:hover { color: var(--danger); }
.empty { padding: 16px; color: var(--mut); }
</style>

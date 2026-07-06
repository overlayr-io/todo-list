<script setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import Icon from './Icon.vue';
import LabelChip from './LabelChip.vue';
import { useDataStore } from '../stores/data.js';
import { useUiStore } from '../stores/ui.js';

const props = defineProps({ prefill: { type: Object, default: () => ({}) } });
const emit = defineEmits(['close']);

const store = useDataStore();
const ui = useUiStore();
const { projects, labels } = storeToRefs(store);

const title = ref('');
const projectId = ref(props.prefill.projectId || null);
const columnId = ref(props.prefill.columnId || null);
const startDate = ref('');
const dueDate = ref('');
const recurrence = ref('none');
const selectedLabels = ref([]);
const saving = ref(false);

const currentProject = computed(() => projects.value.find((p) => p.id === Number(projectId.value)));
const columns = computed(() => currentProject.value?.columns || []);

onMounted(() => {
  if (!projectId.value && projects.value.length) projectId.value = projects.value[0].id;
});

function onProjectChange() {
  columnId.value = columns.value[0]?.id || null;
}
function toggleLabel(l) {
  const i = selectedLabels.value.indexOf(l.id);
  if (i >= 0) selectedLabels.value.splice(i, 1);
  else selectedLabels.value.push(l.id);
}

async function submit() {
  if (!title.value.trim() || !projectId.value) return;
  saving.value = true;
  try {
    const task = await store.createTask({
      title: title.value.trim(),
      projectId: Number(projectId.value),
      columnId: columnId.value ? Number(columnId.value) : null,
      startDate: startDate.value || null,
      dueDate: dueDate.value || null,
      recurrence: recurrence.value,
      labelIds: selectedLabels.value,
    });
    emit('close');
    ui.openTask(task.id);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="panel">
      <div class="head">
        <div class="head-title">Nouvelle tâche</div>
        <button class="icon-btn" @click="emit('close')"><Icon name="close" :size="15" :stroke="2" /></button>
      </div>

      <div class="form">
        <input v-model="title" class="title-input" placeholder="Titre de la tâche" @keyup.enter="submit" autofocus />

        <div class="grid">
          <label class="field">
            <span>Projet</span>
            <select v-model="projectId" class="input" @change="onProjectChange">
              <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </label>
          <label class="field">
            <span>Colonne</span>
            <select v-model="columnId" class="input">
              <option v-for="c in columns" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </label>
          <label class="field">
            <span>Début</span>
            <input v-model="startDate" type="date" class="input" />
          </label>
          <label class="field">
            <span>Échéance</span>
            <input v-model="dueDate" type="date" class="input" />
          </label>
          <label class="field">
            <span>Récurrence</span>
            <select v-model="recurrence" class="input">
              <option value="none">Aucune</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuel</option>
              <option value="yearly">Annuel</option>
            </select>
          </label>
        </div>

        <div class="field">
          <span>Étiquettes</span>
          <div class="labels">
            <button
              v-for="l in labels"
              :key="l.id"
              class="label-btn"
              :class="{ on: selectedLabels.includes(l.id) }"
              @click="toggleLabel(l)"
            >
              <LabelChip :label="l" size="sm" />
            </button>
          </div>
        </div>
      </div>

      <div class="foot">
        <button class="btn-ghost" @click="emit('close')">Annuler</button>
        <button class="btn-accent" :disabled="!title.trim() || saving" @click="submit">
          {{ saving ? 'Création…' : 'Créer la tâche' }}
        </button>
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
  max-width: 520px;
  background: var(--card);
  border: 1px solid var(--bd);
  border-radius: 16px;
  box-shadow: var(--shadow-pop);
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: hidden;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--bd);
}
.head-title { font-size: 15px; font-weight: 600; }
.icon-btn {
  width: 30px; height: 30px;
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
.form {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
}
.title-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--bd);
  background: none;
  color: var(--tx);
  font-size: 18px;
  font-weight: 600;
  padding: 4px 0 10px;
  outline: none;
}
.title-input:focus { border-bottom-color: var(--accent); }
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.field { display: flex; flex-direction: column; gap: 7px; }
.field > span {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--mut);
}
select.input { cursor: pointer; }
.labels { display: flex; flex-wrap: wrap; gap: 7px; }
.label-btn {
  border: 1px solid transparent;
  background: none;
  border-radius: 999px;
  padding: 1px;
  cursor: pointer;
  opacity: 0.55;
}
.label-btn.on { opacity: 1; border-color: var(--bd2); }
.foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--bd);
}
.btn-accent:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 520px) {
  .grid { grid-template-columns: 1fr; }
}
</style>

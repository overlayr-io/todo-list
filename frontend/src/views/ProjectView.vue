<script setup>
import { ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import ProjectHeader from '../components/ProjectHeader.vue';
import KanbanBoard from '../components/project/KanbanBoard.vue';
import ListView from '../components/project/ListView.vue';
import TableView from '../components/project/TableView.vue';
import GanttView from '../components/project/GanttView.vue';
import { useDataStore } from '../stores/data.js';
import { useUiStore } from '../stores/ui.js';

const route = useRoute();
const store = useDataStore();
const ui = useUiStore();
const { currentProject, loading } = storeToRefs(store);

const tab = ref('kanban');

const tabs = {
  kanban: KanbanBoard,
  list: ListView,
  table: TableView,
  gantt: GanttView,
};
const activeComponent = computed(() => tabs[tab.value]);

async function load(id) {
  await store.loadProject(id);
}
watch(() => route.params.id, (id) => id && load(id), { immediate: true });
</script>

<template>
  <template v-if="currentProject">
    <ProjectHeader
      :project="currentProject"
      :active-tab="tab"
      :task-count="currentProject.tasks.length"
      @tab="tab = $event"
      @new="ui.startNewTask({ projectId: currentProject.id })"
    />
    <component :is="activeComponent" :project="currentProject" />
  </template>
  <div v-else-if="loading" class="state">Chargement…</div>
  <div v-else class="state">Projet introuvable.</div>
</template>

<style scoped>
.state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--mut);
}
</style>

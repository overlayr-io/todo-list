<script setup>
import { onMounted } from 'vue';
import Sidebar from './components/Sidebar.vue';
import TaskDetailModal from './components/TaskDetailModal.vue';
import NewTaskModal from './components/NewTaskModal.vue';
import { useDataStore } from './stores/data.js';
import { useUiStore } from './stores/ui.js';

const store = useDataStore();
const ui = useUiStore();

onMounted(async () => {
  await Promise.all([store.loadProjects(), store.loadLabels()]);
});
</script>

<template>
  <div class="shell">
    <Sidebar class="shell-sidebar" />
    <main class="shell-main">
      <RouterView v-slot="{ Component }">
        <component :is="Component" />
      </RouterView>
    </main>

    <Teleport to="body">
      <Transition name="fade">
        <TaskDetailModal v-if="ui.openTaskId" :task-id="ui.openTaskId" @close="ui.closeTask()" />
      </Transition>
      <Transition name="fade">
        <NewTaskModal v-if="ui.newTask" :prefill="ui.newTask" @close="ui.cancelNewTask()" />
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  height: 100%;
  background: var(--bg);
  color: var(--tx);
}
.shell-sidebar {
  flex: none;
}
.shell-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (max-width: 720px) {
  .shell-sidebar {
    display: none;
  }
}
</style>

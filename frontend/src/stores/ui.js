import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    openTaskId: null,
    newTask: null, // null | { projectId, columnId }
    dirtyTick: 0, // bumped whenever task data changes, so views can refresh
  }),
  actions: {
    bump() {
      this.dirtyTick++;
    },
    openTask(id) {
      this.openTaskId = id;
    },
    closeTask() {
      this.openTaskId = null;
    },
    startNewTask(prefill = {}) {
      this.newTask = { projectId: null, columnId: null, ...prefill };
    },
    cancelNewTask() {
      this.newTask = null;
    },
  },
});

import { defineStore } from 'pinia';
import { api } from '../api.js';

export const useDataStore = defineStore('data', {
  state: () => ({
    projects: [],
    labels: [],
    currentProject: null, // { id, name, color, columns, tasks }
    loading: false,
    error: null,
    tick: 0, // bumped on any task mutation so cross-view lists can refresh
  }),

  getters: {
    projectById: (s) => (id) => s.projects.find((p) => p.id === Number(id)),
    tasksByColumn: (s) => (columnId) =>
      (s.currentProject?.tasks || [])
        .filter((t) => t.columnId === columnId)
        .sort((a, b) => a.position - b.position),
  },

  actions: {
    async loadProjects() {
      this.projects = await api.get('/projects');
    },
    async loadLabels() {
      this.labels = await api.get('/labels');
    },
    async loadProject(id) {
      this.loading = true;
      try {
        this.currentProject = await api.get(`/projects/${id}`);
      } finally {
        this.loading = false;
      }
    },

    // ---- Projects ----
    async createProject(payload) {
      const p = await api.post('/projects', payload);
      await this.loadProjects();
      return p;
    },

    // ---- Tasks ----
    async createTask(payload) {
      const task = await api.post('/tasks', payload);
      if (this.currentProject && task.projectId === this.currentProject.id) {
        await this.loadProject(this.currentProject.id);
      }
      await this.loadProjects();
      return task;
    },
    async updateTask(id, patch) {
      const task = await api.patch(`/tasks/${id}`, patch);
      this._mergeTask(task);
      return task;
    },
    async moveTask(id, columnId, position) {
      const task = await api.patch(`/tasks/${id}`, { columnId, position });
      this._mergeTask(task);
      return task;
    },
    async completeTask(id) {
      const task = await api.post(`/tasks/${id}/complete`);
      this._mergeTask(task);
      return task;
    },
    async deleteTask(id) {
      await api.del(`/tasks/${id}`);
      if (this.currentProject) {
        this.currentProject.tasks = this.currentProject.tasks.filter((t) => t.id !== id);
      }
      await this.loadProjects();
    },
    async touchTask(id) {
      return api.post(`/tasks/${id}/view`);
    },

    // ---- Subtasks / checklist / links / labels (all return the full task) ----
    async addSubtask(taskId, body) { return this._apply(await api.post(`/tasks/${taskId}/subtasks`, body)); },
    async updateSubtask(id, body) { return this._apply(await api.patch(`/subtasks/${id}`, body)); },
    async deleteSubtask(id) { return this._apply(await api.del(`/subtasks/${id}`)); },
    async addChecklistItem(taskId, body) { return this._apply(await api.post(`/tasks/${taskId}/checklist`, body)); },
    async updateChecklistItem(id, body) { return this._apply(await api.patch(`/checklist/${id}`, body)); },
    async deleteChecklistItem(id) { return this._apply(await api.del(`/checklist/${id}`)); },
    async addLink(taskId, body) { return this._apply(await api.post(`/tasks/${taskId}/links`, body)); },
    async deleteLink(id) { return this._apply(await api.del(`/links/${id}`)); },
    async setTaskLabels(taskId, labelIds) { return this._apply(await api.put(`/tasks/${taskId}/labels`, { labelIds })); },

    // ---- Labels ----
    async createLabel(body) { await api.post('/labels', body); await this.loadLabels(); },
    async updateLabel(id, body) { await api.patch(`/labels/${id}`, body); await this.loadLabels(); },
    async deleteLabel(id) { await api.del(`/labels/${id}`); await this.loadLabels(); await this._reloadCurrent(); },

    // Merge a mutation result into local state, signal refresh, return the task.
    _apply(task) {
      this._mergeTask(task);
      this.tick++;
      return task;
    },
    // Replace a task in the current project's list in place.
    _mergeTask(task) {
      this.tick++;
      if (!task || !task.id || !this.currentProject) return;
      const list = this.currentProject.tasks;
      const idx = list.findIndex((t) => t.id === task.id);
      if (idx >= 0) list.splice(idx, 1, task);
      else if (task.projectId === this.currentProject.id) list.push(task);
    },
    async _reloadCurrent() {
      if (this.currentProject) await this.loadProject(this.currentProject.id);
    },
  },
});

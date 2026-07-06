<script setup>
import { ref } from 'vue';
import Icon from '../Icon.vue';
import TaskCard from '../TaskCard.vue';
import { useDataStore } from '../../stores/data.js';
import { useUiStore } from '../../stores/ui.js';

const props = defineProps({ project: { type: Object, required: true } });
const store = useDataStore();
const ui = useUiStore();

const dragId = ref(null);
const dragOverCol = ref(null);

function tasksFor(columnId) {
  return props.project.tasks
    .filter((t) => t.columnId === columnId)
    .sort((a, b) => a.position - b.position);
}

function onDragStart(task) {
  dragId.value = task.id;
}
function onDragEnd() {
  dragId.value = null;
  dragOverCol.value = null;
}
function onDragOver(columnId) {
  dragOverCol.value = columnId;
}
async function onDrop(columnId, beforeTaskId = null) {
  const id = dragId.value;
  dragOverCol.value = null;
  dragId.value = null;
  if (!id) return;
  const list = tasksFor(columnId).filter((t) => t.id !== id);
  let index = beforeTaskId ? list.findIndex((t) => t.id === beforeTaskId) : list.length;
  if (index < 0) index = list.length;
  await store.moveTask(id, columnId, index);
}
</script>

<template>
  <div class="board">
    <div
      v-for="col in project.columns"
      :key="col.id"
      class="column"
      :class="{ over: dragOverCol === col.id }"
      @dragover.prevent="onDragOver(col.id)"
      @drop="onDrop(col.id)"
    >
      <div class="col-head">
        <span class="dot" :style="{ background: col.color }" />
        <span class="col-name">{{ col.name }}</span>
        <span class="col-count">{{ tasksFor(col.id).length }}</span>
        <div class="grow" />
        <button class="add" title="Ajouter une tâche" @click="ui.startNewTask({ projectId: project.id, columnId: col.id })">
          <Icon name="plus" :size="14" :stroke="2" />
        </button>
      </div>

      <div class="col-body">
        <div
          v-for="task in tasksFor(col.id)"
          :key="task.id"
          draggable="true"
          class="drag-wrap"
          @dragstart="onDragStart(task)"
          @dragend="onDragEnd"
          @drop.stop="onDrop(col.id, task.id)"
          @dragover.prevent
        >
          <TaskCard :task="task" :dragging="dragId === task.id" @open="ui.openTask($event)" />
        </div>
        <div v-if="dragOverCol === col.id" class="drop-hint" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.board {
  flex: 1;
  overflow-x: auto;
  padding: 20px 26px;
  display: flex;
  gap: 13px;
}
.column {
  flex: 1;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.column.over .col-body { border-radius: 11px; }
.col-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 2px;
}
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.col-name { font-size: 12.5px; font-weight: 600; }
.col-count { font-size: 11px; color: var(--mut); }
.grow { flex: 1; }
.add {
  border: none;
  background: none;
  color: var(--mut);
  cursor: pointer;
  display: inline-flex;
  padding: 2px;
  border-radius: 5px;
}
.add:hover { color: var(--tx); background: var(--sel); }
.col-body {
  display: flex;
  flex-direction: column;
  gap: 11px;
  min-height: 60px;
  flex: 1;
}
.drag-wrap { cursor: grab; }
.drag-wrap:active { cursor: grabbing; }
.drop-hint {
  border: 1.5px dashed rgba(20, 184, 166, 0.45);
  background: rgba(20, 184, 166, 0.05);
  border-radius: 11px;
  height: 56px;
}
</style>

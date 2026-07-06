<script setup>
import Icon from './Icon.vue';

defineProps({
  project: { type: Object, required: true },
  activeTab: { type: String, default: 'kanban' },
  taskCount: { type: Number, default: 0 },
});
const emit = defineEmits(['tab', 'new']);

const tabs = [
  { key: 'kanban', label: 'Kanban' },
  { key: 'list', label: 'Liste' },
  { key: 'table', label: 'Tableau' },
  { key: 'gantt', label: 'Gantt' },
];
</script>

<template>
  <header class="proj-header">
    <div class="row">
      <span class="dot" :style="{ background: project.color }" />
      <div class="name">{{ project.name }}</div>
      <span class="count">· {{ taskCount }} tâches</span>
      <div class="grow" />
      <RouterLink to="/sync" class="sync-chip">
        <Icon name="sync" :size="13" :stroke="1.9" /> Synchronisation
      </RouterLink>
      <button class="btn-accent small" @click="emit('new')">
        <Icon name="plus" :size="14" :stroke="2.3" /> Tâche
      </button>
    </div>
    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        :class="{ active: activeTab === t.key }"
        @click="emit('tab', t.key)"
      >
        {{ t.label }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.proj-header {
  flex: none;
  padding: 16px 26px 0;
  border-bottom: 1px solid var(--bd);
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.dot {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  flex: none;
}
.name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.count {
  font-size: 12px;
  color: var(--mut);
}
.grow {
  flex: 1;
}
.sync-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--card);
  border: 1px solid var(--bd);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--tx2);
}
.sync-chip:hover {
  background: var(--card2);
  color: var(--tx);
}
.sync-chip :deep(svg) {
  color: var(--accent);
}
.btn-accent.small {
  border-radius: 8px;
  padding: 8px 13px;
  font-size: 12.5px;
}
.tabs {
  display: flex;
  gap: 4px;
}
.tab {
  padding: 9px 13px;
  font-size: 13px;
  color: var(--mut);
  border: none;
  background: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}
.tab:hover {
  color: var(--tx2);
}
.tab.active {
  font-weight: 600;
  color: var(--tx);
  border-bottom-color: var(--accent);
}
</style>

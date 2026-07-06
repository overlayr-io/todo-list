<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import Icon from './Icon.vue';
import { useDataStore } from '../stores/data.js';
import { useThemeStore } from '../stores/theme.js';

const route = useRoute();
const router = useRouter();
const store = useDataStore();
const theme = useThemeStore();
const { projects } = storeToRefs(store);

const nav = [
  { name: 'overview', label: "Vue d'ensemble", icon: 'grid', to: '/' },
  { name: 'upcoming', label: 'À venir', icon: 'calendar', to: '/upcoming' },
  { name: 'labels', label: 'Étiquette', icon: 'tag', to: '/labels' },
  { name: 'sync', label: 'Synchronisation', icon: 'sync', to: '/sync' },
];

const activeProjectId = computed(() =>
  route.name === 'project' ? Number(route.params.id) : null
);

async function addProject() {
  const name = prompt('Nom du projet');
  if (!name) return;
  const p = await store.createProject({ name });
  router.push(`/projects/${p.id}`);
}
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="logo">O</div>
      <span class="brand-name">Objectifs</span>
    </div>

    <nav class="nav">
      <RouterLink
        v-for="item in nav"
        :key="item.name"
        :to="item.to"
        class="nav-item"
        :class="{ active: route.name === item.name }"
      >
        <Icon :name="item.icon" :size="18" />
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="projects">
      <div class="projects-head">
        <span>Projets</span>
        <button class="add" title="Nouveau projet" @click="addProject"><Icon name="plus" :size="13" :stroke="2.2" /></button>
      </div>
      <RouterLink
        v-for="p in projects"
        :key="p.id"
        :to="`/projects/${p.id}`"
        class="project-item"
        :class="{ active: activeProjectId === p.id }"
      >
        <span class="sq" :style="{ background: p.color }" />
        {{ p.name }}
      </RouterLink>
    </div>

    <div class="footer">
      <div class="theme-toggle">
        <button :class="{ on: theme.theme === 'dark' }" @click="theme.set('dark')">
          <Icon name="moon" :size="14" :stroke="1.8" /> Sombre
        </button>
        <button :class="{ on: theme.theme === 'light' }" @click="theme.set('light')">
          <Icon name="sun" :size="14" :stroke="1.8" /> Clair
        </button>
      </div>
      <div class="user">
        <div class="avatar">LM</div>
        <div class="user-meta">
          <div class="user-name">Tharshigan</div>
          <div class="user-sub">Compte perso</div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 214px;
  flex: none;
  background: var(--panel);
  border-right: 1px solid var(--bd);
  display: flex;
  flex-direction: column;
  padding: 18px 12px;
  height: 100%;
  overflow-y: auto;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px 22px;
}
.logo {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-ink);
  font-weight: 700;
  font-size: 14px;
}
.brand-name {
  font-weight: 600;
  font-size: 14.5px;
  letter-spacing: -0.01em;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 10px;
  border-radius: 9px;
  font-weight: 500;
  font-size: 14px;
  color: var(--tx2);
}
.nav-item:hover {
  background: var(--sel);
  color: var(--tx);
}
.nav-item.active {
  background: var(--soft);
  color: var(--accent);
}
.projects {
  margin-top: 8px;
  padding: 14px 10px 6px;
}
.projects-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--mut);
  padding: 0 2px 10px;
}
.add {
  background: none;
  border: none;
  color: var(--mut);
  cursor: pointer;
  display: inline-flex;
  padding: 2px;
  border-radius: 5px;
}
.add:hover {
  color: var(--tx);
  background: var(--sel);
}
.project-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border-radius: 8px;
  color: var(--tx2);
  font-size: 13px;
}
.project-item:hover {
  background: var(--sel);
  color: var(--tx);
}
.project-item.active {
  background: var(--soft);
  color: var(--accent);
}
.sq {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex: none;
}
.footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
}
.theme-toggle {
  display: flex;
  align-items: center;
  background: var(--bg);
  border: 1px solid var(--bd);
  border-radius: 9px;
  padding: 3px;
}
.theme-toggle button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  border-radius: 7px;
  font-size: 12px;
  border: none;
  background: none;
  color: var(--mut);
  cursor: pointer;
}
.theme-toggle button.on {
  background: var(--card2);
  color: var(--tx);
  font-weight: 500;
}
.user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px;
  border-top: 1px solid var(--bd);
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #334155, #1e293b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
}
.user-name {
  font-size: 12.5px;
  font-weight: 500;
}
.user-sub {
  font-size: 11px;
  color: var(--mut);
}
</style>

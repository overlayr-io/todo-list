import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'overview', component: () => import('./views/OverviewView.vue') },
  { path: '/upcoming', name: 'upcoming', component: () => import('./views/UpcomingView.vue') },
  { path: '/projects/:id', name: 'project', component: () => import('./views/ProjectView.vue') },
  { path: '/labels', name: 'labels', component: () => import('./views/LabelsView.vue') },
  { path: '/sync', name: 'sync', component: () => import('./views/SyncView.vue') },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

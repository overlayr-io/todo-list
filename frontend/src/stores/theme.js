import { defineStore } from 'pinia';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: localStorage.getItem('objectifs-theme') || 'dark',
  }),
  actions: {
    apply() {
      document.documentElement.setAttribute('data-theme', this.theme);
    },
    set(theme) {
      this.theme = theme;
      localStorage.setItem('objectifs-theme', theme);
      this.apply();
    },
    toggle() {
      this.set(this.theme === 'dark' ? 'light' : 'dark');
    },
  },
});

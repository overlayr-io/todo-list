import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router.js';
import { useThemeStore } from './stores/theme.js';
import './styles/base.css';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);

// Apply the persisted theme before mount to avoid a flash.
useThemeStore(pinia).apply();

app.mount('#app');

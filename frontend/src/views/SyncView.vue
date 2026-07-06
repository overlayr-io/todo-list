<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '../components/PageHeader.vue';
import Icon from '../components/Icon.vue';
import { api } from '../api.js';

const route = useRoute();
const router = useRouter();

const status = ref(null);
const busy = ref(false);
const banner = ref(null);

async function loadStatus() {
  status.value = await api.get('/sync/google/status');
}

onMounted(async () => {
  await loadStatus();
  const g = route.query.google;
  if (g === 'connected') banner.value = { type: 'ok', text: 'Compte Google connecté.' };
  else if (g === 'denied') banner.value = { type: 'err', text: 'Connexion refusée.' };
  else if (g === 'error') banner.value = { type: 'err', text: 'Erreur lors de la connexion.' };
  if (g) router.replace({ query: {} });
});

async function connect() {
  busy.value = true;
  try {
    const { url } = await api.get('/sync/google/connect');
    window.location.href = url;
  } catch (e) {
    banner.value = { type: 'err', text: e.message };
    busy.value = false;
  }
}

async function syncNow() {
  busy.value = true;
  try {
    const res = await api.post('/sync/google/run');
    status.value = res.status;
    banner.value = { type: 'ok', text: `${res.pushed} échéance(s) synchronisée(s).` };
  } catch (e) {
    banner.value = { type: 'err', text: e.message };
  } finally {
    busy.value = false;
  }
}

async function toggle(key) {
  const patch = { [key]: !status.value[key] };
  status.value = await api.patch('/sync/google/settings', patch);
}

async function disconnect() {
  if (!confirm('Déconnecter le compte Google ?')) return;
  status.value = await api.post('/sync/google/disconnect');
  banner.value = { type: 'ok', text: 'Compte déconnecté.' };
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}
</script>

<template>
  <PageHeader title="Synchronisation" />

  <div class="content" v-if="status">
    <div v-if="banner" class="banner" :class="banner.type">{{ banner.text }}</div>

    <div v-if="!status.configured" class="banner warn">
      La synchronisation Google n'est pas configurée côté serveur. Renseignez
      <code>GOOGLE_CLIENT_ID</code> et <code>GOOGLE_CLIENT_SECRET</code> (voir le README).
    </div>

    <!-- Account card -->
    <div class="card acct">
      <div class="acct-head">
        <div class="gicon">
          <svg width="22" height="22" viewBox="0 0 24 24">
            <rect x="4" y="5" width="16" height="15" rx="2.5" fill="none" stroke="#4285F4" stroke-width="2" />
            <path d="M4 9h16" stroke="#4285F4" stroke-width="2" />
            <path d="M8 3v4M16 3v4" stroke="#4285F4" stroke-width="2" stroke-linecap="round" />
            <text x="12" y="17.5" font-size="7" font-weight="700" fill="#EA4335" text-anchor="middle" font-family="Arial">31</text>
          </svg>
        </div>
        <div class="acct-meta">
          <div class="acct-title">Google Agenda</div>
          <div v-if="status.connected" class="acct-status ok">
            <span class="pulse" />Connecté · {{ status.email || 'compte Google' }}
          </div>
          <div v-else class="acct-status">Non connecté</div>
        </div>
      </div>

      <div class="acct-rows">
        <div class="acct-row"><span class="muted">Dernière synchronisation</span><span>{{ fmtDate(status.lastSyncAt) }}</span></div>
        <div class="acct-row"><span class="muted">Événements synchronisés</span><span>{{ status.syncedEventCount }} échéances</span></div>
      </div>

      <button
        v-if="status.connected"
        class="btn-accent full"
        :disabled="busy"
        @click="syncNow"
      >
        <Icon name="refresh" :size="15" :stroke="2.1" /> {{ busy ? 'Synchronisation…' : 'Synchroniser maintenant' }}
      </button>
      <button
        v-else
        class="btn-accent full"
        :disabled="busy || !status.configured"
        @click="connect"
      >
        <Icon name="sync" :size="15" :stroke="1.9" /> Connecter mon compte Google
      </button>
    </div>

    <!-- Settings -->
    <div class="card settings">
      <div class="set-row">
        <div>
          <div class="set-title">Synchronisation automatique</div>
          <div class="set-sub">Toutes les heures</div>
        </div>
        <button class="switch" :class="{ on: status.autoSync }" @click="toggle('autoSync')"><span /></button>
      </div>
      <div class="set-row">
        <div>
          <div class="set-title">Ajouter les échéances au calendrier</div>
          <div class="set-sub">Sens : Objectifs → Google</div>
        </div>
        <button class="switch" :class="{ on: status.pushDeadlines }" @click="toggle('pushDeadlines')"><span /></button>
      </div>
      <div class="set-row">
        <div>
          <div class="set-title">Rappels 24 h avant</div>
        </div>
        <button class="switch" :class="{ on: status.reminders24h }" @click="toggle('reminders24h')"><span /></button>
      </div>
    </div>

    <button v-if="status.connected" class="disconnect" @click="disconnect">Déconnecter le compte</button>
  </div>
</template>

<style scoped>
.content {
  flex: 1;
  overflow-y: auto;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 520px;
}
.banner {
  padding: 11px 14px;
  border-radius: 10px;
  font-size: 12.5px;
  border: 1px solid var(--bd);
}
.banner.ok { background: var(--soft); color: var(--accent); border-color: transparent; }
.banner.err { background: rgba(248, 113, 113, 0.12); color: var(--danger); border-color: var(--danger-bd); }
.banner.warn { background: rgba(251, 191, 36, 0.12); color: #fbbf24; border-color: rgba(251, 191, 36, 0.25); }
.banner code { font-family: ui-monospace, monospace; font-size: 11.5px; }
.acct { padding: 20px; }
.acct-head { display: flex; align-items: center; gap: 13px; margin-bottom: 16px; }
.gicon {
  width: 42px; height: 42px; flex: none; border-radius: 11px;
  background: #fff; display: flex; align-items: center; justify-content: center;
}
.acct-title { font-size: 14px; font-weight: 600; }
.acct-status { font-size: 12px; color: var(--mut); margin-top: 2px; display: flex; align-items: center; gap: 6px; }
.acct-status.ok { color: var(--accent); }
.pulse { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
.acct-rows { border-top: 1px solid var(--bd); }
.acct-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 0;
  border-bottom: 1px solid var(--bd);
  font-size: 12.5px;
}
.acct-row span:last-child { font-weight: 500; }
.full { width: 100%; justify-content: center; margin-top: 14px; }
.btn-accent:disabled { opacity: 0.5; cursor: not-allowed; }
.settings { overflow: hidden; }
.set-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 18px;
  border-bottom: 1px solid var(--bd);
}
.set-row:last-child { border-bottom: none; }
.set-title { font-size: 13px; font-weight: 500; }
.set-sub { font-size: 11.5px; color: var(--mut); margin-top: 2px; }
.switch {
  width: 40px; height: 23px;
  border-radius: 999px;
  background: var(--bd2);
  border: none;
  position: relative;
  flex: none;
  cursor: pointer;
  transition: background 0.15s ease;
}
.switch span {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.15s ease;
}
.switch.on { background: var(--accent); }
.switch.on span { left: 19px; }
.disconnect {
  background: transparent;
  color: var(--danger);
  border: 1px solid var(--danger-bd);
  border-radius: 9px;
  padding: 10px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}
.disconnect:hover { background: rgba(248, 113, 113, 0.08); }
</style>

<script setup>
defineProps({
  done: { type: Boolean, default: false },
  size: { type: Number, default: 17 },
  color: { type: String, default: 'var(--accent)' },
});
defineEmits(['toggle']);
</script>

<template>
  <button class="cc" :style="{ width: size + 'px', height: size + 'px' }" @click.stop="$emit('toggle')" :aria-pressed="done">
    <svg v-if="done" :width="size" :height="size" viewBox="0 0 24 24" :fill="color" stroke="var(--bg)" stroke-width="2.2">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-6" fill="none" stroke="var(--bg)" />
    </svg>
    <span v-else class="empty" :style="{ width: size + 'px', height: size + 'px' }" />
  </button>
</template>

<style scoped>
.cc {
  flex: none;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  display: inline-flex;
  line-height: 0;
}
.empty {
  display: block;
  border-radius: 50%;
  border: 1.8px solid var(--bd2);
}
.cc:hover .empty {
  border-color: var(--accent);
}
</style>

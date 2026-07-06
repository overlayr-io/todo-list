<script setup>
const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  stroke: { type: [Number, String], default: 1.7 },
});

// Path/markup fragments keyed by icon name, matching the mockup's SVGs.
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/>',
  layers: '<path d="M12 3l8 4-8 4-8-4 8-4z"/><path d="M4 12l8 4 8-4M4 16.5l8 4 8-4"/>',
  tag: '<path d="M4 4h7.2l8.3 8.3-7.2 7.2L4 11.2z"/><circle cx="8.3" cy="8.3" r="1.3" fill="currentColor" stroke="none"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  sync: '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3M12 8v4l3 2"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v5h-5"/>',
  checkbox: '<path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  external: '<path d="M7 17L17 7M8 7h9v9"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  repeat: '<path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
};
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    v-html="paths[name] || ''"
  />
</template>

<script setup>
defineProps({ title: { type: String, required: true } });
</script>

<template>
  <header class="page-header">
    <div class="title">{{ title }}</div>
    <div class="right"><slot /></div>
  </header>
</template>

<style scoped>
.page-header {
  height: 62px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 26px;
  border-bottom: 1px solid var(--bd);
}
.title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.right {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>

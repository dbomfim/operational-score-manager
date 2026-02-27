<script setup lang="ts">
defineProps<{
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  sizes?: number[];
}>();

const emit = defineEmits<{
  (e: "update:page", value: number): void;
  (e: "update:size", value: number): void;
}>();
</script>

<template>
  <div class="pagination">
    <div class="info">
      {{ totalElements }} itens
    </div>
    <div class="controls">
      <select
        :value="size"
        class="size-select"
        @change="emit('update:size', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="s in (sizes ?? [20, 50, 100])" :key="s" :value="s">{{ s }}</option>
      </select>
      <button
        type="button"
        class="btn"
        :disabled="!hasPrev"
        @click="emit('update:page', page - 1)"
      >
        Anterior
      </button>
      <span class="page-info">Página {{ page + 1 }} de {{ totalPages || 1 }}</span>
      <button
        type="button"
        class="btn"
        :disabled="!hasNext"
        @click="emit('update:page', page + 1)"
      >
        Próxima
      </button>
    </div>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  gap: 1rem;
}
.info {
  font-size: 0.875rem;
  color: #64748b;
}
.controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.size-select {
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
}
.btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn:hover:not(:disabled) {
  background: #e2e8f0;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.page-info {
  font-size: 0.875rem;
  color: #64748b;
}
</style>

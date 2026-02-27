<script setup lang="ts" generic="T">
defineProps<{
  columns: { key: keyof T | string; label: string; width?: string }[];
  data: T[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "row-click", row: T): void;
}>();

function getValue(row: T, key: keyof T | string): unknown {
  const k = key as keyof T;
  return row[k];
}
</script>

<template>
  <div class="data-table-wrapper">
    <table class="data-table">
      <thead>
        <tr>
          <th v-for="col in columns" :key="String(col.key)" :style="col.width ? { width: col.width } : undefined">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" class="loading-cell">Carregando...</td>
        </tr>
        <tr v-else-if="data.length === 0">
          <td :colspan="columns.length" class="empty-cell">Nenhum registro encontrado.</td>
        </tr>
        <tr
          v-else
          v-for="(row, i) in data"
          :key="i"
          class="data-row"
          @click="emit('row-click', row)"
        >
          <td v-for="col in columns" :key="String(col.key)">
            {{ getValue(row, col.key) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.data-table-wrapper {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.data-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  background: #f8fafc;
  font-weight: 500;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}
.data-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}
.data-row {
  cursor: pointer;
}
.data-row:hover {
  background: #f8fafc;
}
.loading-cell,
.empty-cell {
  text-align: center;
  color: #64748b;
  padding: 2rem !important;
}
</style>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { trpc } from "@/lib/trpc";

const stats = ref<{
  users?: { total: number; active: number; pendingInvitations: number };
  roles?: { total: number };
  models?: { total: number; active: number };
} | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    stats.value = (await (trpc as unknown as { admin: { stats: { query: () => Promise<unknown> } } }).admin.stats.query()) as typeof stats.value;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <h1>Admin Dashboard</h1>
    <div v-if="loading">Carregando...</div>
    <div v-else-if="stats" class="stats-grid">
      <div class="stat-card">
        <h3>Usuários</h3>
        <p>{{ stats.users?.total ?? 0 }} total</p>
        <p>{{ stats.users?.active ?? 0 }} ativos</p>
        <p>{{ stats.users?.pendingInvitations ?? 0 }} convites pendentes</p>
      </div>
      <div class="stat-card">
        <h3>Perfis</h3>
        <p>{{ stats.roles?.total ?? 0 }} total</p>
      </div>
      <div class="stat-card">
        <h3>Modelos</h3>
        <p>{{ stats.models?.total ?? 0 }} total</p>
        <p>{{ stats.models?.active ?? 0 }} ativos</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}
.stat-card {
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}
.stat-card h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}
.stat-card p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #64748b;
}
</style>

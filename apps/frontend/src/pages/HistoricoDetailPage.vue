<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { trpc } from "@/lib/trpc";

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref<string | null>(null);
const item = ref<{ id: string; modelo: string; dataConsulta: string; quantidadeConsultas: number } | null>(null);

const id = computed(() => decodeURIComponent(route.params.id as string));

async function load() {
  error.value = null;
  try {
    const res = await (trpc as unknown as { historico: { getById: { query: (i: { id: string }) => Promise<unknown> } } })
      .historico.getById.query({ id: id.value });
    item.value = res as { id: string; modelo: string; dataConsulta: string; quantidadeConsultas: number };
  } catch {
    error.value = "Registro não encontrado.";
  } finally {
    loading.value = false;
  }
}

function onBack() {
  router.push("/historico/consulta");
}

onMounted(load);
</script>

<template>
  <div>
    <button type="button" class="back-btn" @click="onBack">← Voltar</button>
    <h1>Detalhe do Histórico</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-else-if="loading" class="loading">Carregando...</div>
    <dl v-else-if="item" class="detail-dl">
      <dt>Data</dt>
      <dd>{{ item.dataConsulta }}</dd>
      <dt>Modelo</dt>
      <dd>{{ item.modelo }}</dd>
      <dt>Quantidade de consultas</dt>
      <dd>{{ item.quantidadeConsultas }}</dd>
    </dl>
  </div>
</template>

<style scoped>
.back-btn {
  margin-bottom: 1rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  cursor: pointer;
}
.back-btn:hover {
  background: #f8fafc;
}
.error {
  color: #dc2626;
  margin: 1rem 0;
}
.loading {
  color: #64748b;
  margin: 1rem 0;
}
.detail-dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 2rem;
  max-width: 24rem;
  margin-top: 1rem;
}
.detail-dl dt {
  font-weight: 500;
  color: #64748b;
}
.detail-dl dd {
  margin: 0;
}
</style>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { trpc } from "@/lib/trpc";
import DataTable from "@/components/common/DataTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { usePagination } from "@/composables/usePagination";

const loading = ref(true);
const clients = ref<{ id: string; name: string; taxId: string | null; isActive: boolean }[]>([]);

const pagination = usePagination(20);

async function onSizeChange(v: number) {
  pagination.size.value = v;
  pagination.reset();
}

async function fetchClients() {
  loading.value = true;
  try {
    const res = await (trpc as unknown as { clients: { list: { query: () => Promise<unknown> } } }).clients.list.query();
    const data = res as { id: string; name: string; taxId: string | null; isActive: boolean }[];
    const start = pagination.page.value * pagination.size.value;
    clients.value = data.slice(start, start + pagination.size.value);
    pagination.setTotal(data.length);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchClients);
watch([pagination.page, pagination.size], fetchClients);

const columns = [
  { key: "name", label: "Nome" },
  { key: "taxId", label: "CNPJ" },
  { key: "isActive", label: "Ativo", formatter: (v: unknown) => (v ? "Sim" : "Não") },
];
</script>

<template>
  <div>
    <h1>Clientes</h1>
    <DataTable
      :columns="columns"
      :data="clients"
      :loading="loading"
    />
    <Pagination
      :page="pagination.page.value"
      :size="pagination.size.value"
      :total-elements="pagination.totalElements.value"
      :total-pages="pagination.totalPages.value"
      :has-next="pagination.hasNext.value"
      :has-prev="pagination.hasPrev.value"
      @update:page="pagination.goToPage($event)"
      @update:size="onSizeChange"
    />
  </div>
</template>

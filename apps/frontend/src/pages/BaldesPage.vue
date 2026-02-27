<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "@/store/auth.store";
import DataTable from "@/components/common/DataTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { usePagination } from "@/composables/usePagination";

const router = useRouter();
const auth = useAuthStore();
const loading = ref(true);
const buckets = ref<{ id: string; name: string; description: string | null; category?: { name: string } }[]>([]);

const pagination = usePagination(20);

async function onSizeChange(v: number) {
  pagination.size.value = v;
  pagination.reset();
}

async function fetchBuckets() {
  loading.value = true;
  try {
    const res = await (trpc as unknown as { buckets: { list: { query: (i: unknown) => Promise<unknown> } } }).buckets.list.query({
      page: pagination.page.value,
      size: pagination.size.value,
    });
    const data = res as { content: { id: string; name: string; description: string | null; category?: { name: string } }[]; totalElements: number };
    buckets.value = data.content;
    pagination.setTotal(data.totalElements);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchBuckets);
watch([pagination.page, pagination.size], fetchBuckets);

const columns = [
  { key: "name", label: "Nome" },
  { key: "description", label: "Descrição" },
  { key: "category", label: "Categoria", formatter: (v: unknown) => (v && typeof v === "object" && "name" in v ? String((v as { name: string }).name) : "—") },
];

function onRowClick(row: { id: string }) {
  if (auth.hasPermission("buckets:update")) router.push(`/baldes/${row.id}`);
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Baldes</h1>
      <RouterLink v-if="auth.hasPermission('buckets:create')" to="/baldes/novo" class="btn-primary">
        Novo Balde
      </RouterLink>
    </div>
    <DataTable :columns="columns" :data="buckets" :loading="loading" @row-click="onRowClick" />
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

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.btn-primary {
  padding: 0.5rem 1rem;
  background: #0ea5e9;
  color: white;
  text-decoration: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}
.btn-primary:hover {
  background: #0284c7;
}
</style>

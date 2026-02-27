<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { trpc } from "@/lib/trpc";
import DataTable from "@/components/common/DataTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { usePagination } from "@/composables/usePagination";

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
</script>

<template>
  <div>
    <h1>Baldes</h1>
    <DataTable :columns="columns" :data="buckets" :loading="loading" />
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

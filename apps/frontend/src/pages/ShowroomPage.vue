<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { trpc } from "@/lib/trpc";
import DataTable from "@/components/common/DataTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { usePagination } from "@/composables/usePagination";

const loading = ref(true);
const entries = ref<{ id: string; modelName: string; modelStatus: string; isFeatured: boolean }[]>([]);

const pagination = usePagination(20);

async function onSizeChange(v: number) {
  pagination.size.value = v;
  pagination.reset();
}

async function fetchShowroom() {
  loading.value = true;
  try {
    const res = await (trpc as unknown as { showroom: { list: { query: (i: unknown) => Promise<unknown> } } }).showroom.list.query({
      page: pagination.page.value,
      size: pagination.size.value,
    });
    const data = res as { content: { id: string; modelName: string; modelStatus: string; isFeatured: boolean }[]; totalElements: number };
    entries.value = data.content;
    pagination.setTotal(data.totalElements);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchShowroom);
watch([pagination.page, pagination.size], fetchShowroom);

const columns = [
  { key: "modelName", label: "Modelo" },
  { key: "modelStatus", label: "Status" },
  { key: "isFeatured", label: "Destaque", formatter: (v: unknown) => (v ? "Sim" : "Não") },
];
</script>

<template>
  <div>
    <h1>Showroom</h1>
    <DataTable
      :columns="columns"
      :data="entries"
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

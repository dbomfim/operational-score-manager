<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { trpc } from "@/lib/trpc";
import DataTable from "@/components/common/DataTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { usePagination } from "@/composables/usePagination";

const loading = ref(true);
const models = ref<{ id: string; name: string; description: string | null }[]>([]);

const pagination = usePagination(20);

async function onSizeChange(v: number) {
  pagination.size.value = v;
  pagination.reset();
}

async function fetchModels() {
  loading.value = true;
  try {
    const res = await (trpc as unknown as { models: { list: { query: (i: unknown) => Promise<unknown> } } }).models.list.query({
      page: pagination.page.value,
      size: pagination.size.value,
    });
    models.value = (res as { content: { id: string; name: string; description: string | null }[] }).content;
    pagination.setTotal((res as { totalElements: number }).totalElements);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchModels);
watch([pagination.page, pagination.size], fetchModels);

const columns = [
  { key: "name", label: "Nome" },
  { key: "description", label: "Descrição" },
];
</script>

<template>
  <div>
    <h1>Modelos</h1>
    <DataTable
      :columns="columns"
      :data="models"
      :loading="loading"
      @row-click="(row) => console.log(row)"
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

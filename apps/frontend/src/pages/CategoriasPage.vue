<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { trpc } from "@/lib/trpc";
import DataTable from "@/components/common/DataTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { usePagination } from "@/composables/usePagination";

const loading = ref(true);
const categories = ref<{ id: string; name: string; description: string | null }[]>([]);

const pagination = usePagination(20);

async function onSizeChange(v: number) {
  pagination.size.value = v;
  pagination.reset();
}

async function fetchCategories() {
  loading.value = true;
  try {
    const res = await (trpc as unknown as { categories: { list: { query: (i: unknown) => Promise<unknown> } } }).categories.list.query({
      page: pagination.page.value,
      size: pagination.size.value,
    });
    const data = res as { content: { id: string; name: string; description: string | null }[]; totalElements: number };
    categories.value = data.content;
    pagination.setTotal(data.totalElements);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchCategories);
watch([pagination.page, pagination.size], fetchCategories);

const columns = [
  { key: "name", label: "Nome" },
  { key: "description", label: "Descrição" },
];
</script>

<template>
  <div>
    <h1>Categorias</h1>
    <DataTable :columns="columns" :data="categories" :loading="loading" />
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

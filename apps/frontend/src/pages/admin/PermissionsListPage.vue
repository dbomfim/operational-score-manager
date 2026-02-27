<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { trpc } from "@/lib/trpc";
import DataTable from "@/components/common/DataTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { usePagination } from "@/composables/usePagination";

const loading = ref(true);
const permissions = ref<{ id: string; code: string; description: string; module: string; roleCount: number }[]>([]);

const pagination = usePagination(20);

async function onSizeChange(v: number) {
  pagination.size.value = v;
  pagination.reset();
}

async function fetchPermissions() {
  loading.value = true;
  try {
    const res = await (trpc as unknown as { admin: { permissionsList: { query: (i: unknown) => Promise<unknown> } } }).admin.permissionsList.query({
      page: pagination.page.value,
      size: pagination.size.value,
    });
    const data = res as { content: { id: string; code: string; description: string; module: string; roleCount: number }[]; totalElements: number };
    permissions.value = data.content;
    pagination.setTotal(data.totalElements);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchPermissions);
watch([pagination.page, pagination.size], fetchPermissions);

const columns = [
  { key: "code", label: "Código" },
  { key: "description", label: "Descrição" },
  { key: "module", label: "Módulo" },
  { key: "roleCount", label: "Perfis" },
];
</script>

<template>
  <div>
    <h1>Recursos</h1>
    <DataTable :columns="columns" :data="permissions" :loading="loading" />
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

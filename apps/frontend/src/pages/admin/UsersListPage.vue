<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { trpc } from "@/lib/trpc";
import DataTable from "@/components/common/DataTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { usePagination } from "@/composables/usePagination";
import { formatDateTime } from "@/utils/date.utils";

const loading = ref(true);
const users = ref<{ id: string; email: string; fullName: string; isActive: boolean; lastLoginAt: string | null }[]>([]);

const pagination = usePagination(20);

async function onSizeChange(v: number) {
  pagination.size.value = v;
  pagination.reset();
}

async function fetchUsers() {
  loading.value = true;
  try {
    const res = await (trpc as unknown as { admin: { usersList: { query: (i: unknown) => Promise<unknown> } } }).admin.usersList.query({
      page: pagination.page.value,
      size: pagination.size.value,
    });
    const data = res as { content: { id: string; email: string; fullName: string; isActive: boolean; lastLoginAt: string | null }[]; totalElements: number };
    users.value = data.content;
    pagination.setTotal(data.totalElements);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchUsers);
watch([pagination.page, pagination.size], fetchUsers);

const columns = [
  { key: "email", label: "E-mail" },
  { key: "fullName", label: "Nome" },
  { key: "isActive", label: "Ativo", formatter: (v: unknown) => (v ? "Sim" : "Não") },
  { key: "lastLoginAt", label: "Último login", formatter: (v: unknown) => (v ? formatDateTime(v as string) : "—") },
];
</script>

<template>
  <div>
    <h1>Usuários</h1>
    <DataTable
      :columns="columns"
      :data="users"
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

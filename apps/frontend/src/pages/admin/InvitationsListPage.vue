<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { trpc } from "@/lib/trpc";
import DataTable from "@/components/common/DataTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { usePagination } from "@/composables/usePagination";
import { formatDateTime } from "@/utils/date.utils";

const loading = ref(true);
const invitations = ref<{ id: string; email: string; status: string; expiresAt: string; createdAt: string }[]>([]);

const pagination = usePagination(20);

async function onSizeChange(v: number) {
  pagination.size.value = v;
  pagination.reset();
}

async function fetchInvitations() {
  loading.value = true;
  try {
    const res = await (trpc as unknown as { admin: { invitationsList: { query: (i: unknown) => Promise<unknown> } } }).admin.invitationsList.query({
      page: pagination.page.value,
      size: pagination.size.value,
    });
    const data = res as { content: { id: string; email: string; status: string; expiresAt: string; createdAt: string }[]; totalElements: number };
    invitations.value = data.content;
    pagination.setTotal(data.totalElements);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchInvitations);
watch([pagination.page, pagination.size], fetchInvitations);

const columns = [
  { key: "email", label: "E-mail" },
  { key: "status", label: "Status" },
  { key: "expiresAt", label: "Expira em", formatter: (v: unknown) => (v ? formatDateTime(v as string) : "—") },
  { key: "createdAt", label: "Criado em", formatter: (v: unknown) => (v ? formatDateTime(v as string) : "—") },
];
</script>

<template>
  <div>
    <h1>Convites</h1>
    <DataTable
      :columns="columns"
      :data="invitations"
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

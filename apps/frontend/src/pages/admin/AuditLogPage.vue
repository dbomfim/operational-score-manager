<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { trpc } from "@/lib/trpc";
import DataTable from "@/components/common/DataTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { usePagination } from "@/composables/usePagination";
import { formatDateTime } from "@/utils/date.utils";

const loading = ref(true);
const entries = ref<{ id: string; actorName: string; action: string; entityType: string; entityLabel: string; timestamp: string }[]>([]);

const pagination = usePagination(20);

async function onSizeChange(v: number) {
  pagination.size.value = v;
  pagination.reset();
}

async function fetchAuditLog() {
  loading.value = true;
  try {
    const res = await (trpc as unknown as { admin: { auditLogList: { query: (i: unknown) => Promise<unknown> } } }).admin.auditLogList.query({
      page: pagination.page.value,
      size: pagination.size.value,
    });
    const data = res as { content: { id: string; actorName: string; action: string; entityType: string; entityLabel: string; timestamp: string }[]; totalElements: number };
    entries.value = data.content;
    pagination.setTotal(data.totalElements);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchAuditLog);
watch([pagination.page, pagination.size], fetchAuditLog);

const columns = [
  { key: "actorName", label: "Usuário" },
  { key: "action", label: "Ação" },
  { key: "entityType", label: "Entidade" },
  { key: "entityLabel", label: "Label" },
  { key: "timestamp", label: "Data", formatter: (v: unknown) => (v ? formatDateTime(v as string) : "—") },
];
</script>

<template>
  <div>
    <h1>Log de Auditoria</h1>
    <DataTable :columns="columns" :data="entries" :loading="loading" />
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

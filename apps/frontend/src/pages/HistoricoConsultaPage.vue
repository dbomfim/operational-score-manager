<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { trpc } from "@/lib/trpc";
import DataTable from "@/components/common/DataTable.vue";
import Pagination from "@/components/common/Pagination.vue";
import { usePagination } from "@/composables/usePagination";

const router = useRouter();
const loading = ref(true);
const chartLoading = ref(true);
const items = ref<{ id: string; modelo: string; dataConsulta: string; quantidadeConsultas: number }[]>([]);
const chartData = ref<{ data: string; quantidadeConsultas: number }[]>([]);
const filter = ref({ dataInicio: "", dataFim: "", modelo: "" });

const pagination = usePagination(20);

async function fetchList() {
  loading.value = true;
  try {
    const res = await (trpc as unknown as { historico: { list: { query: (i: unknown) => Promise<unknown> } } })
      .historico.list.query({
        page: pagination.page.value,
        size: pagination.size.value,
        filter: { dataInicio: filter.value.dataInicio || undefined, dataFim: filter.value.dataFim || undefined, modelo: filter.value.modelo || undefined },
      });
    const data = res as { content: typeof items.value; totalElements: number };
    items.value = data.content;
    pagination.setTotal(data.totalElements);
  } finally {
    loading.value = false;
  }
}

async function fetchChart() {
  chartLoading.value = true;
  try {
    const res = await (trpc as unknown as { historico: { grafico: { query: (i: unknown) => Promise<unknown> } } })
      .historico.grafico.query({
        dataInicio: filter.value.dataInicio || undefined,
        dataFim: filter.value.dataFim || undefined,
        modelo: filter.value.modelo || undefined,
      });
    chartData.value = res as { data: string; quantidadeConsultas: number }[];
  } finally {
    chartLoading.value = false;
  }
}

function applyFilter() {
  pagination.reset();
  fetchList();
  fetchChart();
}

function onRowClick(row: { id: string }) {
  router.push(`/historico/${encodeURIComponent(row.id)}`);
}

onMounted(() => {
  fetchList();
  fetchChart();
});
function onSizeChange(v: number) {
  pagination.size.value = v;
  pagination.reset();
}

watch([pagination.page, pagination.size], fetchList);

const columns = [
  { key: "dataConsulta", label: "Data" },
  { key: "modelo", label: "Modelo" },
  { key: "quantidadeConsultas", label: "Consultas" },
];

const maxChart = ref(1);
watch(chartData, (d) => {
  maxChart.value = Math.max(1, ...d.map((x) => x.quantidadeConsultas));
}, { immediate: true });
</script>

<template>
  <div>
    <h1>Histórico de Consultas</h1>
    <div class="filter-bar">
      <input v-model="filter.dataInicio" type="date" placeholder="Data início" />
      <input v-model="filter.dataFim" type="date" placeholder="Data fim" />
      <input v-model="filter.modelo" type="text" placeholder="Modelo" />
      <button type="button" @click="applyFilter">Filtrar</button>
    </div>
    <section class="chart-section">
      <h2>Consultas por data</h2>
      <div v-if="chartLoading" class="chart-placeholder">Carregando...</div>
      <div v-else-if="chartData.length === 0" class="chart-placeholder">Nenhum dado no período.</div>
      <div v-else class="chart-bars">
        <div v-for="item in chartData" :key="item.data" class="chart-row">
          <span class="chart-label">{{ item.data }}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar" :style="{ width: `${(item.quantidadeConsultas / maxChart) * 100}%` }" />
          </div>
          <span class="chart-value">{{ item.quantidadeConsultas }}</span>
        </div>
      </div>
    </section>
    <section>
      <h2>Lista</h2>
      <DataTable :columns="columns" :data="items" :loading="loading" @row-click="onRowClick" />
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
    </section>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.filter-bar input {
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
}
.filter-bar button {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  background: #0ea5e9;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
.chart-section {
  margin-bottom: 2rem;
}
.chart-placeholder {
  padding: 2rem;
  text-align: center;
  color: #64748b;
  background: #f8fafc;
  border-radius: 0.375rem;
}
.chart-bars {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.chart-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.chart-label {
  width: 6rem;
  font-size: 0.875rem;
}
.chart-bar-wrap {
  flex: 1;
  height: 1.5rem;
  background: #f1f5f9;
  border-radius: 0.25rem;
  overflow: hidden;
}
.chart-bar {
  height: 100%;
  background: #0ea5e9;
  transition: width 0.2s;
}
.chart-value {
  width: 3rem;
  font-size: 0.875rem;
  text-align: right;
}
</style>

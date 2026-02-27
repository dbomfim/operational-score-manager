<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { trpc } from "@/lib/trpc";

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const loadError = ref<string | null>(null);
const submitError = ref<string | null>(null);
const categories = ref<{ id: string; name: string }[]>([]);

const form = reactive({
  name: "",
  description: "",
  categoryId: "",
  isActive: true,
});

const id = computed(() => route.params.id as string);

async function loadCategories() {
  const list = await (trpc as unknown as { categories: { listAll: { query: () => Promise<unknown> } } })
    .categories.listAll.query();
  categories.value = (list as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name }));
}

async function load() {
  loadError.value = null;
  try {
    const bucket = await (trpc as unknown as { buckets: { getEditInfo: { query: (i: { id: string }) => Promise<unknown> } } })
      .buckets.getEditInfo.query({ id: id.value });
    const b = bucket as { name: string; description: string | null; categoryId: string; category?: { id: string; name: string }; isActive: boolean };
    form.name = b.name;
    form.description = b.description ?? "";
    form.categoryId = b.category?.id ?? b.categoryId;
    form.isActive = b.isActive;
  } catch {
    loadError.value = "Balde não encontrado.";
  }
}

function validate(): string | null {
  if (!form.name.trim()) return "Nome é obrigatório.";
  if (!form.categoryId) return "Categoria é obrigatória.";
  return null;
}

async function onSubmit() {
  submitError.value = null;
  const err = validate();
  if (err) {
    submitError.value = err;
    return;
  }
  loading.value = true;
  try {
    await (trpc as unknown as { buckets: { update: { mutate: (i: unknown) => Promise<unknown> } } })
      .buckets.update.mutate({
        id: id.value,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        categoryId: form.categoryId,
        isActive: form.isActive,
      });
    router.push("/baldes");
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : "Erro ao atualizar balde.";
  } finally {
    loading.value = false;
  }
}

function onCancel() {
  router.push("/baldes");
}

onMounted(async () => {
  await loadCategories();
  await load();
});
</script>

<template>
  <div class="form-page">
    <h1>Editar Balde</h1>
    <p v-if="loadError" class="error">{{ loadError }}</p>
    <form v-else class="form" @submit.prevent="onSubmit">
      <p v-if="submitError" class="error">{{ submitError }}</p>
      <div class="field">
        <label for="name">Nome *</label>
        <input id="name" v-model="form.name" type="text" required placeholder="Ex: Balde A" />
      </div>
      <div class="field">
        <label for="description">Descrição</label>
        <textarea id="description" v-model="form.description" rows="3" placeholder="Descrição opcional" />
      </div>
      <div class="field">
        <label for="categoryId">Categoria *</label>
        <select id="categoryId" v-model="form.categoryId" required>
          <option value="">Selecione...</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div class="field checkbox">
        <label>
          <input v-model="form.isActive" type="checkbox" />
          Ativo
        </label>
      </div>
      <div class="actions">
        <button type="submit" :disabled="loading">Salvar</button>
        <button type="button" class="secondary" @click="onCancel">Cancelar</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.form-page {
  max-width: 32rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}
.error {
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0.5rem 0 0;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}
.field input,
.field textarea,
.field select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}
.field.checkbox {
  flex-direction: row;
  align-items: center;
}
.field.checkbox label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 400;
}
.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
.actions button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
}
.actions button[type="submit"] {
  background: #0ea5e9;
  color: white;
  border: none;
}
.actions button[type="submit"]:hover:not(:disabled) {
  background: #0284c7;
}
.actions button[type="submit"]:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.actions button.secondary {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}
.actions button.secondary:hover {
  background: #f9fafb;
}
</style>

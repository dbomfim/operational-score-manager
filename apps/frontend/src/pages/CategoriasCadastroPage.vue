<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { trpc } from "@/lib/trpc";

const router = useRouter();
const loading = ref(false);
const error = ref<string | null>(null);

const form = reactive({
  name: "",
  description: "",
  percentage: 0,
  isActive: true,
});

function validate(): string | null {
  if (!form.name.trim()) return "Nome é obrigatório.";
  if (form.percentage < 0 || form.percentage > 100) return "Percentual deve ser entre 0 e 100.";
  return null;
}

async function onSubmit() {
  error.value = null;
  const err = validate();
  if (err) {
    error.value = err;
    return;
  }
  loading.value = true;
  try {
    await (trpc as unknown as { categories: { create: { mutate: (i: unknown) => Promise<unknown> } } })
      .categories.create.mutate({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        percentage: Number(form.percentage),
        isActive: form.isActive,
      });
    router.push("/categorias");
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Erro ao criar categoria.";
  } finally {
    loading.value = false;
  }
}

function onCancel() {
  router.push("/categorias");
}
</script>

<template>
  <div class="form-page">
    <h1>Nova Categoria</h1>
    <form class="form" @submit.prevent="onSubmit">
      <p v-if="error" class="error">{{ error }}</p>
      <div class="field">
        <label for="name">Nome *</label>
        <input id="name" v-model="form.name" type="text" required placeholder="Ex: Categoria A" />
      </div>
      <div class="field">
        <label for="description">Descrição</label>
        <textarea id="description" v-model="form.description" rows="3" placeholder="Descrição opcional" />
      </div>
      <div class="field">
        <label for="percentage">Percentual (0–100) *</label>
        <input id="percentage" v-model.number="form.percentage" type="number" min="0" max="100" step="0.01" />
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
  margin: 0;
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
.field textarea {
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

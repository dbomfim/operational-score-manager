<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { trpc } from "@/lib/trpc";

const route = useRoute();
const loading = ref(true);
const valid = ref(false);
const email = ref<string | null>(null);
const expiresAt = ref<string | null>(null);
const error = ref<string | null>(null);

const token = computed(() => route.query.token as string | undefined);

onMounted(async () => {
  if (!token.value) {
    error.value = "Token de convite não encontrado.";
    loading.value = false;
    return;
  }
  try {
    const res = await (trpc as unknown as { admin: { invitationsValidate: { query: (i: { token: string }) => Promise<unknown> } } }).admin.invitationsValidate.query({
      token: token.value,
    });
    const data = res as { valid: boolean; email: string | null; expiresAt: string | null };
    valid.value = data.valid;
    email.value = data.email;
    expiresAt.value = data.expiresAt;
  } catch {
    error.value = "Erro ao validar convite.";
  } finally {
    loading.value = false;
  }
});

function acceptInvite() {
  if (!valid.value || !token.value) return;
  // Redirect to Okta — after login, callback will call invitationsAccept
  window.location.href = `/login?token=${encodeURIComponent(token.value)}&invite=1`;
}
</script>

<template>
  <div class="accept-invite">
    <h1>Aceitar Convite</h1>
    <div v-if="loading">Validando convite...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="!valid" class="invalid">
      <p>Convite inválido ou expirado.</p>
    </div>
    <div v-else class="valid">
      <p>Você foi convidado para acessar o OSM com o e-mail <strong>{{ email }}</strong>.</p>
      <p v-if="expiresAt">Expira em: {{ expiresAt }}</p>
      <button type="button" class="btn-accept" @click="acceptInvite">Aceitar e entrar</button>
    </div>
  </div>
</template>

<style scoped>
.accept-invite {
  text-align: center;
  padding: 1rem;
}
.error,
.invalid {
  color: #dc2626;
}
.valid {
  color: #166534;
}
.btn-accept {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn-accept:hover {
  background: #1d4ed8;
}
</style>

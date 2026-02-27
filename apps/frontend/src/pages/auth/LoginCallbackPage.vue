<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth.store";

const router = useRouter();
const auth = useAuthStore();

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const redirect = params.get("redirect") ?? "/";
  if (token) {
    auth.setToken(token);
  }
  router.replace(redirect);
});
</script>

<template>
  <div class="callback">
    <p>Completing sign in...</p>
  </div>
</template>

<style scoped>
.callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
</style>

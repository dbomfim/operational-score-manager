<script setup lang="ts">
import { useAuthStore } from "@/store/auth.store";

const auth = useAuthStore();

function signIn() {
  // Phase 4: mock flow — will redirect to Okta in production
  const redirect = new URLSearchParams(window.location.search).get("redirect") ?? "/";
  window.location.href = `/login?token=mock-token&redirect=${encodeURIComponent(redirect)}`;
}
</script>

<template>
  <div class="sign-in">
    <h1>OSM</h1>
    <p>Operational Score Manager</p>
    <button @click="signIn">Sign in</button>
  </div>
</template>

<style scoped>
.sign-in {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
}
</style>

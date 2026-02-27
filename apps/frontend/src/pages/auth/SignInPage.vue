<script setup lang="ts">
import { useAuthStore } from "@/store/auth.store";

const auth = useAuthStore();

function signIn() {
  // Phase 4: placeholder — will redirect to Okta
  window.location.href = "/login?mock=1";
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

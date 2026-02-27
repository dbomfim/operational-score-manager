<script setup lang="ts">
import { useAuthStore } from "@/store/auth.store";

const auth = useAuthStore();
</script>

<template>
  <div>
    <h1>Modelos</h1>
    <p>Logged in: {{ auth.isLoggedIn }}</p>
  </div>
</template>

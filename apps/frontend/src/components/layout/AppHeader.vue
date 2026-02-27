<script setup lang="ts">
import { useAuthStore } from "@/store/auth.store";
import { logout } from "@/lib/auth";

const auth = useAuthStore();
</script>

<template>
  <header class="app-header">
    <div class="logo">OSM</div>
    <nav class="nav">
      <span class="user">{{ auth.token ? "User" : "—" }}</span>
      <button v-if="auth.isLoggedIn" type="button" class="btn-logout" @click="logout">Sair</button>
    </nav>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 3.5rem;
  background: #1e293b;
  color: #f8fafc;
}
.logo {
  font-weight: 700;
  font-size: 1.25rem;
}
.nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.user {
  font-size: 0.875rem;
  opacity: 0.9;
}
.btn-logout {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  background: #334155;
  color: #f8fafc;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
.btn-logout:hover {
  background: #475569;
}
</style>

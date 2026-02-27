<script setup lang="ts">
import AppHeader from "./AppHeader.vue";
import NavMenu from "./NavMenu.vue";
</script>

<template>
  <div class="private-layout">
    <AppHeader />
    <div class="body">
      <aside class="sidebar">
        <NavMenu />
      </aside>
      <main class="main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.private-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.sidebar {
  flex-shrink: 0;
}
.main {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
  background: #fff;
}
</style>

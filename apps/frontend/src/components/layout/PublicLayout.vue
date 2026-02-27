<script setup lang="ts">
</script>

<template>
  <div class="public-layout">
    <div class="card">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.public-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}
.card {
  width: 100%;
  max-width: 24rem;
  padding: 2rem;
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>

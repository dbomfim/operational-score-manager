<script setup lang="ts">
import { ref, onMounted } from "vue";

const health = ref<Record<string, unknown> | null>(null);

onMounted(async () => {
  try {
    const res = await fetch("/health", {
      headers: { Accept: "application/json" },
    });
    health.value = await res.json();
  } catch {
    health.value = { error: "Failed to fetch" };
  }
});
</script>

<template>
  <div>
    <h1>Health</h1>
    <pre>{{ health }}</pre>
  </div>
</template>

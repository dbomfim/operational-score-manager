<script setup lang="ts">
import { computed } from "vue";
import { useRoute, RouterLink } from "vue-router";

const route = useRoute();

const breadcrumbs = computed(() => {
  const parts: { label: string; path?: string }[] = [{ label: "Admin", path: "/admin" }];
  const rest = route.path.replace(/^\/admin\/?/, "") || "";
  const pathSegments = rest ? rest.split("/").filter(Boolean) : [];
  const labels: Record<string, string> = {
    users: "Usuários",
    invitations: "Convites",
    roles: "Perfis",
    permissions: "Recursos",
    "audit-log": "Log de Auditoria",
  };
  for (let i = 0; i < pathSegments.length; i++) {
    const seg = pathSegments[i];
    if (!seg) continue;
    const acc = "/admin/" + pathSegments.slice(0, i + 1).join("/");
    const isLast = i === pathSegments.length - 1;
    parts.push({ label: labels[seg] ?? seg, path: isLast ? undefined : acc });
  }
  const first = parts[0];
  if (first && parts.length === 1) first.path = undefined; // Dashboard: Admin is current
  return parts;
});
</script>

<template>
  <div class="admin-layout">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li v-for="(crumb, i) in breadcrumbs" :key="`${i}-${crumb.label}`">
          <RouterLink v-if="crumb.path" :to="crumb.path" class="crumb-link">
            {{ crumb.label }}
          </RouterLink>
          <span v-else class="crumb-current">{{ crumb.label }}</span>
          <span v-if="i < breadcrumbs.length - 1" class="separator" aria-hidden="true">/</span>
        </li>
      </ol>
    </nav>
    <div class="admin-content">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.breadcrumb ol {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
  color: #64748b;
}
.breadcrumb li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.crumb-link {
  color: #0ea5e9;
  text-decoration: none;
}
.crumb-link:hover {
  text-decoration: underline;
}
.crumb-current {
  color: #0f172a;
  font-weight: 500;
}
.separator {
  color: #94a3b8;
  user-select: none;
}
.admin-content {
  flex: 1;
}
</style>

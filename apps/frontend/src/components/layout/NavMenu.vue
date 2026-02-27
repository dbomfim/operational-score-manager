<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useAuthStore } from "@/store/auth.store";
import { NAV_MENU } from "@/constants/nav-menu";

const auth = useAuthStore();

function canShow(item: (typeof NAV_MENU)[number]): boolean {
  if (!item.permission) return true;
  return auth.hasPermission(item.permission);
}
</script>

<template>
  <nav class="nav-menu">
    <ul>
      <li v-for="item in NAV_MENU" :key="item.path">
        <template v-if="canShow(item)">
          <RouterLink
            v-if="!item.children"
            :to="item.path"
            class="nav-link"
            active-class="nav-link-active"
          >
            {{ item.label }}
          </RouterLink>
          <template v-else>
            <RouterLink :to="item.path" class="nav-link" active-class="nav-link-active">
              {{ item.label }}
            </RouterLink>
            <ul>
              <li v-for="child in item.children" :key="child.path">
                <RouterLink :to="child.path" class="nav-link nav-link-child" active-class="nav-link-active">
                  {{ child.label }}
                </RouterLink>
              </li>
            </ul>
          </template>
        </template>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.nav-menu {
  width: 12rem;
  padding: 1rem 0;
  background: #f1f5f9;
  border-right: 1px solid #e2e8f0;
}
.nav-menu ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.nav-menu li {
  margin: 0;
}
.nav-menu li ul {
  padding-left: 1rem;
}
.nav-link {
  display: block;
  padding: 0.5rem 1rem;
  color: #475569;
  text-decoration: none;
  font-size: 0.875rem;
}
.nav-link:hover {
  background: #e2e8f0;
  color: #1e293b;
}
.nav-link-active {
  background: #e2e8f0;
  color: #0f172a;
  font-weight: 500;
}
.nav-link-child {
  font-size: 0.8125rem;
}
</style>

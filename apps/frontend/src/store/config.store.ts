import { defineStore } from "pinia";
import { ref } from "vue";
import { trpc } from "@/lib/trpc";
import { LOCAL_STORAGE_KEYS } from "@/constants/storage-keys";
import { getWithTTL, setWithTTL } from "@/utils/storage.utils";

const TTL_MS = 30 * 60 * 1000; // 30 min

export type LookupConfigs = Record<string, { id: string; description: string; isActive: boolean; name?: string; color?: string }[]>;

export const useConfigStore = defineStore("config", () => {
  const lookupConfigs = ref<LookupConfigs | null>(null);

  async function fetchLookupConfigs(): Promise<LookupConfigs> {
    const cached = getWithTTL(LOCAL_STORAGE_KEYS.LOOKUP_CONFIG, (s) => JSON.parse(s) as LookupConfigs);
    if (cached) {
      lookupConfigs.value = cached;
      return cached;
    }
    const configs = (await (trpc as unknown as { lookup: { all: { query: () => Promise<unknown> } } }).lookup.all.query()) as LookupConfigs;
    lookupConfigs.value = configs;
    setWithTTL(LOCAL_STORAGE_KEYS.LOOKUP_CONFIG, JSON.stringify(configs), TTL_MS);
    return configs;
  }

  function getLookup(entity: string): { id: string; description: string; isActive: boolean; name?: string; color?: string }[] {
    return lookupConfigs.value?.[entity] ?? [];
  }

  function invalidateCache() {
    lookupConfigs.value = null;
    localStorage.removeItem(LOCAL_STORAGE_KEYS.LOOKUP_CONFIG);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.LOOKUP_CONFIG + "_ttl");
  }

  return {
    lookupConfigs,
    fetchLookupConfigs,
    getLookup,
    invalidateCache,
  };
});

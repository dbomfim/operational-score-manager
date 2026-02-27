import { ref, computed } from "vue";

export interface PaginationState {
  page: number;
  size: number;
  totalElements: number;
}

export function usePagination(initialSize = 20) {
  const page = ref(0);
  const size = ref(initialSize);
  const totalElements = ref(0);

  const totalPages = computed(() => Math.ceil(totalElements.value / size.value) || 0);
  const hasNext = computed(() => page.value < totalPages.value - 1);
  const hasPrev = computed(() => page.value > 0);

  function setTotal(total: number) {
    totalElements.value = total;
  }

  function nextPage() {
    if (hasNext.value) page.value++;
  }

  function prevPage() {
    if (hasPrev.value) page.value--;
  }

  function goToPage(p: number) {
    page.value = Math.max(0, Math.min(p, totalPages.value - 1));
  }

  function reset() {
    page.value = 0;
  }

  return {
    page,
    size,
    totalElements,
    totalPages,
    hasNext,
    hasPrev,
    setTotal,
    nextPage,
    prevPage,
    goToPage,
    reset,
  };
}

import { LOCAL_STORAGE_KEYS } from "@/constants/storage-keys";

const TOKEN_KEY = LOCAL_STORAGE_KEYS.ACCESS_TOKEN;

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function logout(): void {
  clearAccessToken();
  window.location.href = "/sign-in";
}

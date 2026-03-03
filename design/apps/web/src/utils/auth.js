export const AUTH_STORAGE_KEY = "dashboard-auth";
export const DASHBOARD_USERNAME = "djppr";
export const DASHBOARD_PASSWORD = "2006Dec08";

export function isDashboardAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(AUTH_STORAGE_KEY) === "1";
}

export function setDashboardAuthenticated() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, "1");
}

export function clearDashboardAuthenticated() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(AUTH_STORAGE_KEY);
}

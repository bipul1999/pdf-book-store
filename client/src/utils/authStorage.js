export function getStoredToken() {
  return sessionStorage.getItem("pbs_token") || localStorage.getItem("pbs_token");
}

export function getStoredUser() {
  const raw = sessionStorage.getItem("pbs_user") || localStorage.getItem("pbs_user") || "null";
  return JSON.parse(raw);
}

export function saveStoredSession(data) {
  sessionStorage.setItem("pbs_token", data.token);
  sessionStorage.setItem("pbs_user", JSON.stringify(data.user));
  localStorage.removeItem("pbs_token");
  localStorage.removeItem("pbs_user");
}

export function migrateStoredSession() {
  const token = getStoredToken();
  const user = getStoredUser();
  if (token) sessionStorage.setItem("pbs_token", token);
  if (user) sessionStorage.setItem("pbs_user", JSON.stringify(user));
  localStorage.removeItem("pbs_token");
  localStorage.removeItem("pbs_user");
  return { token, user };
}

export function clearStoredSession() {
  sessionStorage.removeItem("pbs_token");
  sessionStorage.removeItem("pbs_user");
  localStorage.removeItem("pbs_token");
  localStorage.removeItem("pbs_user");
}

import type { User } from "@/context/AuthContext";

const SESSION_KEY = "shm_member_session_v1";

export interface StoredSession {
  user: User;
  loginAt: string;
}

export function buildSession(user: User): StoredSession {
  return { user, loginAt: new Date().toISOString() };
}

export function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (session.user.token) localStorage.setItem("authToken", session.user.token);
    localStorage.setItem("user_generated_id", session.user.generated_id);
  } catch (error) {
    console.error("[offline/session] Failed to persist session:", error);
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.user) return null;
    return { user: parsed.user, loginAt: parsed.loginAt || new Date().toISOString() };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
  localStorage.removeItem("user_generated_id");
}

export function touchSession(): void {}

export type SessionValidity =
  | { status: "valid" }
  | { status: "none" };

export function evaluateSession(session: StoredSession | null): SessionValidity {
  return session ? { status: "valid" } : { status: "none" };
}

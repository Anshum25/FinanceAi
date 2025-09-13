export type ApiUser = {
  _id: string;
  name: string;
  email: string;
};

const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:3001";

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
    ...options,
  });
  const text = await res.text().catch(() => "");
  try {
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      let message = json?.message || json?.error || `Request failed with ${res.status}`;
      if (Array.isArray(json?.errors) && json.errors.length) {
        const details = json.errors.map((e: any) => e.msg || e.message).filter(Boolean).join('\n');
        if (details) message = details;
      }
      throw new Error(message);
    }
    return json as T;
  } catch (e) {
    if (!res.ok) {
      // If response wasn't JSON, use raw text
      throw new Error(text || `Request failed with ${res.status}`);
    }
    // Successful but non-JSON (unlikely for our API)
    return text as unknown as T;
  }
}

export const api = {
  async signup(input: { name: string; email: string; password: string; passwordConfirm: string }) {
    return request<{ status: string; token: string; data: { user: ApiUser } }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async login(input: { email: string; password: string }) {
    return request<{ status: string; token: string; data: { user: ApiUser } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};

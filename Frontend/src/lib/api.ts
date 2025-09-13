export interface ApiUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  createdAt?: string;
};

const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:3002";

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

  async me() {
    return request<{ status: string; data: { user: ApiUser } }>("/api/auth/me", {
      method: "GET",
    });
  },

  async logout() {
    return request<{ status: string }>("/api/auth/logout", {
      method: "POST",
    });
  },

  // Document upload endpoints
  async uploadDocuments(documentType: string, files: File[]) {
    const formData = new FormData();
    formData.append('documentType', documentType);
    
    files.forEach(file => {
      formData.append('documents', file);
    });

    return fetch(`${BASE_URL}/api/documents/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then(async (res) => {
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
        return json;
      } catch (e) {
        if (!res.ok) {
          throw new Error(text || `Request failed with ${res.status}`);
        }
        return text as unknown;
      }
    });
  },

  async getDocuments(documentType?: string) {
    const params = documentType ? `?documentType=${documentType}` : '';
    return request<{ status: string; results: number; data: { documents: any[] } }>(`/api/documents${params}`, {
      method: "GET",
    });
  },

  async checkDocumentsForPermissions() {
    return request<{ status: string; data: { hasDocuments: Record<string, boolean> } }>("/api/documents/check-permissions", {
      method: "GET",
    });
  },

  async deleteDocument(documentId: string) {
    return request<{ status: string }>(`/api/documents/${documentId}`, {
      method: "DELETE",
    });
  },

  // Profile management endpoints
  async updateProfile(profileData: { name: string; email: string; phone: string }) {
    return request<{ status: string; data: { user: ApiUser } }>("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return request<{ status: string }>("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async uploadProfilePicture(file: File) {
    const formData = new FormData();
    formData.append('profilePicture', file);

    return fetch(`${BASE_URL}/api/auth/profile-picture`, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then(async (res) => {
      const text = await res.text().catch(() => "");
      try {
        const json = text ? JSON.parse(text) : {};
        if (!res.ok) {
          let message = json?.message || json?.error || `Request failed with ${res.status}`;
          throw new Error(message);
        }
        return json;
      } catch (e) {
        if (!res.ok) {
          throw new Error(text || `Request failed with ${res.status}`);
        }
        return text as unknown;
      }
    });
  },

  async deleteAccount() {
    return request("/api/auth/delete-account", {
      method: "DELETE",
    });
  },
};

export const deleteAccount = async (): Promise<void> => {
  return request("/api/auth/delete-account", {
    method: "DELETE",
  });
};

// Financial Data API endpoints
export const getAssets = async (): Promise<any[]> => {
  return request("/api/data/assets", {
    method: "GET",
  });
};

export const getLiabilities = async (): Promise<any[]> => {
  return request("/api/data/liabilities", {
    method: "GET",
  });
};

export const getTransactions = async (): Promise<any[]> => {
  return request("/api/data/transactions", {
    method: "GET",
  });
};

export const getInvestments = async (): Promise<any[]> => {
  return request("/api/data/investments", {
    method: "GET",
  });
};

export const getUserPermissions = async (): Promise<any> => {
  return request("/api/permissions", {
    method: "GET",
  });
};

export const updateUserPermissions = async (permissions: any): Promise<any> => {
  return request("/api/permissions", {
    method: "PUT",
    body: JSON.stringify(permissions),
  });
};

export const seedSampleData = async (): Promise<any> => {
  return request("/api/seed/seed-data", {
    method: "POST",
  });
};

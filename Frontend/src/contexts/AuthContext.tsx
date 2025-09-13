import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (user: Omit<AuthUser, "id">) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // In-memory auth user; do not persist in localStorage as per requirement
  const [user, setUser] = useState<AuthUser | null>(null);

  const login: AuthContextType["login"] = ({ name, email }) => {
    // In a real app, call backend and store tokens. Here we mock an id.
    setUser({ id: crypto.randomUUID(), name, email });
  };

  const logout = () => setUser(null);

  const value = useMemo<AuthContextType>(
    () => ({ isAuthenticated: !!user, user, login, logout }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

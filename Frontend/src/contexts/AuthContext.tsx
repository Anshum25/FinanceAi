import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  createdAt?: string;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await api.me();
        setUser(res.data.user);
      } catch (error) {
        setUser(null);
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  const login: AuthContextType["login"] = (user) => {
    setUser(user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const value = useMemo<AuthContextType>(
    () => ({ isAuthenticated: !!user, user, login, logout, loading }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

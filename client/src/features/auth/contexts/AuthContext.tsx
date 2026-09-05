"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, authService } from "../services/auth.service";
import { getToken, removeToken } from "@/lib/utils/token";
import { ApiError } from "@/lib/api/client";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: () => {},
  setUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await authService.getMe();
        setUser(data.user);
      } catch (error) {
        const isExpectedAuthError =
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403);

        if (!isExpectedAuthError) {
          console.error("Failed to fetch user:", error);
        }

        // Any failure in bootstrap user fetch means current client auth state
        // is unusable for this render cycle, so clear persisted token/session.
        removeToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const logout = () => {
    removeToken();
    setUser(null);
    window.location.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

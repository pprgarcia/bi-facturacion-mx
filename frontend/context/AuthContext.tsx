'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';

// Definimos la interfaz exacta que devuelve tu FastAPI
interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  checkUserStatus: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

const checkUserStatus = async (): Promise<void> => {
    console.log("🔍 Verificando sesión..."); // LOG DE RASTRO
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      
      if (!API_URL) {
        console.error("❌ Error: NEXT_PUBLIC_API_URL no está definida en .env.local");
        setLoading(false); // Destrabamos la pantalla aunque falle
        return;
      }

      const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
      
      if (res.ok) {
        const data: User = await res.json();
        console.log("✅ Sesión activa encontrada:", data.full_name);
        setUser(data);
      } else {
        console.warn("⚠️ No hay sesión activa (401)");
        setUser(null);
      }
    } catch (err) {
      console.error("❌ Error de red al verificar sesión:", err);
      setUser(null);
    } finally {
      console.log("🔓 Finalizando estado de carga.");
      setLoading(false); // ESTO DEBE EJECUTARSE SIEMPRE
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      
      // 1. Llamamos al servidor para que destruya la cookie
      await fetch(`${API_URL}/api/auth/logout`, { 
        method: 'POST', 
        credentials: 'include' 
      });

      // 2. Limpiamos el estado local de React inmediatamente
      setUser(null);

      // 3. Opcional: Redirigir o limpiar caché pesada
      // window.location.href = "/"; // Esto es más drástico y efectivo que reload()
      window.location.reload(); 
      
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    checkUserStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, checkUserStatus, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};
'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginView() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { checkUserStatus } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister 
      ? { email, password, full_name: fullName } 
      : { email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include', // INDISPENSABLE para las cookies HttpOnly
      });

      const data = await res.json();

      if (res.ok) {
        if (isRegister) {
          // Si se registró con éxito, lo pasamos al modo login automáticamente
          alert("Cuenta creada. Ahora puedes iniciar sesión.");
          setIsRegister(false);
        } else {
        setTimeout(async () => {
          await checkUserStatus();
        }, 500);
        }
      } else {
        setError(data.detail || 'Hubo un error en la solicitud');
      }
    } catch {
      // Eliminamos 'err' no usado (ESLint fix)
      setError('No se pudo conectar con el servidor de inteligencia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Título */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
            Supertienda <span className="text-indigo-400">BI</span>
          </h1>
          <p className="text-slate-400">Sistema de Análisis y Control de Datos</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg border border-white/10 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {isRegister ? 'Crear nueva cuenta' : 'Iniciar Sesión'}
          </h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm mb-6 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre Completo</label>
                <input 
                  type="text" required
                  className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="Ej: Juan Pérez"
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email Corporativo</label>
              <input 
                type="email" required
                className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="usuario@supertienda.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
              <input 
                type="password" required
                className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-indigo-900/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : (isRegister ? 'Registrarme' : 'Entrar al Dashboard')}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition"
            >
              {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes acceso? Regístrate aquí'}
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-slate-500 text-xs">
          &copy; 2026 Supertienda Analytics. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
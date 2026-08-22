'use client';

import React, { useEffect, useState, useCallback } from 'react'; // Importamos useCallback
import { 
  UserCheck, History, Ban, Shield, UserMinus
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// --- INTERFACES ---
interface UserEntry {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'viewer';
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
}

interface AuditLogEntry {
  id: number;
  admin_name: string;
  target_user_email: string;
  action: string;
  details: string;
  timestamp: string;
}


export default function GovernanceView() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'logs'>('users');
  const [loading, setLoading] = useState<boolean>(true);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // --- FUNCIÓN DE CARGA BLINDADA CON USECALLBACK ---
const fetchData = useCallback(async (signal?: AbortSignal): Promise<void> => {
  if (!API_URL) return;
  
  setLoading(true);
  try {
    const [uRes, lRes] = await Promise.all([
      fetch(`${API_URL}/api/auth/users/all`, { credentials: 'include', signal }), // <--- Pasar señal
      fetch(`${API_URL}/api/auth/audit-logs`, { credentials: 'include', signal }) // <--- Pasar señal
    ]);
    
    if (uRes.ok) setUsers(await uRes.json());
    if (lRes.ok) setLogs(await lRes.json());
    } catch (error: unknown) { // <--- CAMBIA 'any' por 'unknown'
      if (error instanceof Error && error.name === 'AbortError') return; 
      console.error("Error cargando gobernanza:", error);
    } finally {
    setLoading(false);
  }
}, [API_URL]);

useEffect(() => {
  const controller = new AbortController();
  fetchData(controller.signal);

  return () => controller.abort(); // Cancela la petición si cambias de pestaña rápido
}, [fetchData]);

  // --- MANEJADOR DE ACCIONES ---
  const handleUpdateStatus = async (userId: string, newStatus: string, newRole?: string): Promise<void> => {
    try {
      const res = await fetch(`${API_URL}/api/auth/users/${userId}/governance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, role: newRole || undefined }),
        credentials: 'include'
      });
      
      if (res.ok) {
        await fetchData(); // Aquí ya no marcará error de "no definido"
      } else {
        alert("No se pudo actualizar el permiso.");
      }
    } catch {
      alert("Error de conexión.");
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-indigo-600 font-mono">Sincronizando registros de seguridad...</div>;

  
    const handleDeleteUser = async (userId: string, email: string): Promise<void> => {
    // Confirmación de seguridad
    if (!window.confirm(`¿Estás TOTALMENTE seguro de eliminar permanentemente a ${email}? Esta acción no se puede deshacer.`)) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/auth/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
        });

        if (res.ok) {
        alert("Usuario eliminado con éxito.");
        await fetchData(); // Recargamos la lista y la bitácora
        } else {
        const data = await res.json();
        alert(data.detail || "Error al eliminar usuario.");
        }
    } catch {
        alert("Error de conexión al intentar eliminar.");
    }
    };

  if (loading) return <div className="p-10 text-center animate-pulse text-indigo-600 font-mono">Sincronizando registros de seguridad...</div>;

  // Función para forzar la conversión de UTC a México
    const formatFechaMexico = (fechaStr: string) => {
    if (!fechaStr) return "-";
    
    // Si la fecha no termina en Z o +00:00, se la agregamos para que el 
    // navegador sepa que lo que viene del servidor es UTC puro.
    const dateObj = new Date(fechaStr.endsWith('Z') ? fechaStr : `${fechaStr}Z`);
    
    return dateObj.toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    };


  return (
    <div className="space-y-6">
      {/* 
          AQUÍ VA EL RESTO DE TU JSX (El diseño de las tablas y botones)
          Se mantiene exactamente igual al que ya tenías 
      */}
      <div className="flex gap-4 border-b border-slate-200 mb-6">
        <button 
          onClick={() => setActiveSubTab('users')}
          className={`pb-2 px-4 font-bold transition-all ${activeSubTab === 'users' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-slate-400'}`}
        >
          Control de Acceso
        </button>
        <button 
          onClick={() => setActiveSubTab('logs')}
          className={`pb-2 px-4 font-bold transition-all ${activeSubTab === 'logs' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-slate-400'}`}
        >
          Bitácora Inmutable
        </button>
      </div>

      {activeSubTab === 'users' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Estatus</th>
                <th className="px-6 py-4 text-center">Registro</th> 
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
             <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-700">{u.full_name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono uppercase text-slate-500">
                    {u.role === 'owner' ? <span className="text-indigo-600 font-bold">👑 {u.role}</span> : u.role}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      u.status === 'active' ? 'bg-green-100 text-green-700' :
                      u.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-center">
                    {new Date(u.created_at).toLocaleString('es-MX', {
                      timeZone: 'America/Mexico_City',
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', hour12: true
                    })}
                  </td>
                    <td className="px-6 py-4 text-right">
                    {/* 
                        La condición de JavaScript debe estar ADENTRO del <td>.
                        No pongas otro <td> aquí adentro.
                    */}
                    {u.id !== user?.id ? (
                        <div className="flex justify-end gap-2">
                        {u.status !== 'active' && (
                            <button onClick={() => handleUpdateStatus(u.id, 'active')} className="p-2 hover:bg-green-50 text-green-600 rounded-lg" title="Activar">
                            <UserCheck size={18} />
                            </button>
                        )}
                        {u.status === 'active' && (
                            <button onClick={() => handleUpdateStatus(u.id, 'suspended')} className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg" title="Suspender">
                            <Ban size={18} />
                            </button>
                        )}
                        {u.role === 'viewer' && u.status === 'active' && (
                            <button onClick={() => handleUpdateStatus(u.id, 'active', 'admin')} className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg" title="Hacer Admin">
                            <Shield size={18} />
                            </button>
                        )}
                        {u.role !== 'owner' && (
                            <button onClick={() => handleDeleteUser(u.id, u.email)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg" title="Eliminar">
                            <UserMinus size={18} />
                            </button>
                        )}
                        </div>
                    ) : (
                        /* Si es el mismo usuario, mostramos un texto simple, NO un <td> */
                        <span className="text-[10px] text-slate-300 italic font-medium pr-2">
                        Sesión activa
                        </span>
                    )}
                    </td>
                                    
                    <td className="px-6 py-4 text-sm text-gray-500 text-center">
                    {formatFechaMexico(u.created_at)}
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-start gap-4 shadow-sm">
              <div className="bg-slate-100 p-2 rounded-xl text-slate-500"><History size={20} /></div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-slate-800">{log.admin_name} <span className="font-normal text-slate-400">realizó una acción</span></span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.timestamp).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', hour12: true })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Sobre <span className="font-bold">{log.target_user_email}</span>: <span className="text-purple-600 font-medium">{log.details}</span>
                </p>
                    <span className="text-[10px] text-slate-400">
                    {formatFechaMexico(log.timestamp)}
                    </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
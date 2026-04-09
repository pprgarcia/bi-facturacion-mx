"use client";

import React, { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, Edit3, Save, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface InsightProps {
  pageName: string;
}

export default function ExecutiveInsight({ pageName }: InsightProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [info, setInfo] = useState({ author: "", date: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [tempContent, setTempContent] = useState("");
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const fetchInsight = useCallback(async () => {
    if (!API_URL) return;

    try {
      const res = await fetch(`${API_URL}/api/insights/${pageName}`, {
        credentials: "include",
      });
      const data = await res.json();
      setContent(data.content);
      setTempContent(data.content);
      setInfo({
        author: data.updated_by_name,
        date: data.updated_at
          ? new Date(data.updated_at).toLocaleString("es-MX")
          : "",
      });
    } catch (e) {
      console.error("Error cargando insight:", e);
    } finally {
      setLoading(false);
    }
  }, [API_URL, pageName]); 

    // 3. Ahora podemos incluirla en el array de dependencias sin riesgo
  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]); 

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_URL}/api/insights/${pageName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tempContent }),
        credentials: "include",
      });
      if (res.ok) {
        setIsEditing(false);
        fetchInsight();
      }
    } catch {
      alert("Error al guardar");
    }
  };

  if (loading)
    return <div className="h-20 bg-slate-50 animate-pulse rounded-2xl" />;

  return (
    <div className="mt-10 bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-800 relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />

      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-xl">
            <LayoutDashboard size={20} className="text-purple-400" />
          </div>
          <div>
            <h4 className="text-white font-black text-sm uppercase tracking-widest">
              Executive Insight
            </h4>
            {info.author && (
              <p className="text-[10px] text-slate-500 font-medium">
                Actualizado por:{" "}
                <span className="text-slate-300">{info.author}</span> •{" "}
                {info.date}
              </p>
            )}
          </div>
        </div>

        {user?.role !== "viewer" && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Edit3 size={14} /> Editar Conclusión
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <textarea
            value={tempContent}
            onChange={(e) => setTempContent(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 p-4 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-purple-500 outline-none h-32"
            placeholder="Escribe la directriz estratégica para este análisis..."
          />
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs text-slate-400 font-bold hover:text-white transition-colors flex items-center gap-2"
            >
              <X size={14} /> Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-500 transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20"
            >
              <Save size={14} /> Guardar Directriz
            </button>
          </div>
        </div>
      ) : (
        <p className="text-slate-300 text-sm leading-relaxed italic font-medium whitespace-pre-wrap">
          {content}
        </p>
      )}
    </div>
  );
}

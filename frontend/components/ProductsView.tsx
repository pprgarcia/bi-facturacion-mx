'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, ScatterChart, Scatter, ReferenceLine 
} from 'recharts';
import CustomTooltip from './shared/CustomTooltip';
import ExecutiveInsight from './ExecutiveInsight';

// --- 1. INTERFACES ESTRICTAS (Eliminan errores de ESLint) ---
interface ShippingEntry {
  name: string;
  fullName: string;
  shipping_cost: number;
  profit: number;
  order_id?: string;
}

interface LossEntry {
  name: string;
  fullName: string;
  loss_amount: number;
  sales: number;
}

interface BottomEntry {
  name: string;
  fullName: string;
  sales: number;
}

interface ProductAnalysisData {
  shipping: ShippingEntry[];
  top_losses: LossEntry[];
  bottom_20: BottomEntry[];
}

export default function ProductsView() {
  // 2. Estado tipado correctamente
  const [data, setData] = useState<ProductAnalysisData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products-analysis`,{
      credentials: 'include' // <--- CLAVE PARA QUE FUNCIONE CON COOKIES HttpOnly
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json: ProductAnalysisData) => {
        setData(json);
        setMounted(true);
      })
      .catch(() => setError(true));
  }, []);

  if (error) return (
    <div className="p-20 text-center">
      <p className="text-rose-500 font-bold text-xl">Error: El servidor no responde.</p>
      <p className="text-slate-400 mt-2">Verifica la terminal de FastAPI.</p>
    </div>
  );

  if (!mounted || !data) return (
    <div className="flex items-center justify-center h-96">
      <p className="text-purple-600 font-bold animate-pulse italic text-lg text-center">
        Auditando fletes y rentabilidad de 300 operaciones críticas...
      </p>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <header>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Análisis de Productos y Logística</h1>
        <p className="text-slate-500 font-medium">Enfoque en los 300 fletes de mayor costo</p>
      </header>

      {/* 1. SCATTER CHART - LOGÍSTICA (EJE X INICIA EN $0) */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-125 flex flex-col w-full">
        <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-6 italic text-center lg:text-left">
          Impacto de Envíos Caros en la Utilidad (poner el mouse sobre los puntos)
        </h3>
        {mounted ? (
        <div className="flex-1 w-full" style={{ minHeight: '400px' }}>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ left: 20, bottom: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                type="number" 
                dataKey="shipping_cost" 
                name="Gasto Envío" 
                unit="$" 
                tick={{fill: '#94a3b8', fontSize: 10}} 
                axisLine={false} 
                tickLine={false} 
                domain={[0, 'auto']} // PERSPECTIVA REAL DESDE $0
                tickFormatter={(v: number) => `$${v.toLocaleString()}`}
              />
              <YAxis 
                type="number" 
                dataKey="profit" 
                name="Profit" 
                unit="$" 
                tick={{fill: '#94a3b8', fontSize: 10}} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(v: number) => `$${(v/1000).toFixed(1)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />
              <Scatter data={data.shipping}>
                {/* SOLUCIÓN LÍNEA 82: Tipado explícito de 'entry' */}
                {data.shipping?.map((entry: ShippingEntry, index: number) => (
                  <Cell 
                    key={`cell-ship-${index}`} 
                    fill={entry.profit < 0 ? '#fb7185' : '#8b5cf6'} 
                    fillOpacity={0.6}
                    r={5} 
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        ) : (
          <div className="h-80 w-full bg-slate-100 animate-pulse rounded-xl">Mientras carga</div> // Un placeholder mientras carga
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {/* 2. RANKING PÉRDIDAS EN DINERO REAL */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-137.5 flex flex-col">
          <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-6 italic text-center lg:text-left">
            Top 25: Productos con Mayor Pérdida ($)
          </h3>
          <div className="flex-1 w-full" style={{ minHeight: '450px' }}>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={data.top_losses} layout="vertical" margin={{ left: 10, right: 40, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  tickFormatter={(v: number) => `$${Math.abs(v).toLocaleString()}`} 
                  tick={{fill: '#94a3b8', fontSize: 10}} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 9, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="loss_amount" name="Pérdida Neta" radius={[0, 4, 4, 0]} barSize={12}>
                   {/* SOLUCIÓN LÍNEA 114: Tipado explícito de 'entry' */}
                   {data.top_losses?.map((entry: LossEntry, index: number) => (
                    <Cell key={`cell-loss-${index}`} fill="#fb7185" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. BOTTOM VENTAS */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-137.5 flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 text-center lg:text-left italic">
            Productos con Menor Desplazamiento ($)
          </h3>
          <div className="flex-1 w-full" style={{ minHeight: '450px' }}>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={data.bottom_20} layout="vertical" margin={{ left: 10, right: 40, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  tickFormatter={(v: number) => `$${v.toFixed(0)}`} 
                  tick={{fill: '#94a3b8', fontSize: 10}} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 9, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="sales" name="Ventas" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
          <ExecutiveInsight pageName="products" />
    </div>
  );
}
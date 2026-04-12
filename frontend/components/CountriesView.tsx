'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, ScatterChart, Scatter, ReferenceLine, ZAxis
} from 'recharts';
import { Globe } from 'lucide-react';
import CustomTooltip from './shared/CustomTooltip';
import ExecutiveInsight from './ExecutiveInsight';

// --- INTERFACES ---
interface CountryProfit { country: string; profit: number; sales: number; }
interface ShippingRelation { country: string; avg_shipping: number; profit_margin: number; }
interface CriticalGeo { country: string; count: number; }
interface BubbleData { country: string; sales: number; profit: number; orders: number; }

interface CountriesAnalysisData {
  outlier: BubbleData;
  bottom_countries: CountryProfit[];
  shipping_relation: ShippingRelation[];
  critical_geo: CriticalGeo[];
  bubble_data: BubbleData[];
}

export default function CountriesView() {
  const [data, setData] = useState<CountriesAnalysisData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/countries-analysis`,{
      credentials: 'include' // <--- CLAVE PARA QUE FUNCIONE CON COOKIES HttpOnly
    })
      .then(res => res.json())
      .then((json: CountriesAnalysisData) => {
        setData(json);
        setMounted(true);
      })
      .catch(err => console.error("Error cargando Estados:", err));
  }, []);

  if (!mounted || !data) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-purple-600 animate-pulse font-bold text-lg italic">
        Mapeando rentabilidad global...
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">

           {/* CARD LÍDER DE MERCADO (USA) */}
      <div className="bg-purple-600 rounded-3xl p-1 shadow-lg shadow-purple-100">
        <div className="bg-white rounded-[22px] p-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Globe size={24} /></div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {/* Si existe outlier y country, lo muestra. Si no, pone un guion o aviso */}
                  Líder: {data?.outlier?.country || "No detectado"}
                </h2>
                
                {/* Solo mostramos el párrafo de "Excluido..." si realmente hay un outlier */}
                {data?.outlier && (
                  <p className="text-slate-500 text-[10px] uppercase tracking-widest">
                    Excluido del scatter para normalizar escala
                  </p>
                )}
              </div>
          </div>
          <div className="flex gap-10">
            <div className="text-center"><p className="text-[10px] font-bold text-slate-400 uppercase">Ventas</p>
            <p className="text-xl font-black text-slate-800">${data?.outlier?.sales?.toLocaleString()}</p>
            </div>

            <div className="text-center"><p className="text-[10px] font-bold text-slate-400 uppercase">Pedidos</p>
            <p className="text-xl font-black text-slate-800">{data?.outlier?.orders?.toLocaleString()}</p>
            </div>

            <div className="text-center border-l border-slate-100 pl-8"><p className="text-[10px] font-bold text-slate-400 uppercase">Profit</p>
            <p className="text-xl font-black text-emerald-500">${data?.outlier?.profit?.toLocaleString()}</p>
            </div>

          </div>
        </div>
      </div>

      {/* 1. BUBBLE CHART - SIMULACIÓN DE MAPA MUNDIAL */}
       <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-125 w-full flex flex-col">
        <h3 className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-6 italic">
          Distribución de Mercado Global: Volumen vs Lealtad (Sin USA)
        </h3>
            <div className="flex-1 w-full" style={{ minHeight: '400px' }}>
                <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ left: 20, bottom: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                        type="number" 
                        dataKey="orders" 
                        name="Pedidos" 
                        tick={{fill: '#94a3b8', fontSize: 10}} 
                        axisLine={false} 
                        tickLine={false}
                        domain={[0, 'auto']}
                        label={{ value: 'Cantidad de Órdenes', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 10 }}
                    />
                    <YAxis 
                        type="number" 
                        dataKey="sales" 
                        name="Ventas" 
                        unit="$" 
                        tick={{fill: '#94a3b8', fontSize: 10}} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(v: number) => `$${(v/1000).toFixed(0)}k`}
                    />
                    {/* ZAxis controla el tamaño de la burbuja basado en el Profit (Ganancia) */}
                    <ZAxis type="number" dataKey="profit" range={[50, 500]} name="Ganancia" />
                    
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
                    
                    <Scatter name="Estados" data={data?.bubble_data}>
                        {data.bubble_data?.map((entry: BubbleData, index: number) => (
                        <Cell 
                            key={`bubble-${index}`} 
                            // Si el profit es negativo, burbuja roja, si no, púrpura SaaS
                            fill={entry.profit < 0 ? '#fb7185' : '#8b5cf6'} 
                            fillOpacity={0.6}
                        />
                        ))}
                    </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        
        {/* 2. ESTADOS CON MENOR RENTABILIDAD */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-[500px] flex flex-col">
          <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-6 italic">Top 15: Estados con Mayor Pérdida Neta</h3>
          <div className="flex-1 w-full" style={{ minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data?.bottom_countries} layout="vertical" margin={{ left: 10, right: 40, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={['auto', 0]} tickFormatter={(v) => `$${Math.abs(v/1000).toFixed(0)}k`} tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
                <YAxis dataKey="country" type="category" width={100} tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="profit" name="Profit" fill="#fb7185" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. CONCENTRACIÓN DE CLIENTES CRÍTICOS */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-[500px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 italic text-center lg:text-left">Estados con más Clientes en Pérdida</h3>
          <div className="flex-1 w-full" style={{ minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data?.critical_geo} layout="vertical" margin={{ left: 10, right: 40, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
                <YAxis dataKey="country" type="category" width={100} tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Clientes Críticos" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 4. SCATTER: ENVÍO VS MARGEN - VERSIÓN ULTRA-ESTABLE */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 w-full flex flex-col min-w-0 h-125">
        <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-6 italic text-center lg:text-left">
          Análisis Operativo: ¿El flete mata el margen del país?
        </h3>
        
        {/* 
            TRUCO DE INGENIERÍA: 
            Usamos un div con 'relative' y 'flex-1'. 
            Dentro, un contenedor con 'absolute inset-0' para que Recharts 
            tenga dimensiones calculadas al 100% sin importar el flujo del DOM.
        */}
        <div className="relative flex-1 w-full" style={{ minHeight: '400px' }}>
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ left: 20, bottom: 20, right: 30, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  type="number" 
                  dataKey="avg_shipping" 
                  name="Envío Promedio" 
                  tick={{fill: '#94a3b8', fontSize: 10}} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                  domain={[0, 'auto']}
                />
                <YAxis 
                  type="number" 
                  dataKey="profit_margin" 
                  name="Margen %" 
                  tick={{fill: '#94a3b8', fontSize: 10}} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />
                
                <Scatter name="Estados" data={data?.shipping_relation || []}>
                  {(data?.shipping_relation || [])?.map((entry: ShippingRelation, index: number) => (
                    <Cell 
                      key={`ship-rel-node-${index}`} 
                      fill={entry.profit_margin < 0 ? '#fb7185' : '#f97316'} 
                      fillOpacity={0.6}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
        <ExecutiveInsight pageName="countries" />
    </div>
  );
}

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, ScatterChart, Scatter, ReferenceLine
} from 'recharts';
import { Users } from 'lucide-react'; // Quitamos LayoutDashboard (Error Lín 8)
import CustomTooltip from './shared/CustomTooltip';
import ExecutiveInsight from './ExecutiveInsight';

// --- 1. INTERFACES ESTRICTAS ---
interface CustomerEntry {
  name: string;
  sales: number;
  profit: number;
  orders: number;
}

interface CustomerAnalysisData {
  topProfitable: CustomerEntry[];
  topRevenue: CustomerEntry[];
  bottomProfitable: CustomerEntry[];
  bottomRevenue: CustomerEntry[];
  segmentation: CustomerEntry[];
}

interface ChartBoxProps {
  title: string;
  data: CustomerEntry[];
  dataKey: "sales" | "profit";
  color: string;
  highlightColor: string;
  highlightSet: Set<string>;
  isLoss?: boolean; // CORRECCIÓN: cambiado 'bool' por 'boolean' (Error Lín 34)
}

interface CustomerInsightProps {
  title: string;
  description: string;
  type: 'success' | 'error' | 'info';
}

// --- 2. COMPONENTE PRINCIPAL ---
export default function CustomersView() {
  const [data, setData] = useState<CustomerAnalysisData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers-analysis`,{
      credentials: 'include' // <--- CLAVE PARA QUE FUNCIONE CON COOKIES HttpOnly
    })
      .then(res => res.json())
      .then((json: CustomerAnalysisData) => {
        setData(json);
        setMounted(true);
      })
      .catch(err => console.error("Error cargando clientes:", err));
  }, []);

  const sets = useMemo(() => {
    const vips = new Set<string>();
    const criticals = new Set<string>();
    if (!data) return { vips, criticals };

    const topP = new Set(data.topProfitable?.map(c => c.name) || []);
    data.topRevenue?.forEach(c => { if (topP.has(c.name)) vips.add(c.name); });

    const botP = new Set(data.bottomProfitable?.map(c => c.name) || []);
    data.bottomRevenue?.forEach(c => { if (botP.has(c.name)) criticals.add(c.name); });

    return { vips, criticals };
  }, [data]);

  if (!mounted || !data) return (
    <div className="flex items-center justify-center h-96">
      <p className="text-purple-600 font-bold animate-pulse italic text-center">
        Analizando comportamiento de cartera...
      </p>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700 w-full">


      {/* MAPA DE SEGMENTACIÓN */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-[500px] w-full flex flex-col">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 italic">Mapa de Frecuencia vs Volumen</h3>
        {mounted && (
        <div className="flex-1 w-full" style={{ minHeight: '400px' }}>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ left: 10, bottom: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis type="number" dataKey="orders" name="Órdenes" tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey="sales" name="Ventas" tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              {/* Aquí usamos ReferenceLine correctamente para que no marque error (Error Lín 6) */}
              <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="5 5" />
              <Scatter data={data.segmentation}>
                {data.segmentation?.map((entry, index) => (
                  <Cell 
                    key={`scatter-${index}`} 
                    fill={sets.vips.has(entry.name) ? '#059669' : sets.criticals.has(entry.name) ? '#e11d48' : (entry.profit < 0 ? '#fb7185' : '#8b5cf6')} 
                    fillOpacity={sets.vips.has(entry.name) || sets.criticals.has(entry.name) ? 1 : 0.4}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>

      {/* CUADRO EXPLICATIVO */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 w-full flex flex-col md:flex-row gap-10 items-center">
        <div className="md:w-1/4 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-10">
          <div className="p-4 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-100 mb-4">
            <Users size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Perfil de Cartera</h3>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Business Intelligence</p>
        </div>

        <div className="md:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-8">
          <CustomerInsight title="Núcleo VIP" description="Clientes estrella en la intersección de Volumen y Margen (Verde intenso)." type="success" />
          <CustomerInsight title="Riesgo Crítico" description="Clientes con frecuencia alta pero rentabilidad negativa (Rojo carmesí)." type="error" />
          <CustomerInsight title="Potencial" description="Baja frecuencia pero tickets altos. Fomentar recurrencia." type="info" />
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-purple-700 uppercase tracking-widest mb-1 font-mono">Estrategia Sugerida:</p>
            <p className="text-slate-600 text-[11px] italic leading-tight">Priorizar fidelización VIP y restringir descuentos mayores al 6%.</p>
          </div>
        </div>
      </div>

      {/* RANKINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartBox title="Top 20: Más Rentables" data={data.topProfitable} dataKey="profit" color="#10b981" highlightColor="#059669" highlightSet={sets.vips} />
        <ChartBox title="Top 20: Mayor Facturación" data={data.topRevenue} dataKey="sales" color="#cbd5e1" highlightColor="#059669" highlightSet={sets.vips} />
        <ChartBox title="Bottom 20: Menos Rentables" data={data.bottomProfitable} dataKey="profit" color="#fb7185" highlightColor="#e11d48" highlightSet={sets.criticals} isLoss={true} />
        <ChartBox title="Bottom 20: Menor Facturación" data={data.bottomRevenue} dataKey="sales" color="#e2e8f0" highlightColor="#e11d48" highlightSet={sets.criticals} />
      </div>
      
      <ExecutiveInsight pageName="customers" />
    
    </div>
  );
}

// --- 3. COMPONENTES AUXILIARES ---

function ChartBox({ title, data, dataKey, color, highlightColor, highlightSet, isLoss = false }: ChartBoxProps) {
  const safeData = Array.isArray(data) ? data : [];
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-[400px] flex flex-col">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{title}</h3>
      <div className="flex-1 w-full" style={{ minHeight: '350px' }}>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={safeData} layout="vertical" margin={{ left: 10, right: 30, bottom: 20 }}>
            <XAxis type="number" domain={isLoss ? ['auto', 0] : [0, 'auto']} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
            <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 9, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey={dataKey} radius={[0, 4, 4, 0]} barSize={10}>
              {safeData?.map((entry, index) => (
                <Cell key={`bar-${index}`} fill={highlightSet.has(entry.name) ? highlightColor : color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
      </div>
      
    </div>
    
  );
}

function CustomerInsight({ title, description, type }: CustomerInsightProps) {
  const colors = { success: "bg-emerald-500", error: "bg-rose-500", info: "bg-blue-500" };
  return (
    <div className="flex gap-4 group">
      <div className={`w-1 h-auto rounded-full ${colors[type]} shrink-0 group-hover:w-1.5 transition-all duration-300`} />
      <div>
        <p className="text-sm font-bold text-slate-700">{title}</p>
        <p className="text-[11px] text-slate-500 leading-relaxed mt-1">{description}</p>
      </div>
    </div>
  );
}
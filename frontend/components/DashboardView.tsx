'use client';

import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,  
} from 'recharts';
import { DollarSign, ShoppingCart, Percent, Target, Truck } from 'lucide-react';
import KPICard from './shared/KPICard';
import CustomTooltip from './shared/CustomTooltip';
import ExecutiveInsight from './ExecutiveInsight';

// --- INTERFACES ---
interface KPIStats {
  gross_revenue: number;
  avg_order: number;
  profit_margin: string;
  sales_trend: string;
  order_trend: string;
  current_year: number;
}

interface SalesData {
  date: string;
  Sales: number;
}

interface ChartData {
  sales_over_time: SalesData[];
}


const formatYAxis = (value: number) => value === 0 ? '0' : `${(value / 1000).toFixed(0)}k`;

export default function DashboardView() {
  const [kpis, setKpis] = useState<KPIStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [mounted, setMounted] = useState(false);

useEffect(() => {
    // 1. Definimos la URL y la función UNA SOLA VEZ
    const API_URL = process.env.NEXT_PUBLIC_API_URL;

    const fetchData = async () => {
      // Validación inicial
      if (!API_URL) {
        console.error("⛔ ERROR: Falta la variable de entorno NEXT_PUBLIC_API_URL");
        return;
      }

      try {
      const [kpiRes, chartRes] = await Promise.all([
        fetch(`${API_URL}/api/kpis`, { 
          credentials: 'include'  // <--- ESTA ES LA LLAVE QUE FALTA
        }),
        fetch(`${API_URL}/api/charts`, { 
          credentials: 'include'  // <--- ESTA TAMBIÉN
        }), 
      ]);

        // Verificamos respuesta exitosa
        if (!kpiRes.ok || !chartRes.ok) {
           throw new Error(`Error en API Dashboard: ${kpiRes.status} / ${chartRes.status}`);
        }

        const kData = await kpiRes.json();
        const cData = await chartRes.json();
        
        setKpis(kData);
        setCharts(cData);
        setMounted(true);

      } catch (e) {
        console.error("❌ Error cargando Dashboard:", e);
      }
    };

    // 2. Ejecutamos la función
    fetchData();
  }, []);


  if (!mounted || !kpis || !charts) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-purple-600 animate-pulse font-bold">Iniciando Sistema de Inteligencia...</div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {/* 1. SECCIÓN DE TARJETAS KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          title={`Ingresos Totales ${kpis.current_year}`} 
          value={`$${kpis.gross_revenue.toLocaleString()}`} 
          icon={<DollarSign/>} 
          trend={kpis.sales_trend} 
          color="text-emerald-600" 
          bgColor="bg-emerald-50" 
        />
        <KPICard 
          title="Ticket Promedio (AOV)" 
          value={`$${kpis.avg_order.toLocaleString()}`} 
          icon={<ShoppingCart/>} 
          trend={kpis.order_trend} 
          color="text-emerald-600" 
          bgColor="bg-emerald-50" 
        />
        <KPICard 
          title="Margen de Utilidad" 
          value={kpis.profit_margin} 
          icon={<Percent/>} 
          trend="Meta: 15%" 
          color="text-purple-600" 
          bgColor="bg-purple-50" 
        />
      </div>


        {/* --- BLOQUE DE INTRODUCCIÓN Y PREGUNTAS DE NEGOCIO (FULL WIDTH) --- */}
        <div className="bg-white p-10 rounded-4xl shadow-sm border border-slate-100 w-full relative overflow-hidden group">
        {/* Decoración sutil de fondo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full -mr-32 -mt-32 opacity-40" />
        
    <div className="relative z-10">
        <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-100">
                <Target size={28} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Objetivos Estratégicos</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Hoja de ruta para la toma de decisiones</p>
            </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Columna 1: Introducción */}
            <div className="space-y-4">
                <p className="text-slate-600 leading-relaxed">
                Bienvenido al sistema de inteligencia de <span className="font-bold text-purple-600 underline decoration-purple-200">SuperTienda Pro</span>. 
                Este panel no es solo una colección de datos; es una herramienta diseñada para auditar la salud operativa y financiera de la empresa a través del análisis de más de 50,000 transacciones consolidadas.
                </p>
                <p className="text-slate-600 leading-relaxed">
                A continuación, el análisis se despliega para resolver las incógnitas que determinan el crecimiento sostenible de nuestra operación global:
                </p>
            </div>

            {/* Columna 2: Preguntas de Negocio */}
            <div className="grid grid-cols-1 gap-4">
                <BusinessQuestion text="¿Tiene estacionalidad la venta de los productos de supertienda?" />
                <BusinessQuestion text="¿Cuál es la eficiencia en la entrega de los productos en general?" />
                <BusinessQuestion text="¿Hay una política confiable de descuentos que asegure la máxima ganancia?" />
                <BusinessQuestion text="¿Son adecuados los costos de flete o interfieren en la ganancia?" />
                <BusinessQuestion text="¿Los clientes de mayor facturación son realmente los más rentables?" />
                <BusinessQuestion text="¿Qué clientes reportan menos ganancia?¿Son con aquellos a los que se les vende menos?" />
                <BusinessQuestion text="¿Qué estados son los que representan el mejor mercado, y cuáles son los peores?" />
            </div>
            </div>
        </div>
    </div>


      {/* 2. SECCIÓN PRINCIPAL: GRÁFICA + CUADRO INTRODUCTORIO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-start">
        
        {/* Gráfica 1: Tendencia de Ventas */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-[450px] flex flex-col min-w-0">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 italic">Tendencia de Ventas (Estacionalidad Histórica)</h3>
          {mounted && (
          <div className="flex-1 w-full" style={{ minHeight: '350px' }}>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={charts.sales_over_time} margin={{ left: 10, right: 10 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={formatYAxis} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="Sales" 
                  name="Ventas" 
                  stroke="#8b5cf6" 
                  strokeWidth={4} 
                  fill="url(#colorSales)" 
                  dot={false} 
                  activeDot={{ r: 6, fill: '#8b5cf6', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>


        {/* Gráfica Derecha: EFICIENCIA DE DESPACHO (Lead Time) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-[450px] flex flex-col min-w-0">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Eficiencia de Despacho (Lead Time)</h3>
              <p className="text-slate-500 text-[10px] mt-1 font-medium italic">Días promedio desde pedido hasta envío</p>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Truck size={18} />
            </div>
          </div>
          {mounted && (
          <div className="flex-1 w-full" style={{ minHeight: '350px' }}>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={charts.sales_over_time}>
                <defs>
                  <linearGradient id="colorLead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(v) => `${v.toFixed(0)}d`} width={40} />
                <Tooltip content={<CustomTooltip />} />
                {/* Usamos stepAfter para enfatizar que son etapas logísticas */}
                <Area 
                  type="stepAfter" 
                  dataKey="Days_to_Ship"
                  name="Días Despacho"
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  fill="url(#colorLead)" 
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>
      </div>
      <ExecutiveInsight pageName="dashboard" />

    </div>
  );
}

       


function BusinessQuestion({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 group/q transition-all cursor-default">
      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 group-hover/q:scale-150 group-hover/q:bg-purple-600 transition-all" />
      <p className="text-sm font-semibold text-slate-500 group-hover/q:text-slate-800 transition-colors leading-snug">
        {text}
      </p>
    </div>
  );
}
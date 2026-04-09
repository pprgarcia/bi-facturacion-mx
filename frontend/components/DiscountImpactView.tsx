'use client';

import React, { useEffect, useState } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, ReferenceLine, 
} from 'recharts';
import { Percent, LayoutDashboard } from 'lucide-react';
import CustomTooltip from './shared/CustomTooltip';
import ExecutiveInsight from './ExecutiveInsight';

interface ChartData {
  sales_over_time: Array<{ date: string; Sales: number }>;
  category_data: Array<{ Category: string; Sales: number; Profit: number; Discount_Value: number }>;
}

interface SubCategoryData {
  "Sub-Category": string;
  Sales: number;
  Profit: number;
}

interface DiscountProduct {
  name: string;
  fullName: string;
  profit: number;
  discountValue: number;
}

interface DiscountImpactEntry { 
  group: string; 
  profit: number; 
}

interface DiscountImpactData { 
  data: DiscountImpactEntry[]; 
  total_loss_formatted: string; 
}

interface NetDiscountImpactData { 
  data: DiscountImpactEntry[]; 
  total_net_loss_formatted: string; 
}


const formatYAxis = (value: number) => value === 0 ? '0' : `${(value / 1000).toFixed(0)}k`;

export default function DashboardView() {
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [subData, setSubData] = useState<SubCategoryData[] | null>(null);
  const [discountProducts, setDiscountProducts] = useState<DiscountProduct[] | null>(null);
  const [lossErosion, setLossErosion] = useState<DiscountImpactData | null>(null);
  const [netErosion, setNetErosion] = useState<NetDiscountImpactData | null>(null);
  const [mounted, setMounted] = useState(false);


  
useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;

    const fetchData = async () => {
      if (!API_URL) return;

      try {
        console.log("⏳ Cargando datos de Descuentos...");

        // Hacemos el fetch
        const responses = await Promise.all([
          fetch(`${API_URL}/api/charts`,{
             credentials: 'include'
          }),
          fetch(`${API_URL}/api/subcategories`,{
             credentials: 'include'
          }),
          fetch(`${API_URL}/api/top-discounts`,{
             credentials: 'include'
          }),
          fetch(`${API_URL}/api/discount-margin-impact`,{
             credentials: 'include'
          }),
          fetch(`${API_URL}/api/discount-margin-netimpact`,{
             credentials: 'include'
          })
        ]);

        // Verificamos si alguna falló y avisamos cuál fue
        const endpoints = ["Charts", "Subcategories", "TopDiscounts", "Impact", "NetImpact"];
        responses.forEach((res, index) => {
          if (!res.ok) console.error(`❌ Error en ${endpoints[index]}: ${res.status}`);
        });

        // Si la primera (charts) o segunda fallan, detenemos, pero intentamos seguir si son errores menores
        if (!responses[0].ok) throw new Error("Falló carga crítica de Charts");

        // Convertimos a JSON uno por uno
        const cData = await responses[0].json();
        const sData = await responses[1].json();
        const dData = await responses[2].json();
        const lData = await responses[3].json();
        const nData = await responses[4].json();

        setCharts(cData);
        setSubData(sData);
        setDiscountProducts(dData);
        setLossErosion(lData);
        setNetErosion(nData);
        
        setMounted(true);
        console.log("✅ Datos de Descuentos cargados correctamente");

      } catch (e) { 
        console.error("❌ Error CRÍTICO en la carga de Descuentos:", e); 
      }
    };

    fetchData();
  }, []);



  // --- GUARDIA DE SEGURIDAD ---
  if (!mounted || !charts || !subData || !discountProducts || !lossErosion || !netErosion) {
    return <div className="p-10 text-purple-600 animate-pulse font-bold text-center">Iniciando Auditoría de Margen...</div>;
  }

  return (
    <div className="space-y-10 pb-20">
      


      {/* 2. FILA DE ANÁLISIS CATEGÓRICO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-[450px] flex flex-col">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Rentabilidad por Categoría</h3>
          {mounted && (
          <div className="flex-1 w-full" style={{ minHeight: '350px' }}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={charts.category_data} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="Category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={formatYAxis} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Sales" name="Ventas" fill="#94a3b8" fillOpacity={0.4} radius={[4, 4, 0, 0]} barSize={25} />
                <Bar dataKey="Profit" name="Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar dataKey="Discount_Value" name="Discount_Value" fill="#fda4af" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-[450px] flex flex-col">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Ranking de Rentabilidad por tipo de Producto (Ordenado por profit)</h3>
            {mounted && (
            <div className="flex-1 w-full" style={{ minHeight: '350px' }}>
               <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={subData} layout="vertical" margin={{ left: 10, right: 30, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={formatYAxis} />
                    <YAxis dataKey="Sub-Category" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} width={100} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                    <ReferenceLine x={0} stroke="#cbd5e1" />
                    <Bar dataKey="Sales" name="Ventas" fill="#94a3b8" fillOpacity={0.6} radius={[0, 4, 4, 0]} barSize={10} />
                    <Bar dataKey="Profit" name="Profit" radius={[0, 4, 4, 0]} barSize={10}>
                      {subData?.map((entry: SubCategoryData, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.Profit < 0 ? '#fb7185' : '#8b5cf6'} />
                      )) || []} 
                    </Bar>
                    <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={3} />
                  </BarChart>
                </ResponsiveContainer>
            </div>
            )}
        </div>
      </div>

      {/* 3. SECCIÓN COMPLEJA: 2 COLUMNAS STACKED (IZQ) Y 1 COLUMNA ALTA (DER) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-start">
        
        {/* COLUMNA IZQUIERDA: STACK DE IMPACTOS */}
        <div className="flex flex-col gap-8 h-250">
          
          {/* Gráfica 5: Valuación de Pérdidas */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-121 flex flex-col min-w-0">
             <header className="mb-6 flex justify-between items-start">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análisis de Pérdida Directa</h3>
                  <h4 className="text-sm font-bold text-slate-800">Valuación por Grupo de Descuento</h4>
                </div>
                <div className="bg-rose-50 px-3 py-1 rounded-lg">
                  <span className="text-rose-600 font-bold text-[10px]">Fuga: </span>
                  <span className="text-rose-700 font-black text-xs underline">{lossErosion.total_loss_formatted}</span>
                </div>
             </header>
             {mounted && (
             <div className="flex-1 w-full" style={{ minHeight: '350px' }}>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={lossErosion.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="group" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={formatYAxis} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="profit" name="Pérdida" fill="#fb7185" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
             )}
          </div>

          {/* Gráfica 6: Rentabilidad Neta */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-121 flex flex-col min-w-0">
            <header className="mb-6 flex justify-between items-start">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rentabilidad Neta Total</h3>
                  <h4 className="text-sm font-bold text-slate-800">Cruce de Profit vs Descuento</h4>
                </div>
                <div className="bg-emerald-50 px-3 py-1 rounded-lg text-right">
                  <p className="text-[10px] text-emerald-600 font-bold">Saldo Profit:</p>
                  <p className="text-xs text-emerald-700 font-black underline">{netErosion.total_net_loss_formatted}</p>
                </div>
             </header>
             {mounted && (
             <div className="flex-1 w-full" style={{ minHeight: '350px' }}>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={netErosion.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="group" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={formatYAxis} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="profit" name="Profit">
                      {netErosion?.data?.map((entry, index) => (
                        <Cell key={index} fill={entry.profit >= 0 ? '#10b981' : '#fb7185'} />
                      )) || []}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
             )}
          </div>
        </div>

        {/* COLUMNA DERECHA: LOS 25 PRODUCTOS (DOBLE ALTURA) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-250 flex flex-col min-w-0">
          <header className="flex justify-between items-start mb-6 border-b border-slate-50 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Top 25: Descuentos vs Rentabilidad</h3>
              <p className="text-slate-500 text-[10px]">Impacto monetario por SKU (Pérdida en Coral)</p>
            </div>
            <div className="p-2 bg-rose-50 text-rose-500 rounded-lg"><Percent size={18} /></div>
          </header>
          {mounted && (
          <div className="flex-1 w-full" style={{ minHeight: '700px' }}>
            <ResponsiveContainer width="100%" height={700}>
              <BarChart data={discountProducts} layout="vertical" margin={{ left: 10, right: 40, bottom: 20 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={formatYAxis} tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} dy={10} />
                <YAxis dataKey="name" type="category" width={130} tick={{fontSize: 8, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="discountValue" name="Descuento" fill="#fda4af" radius={[0, 4, 4, 0]} barSize={8} />
                <Bar dataKey="profit" name="Profit" radius={[0, 4, 4, 0]} barSize={8}>
                  {discountProducts?.map((entry, index) => (
                    <Cell key={`cell-dp-${index}`} fill={entry.profit < 0 ? '#fb7185' : '#8b5cf6'} />
                  )) || []}
                </Bar>
                <ReferenceLine x={0} stroke='#94a3b8' strokeWidth={1} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
          
          {/* CUADRO DE CONCLUSIONES INTEGRADO ABAJO DE LOS PRODUCTOS */}
          <div className="mt-6 bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800">
             <div className="flex items-center gap-2 mb-4">
                <LayoutDashboard size={18} className="text-purple-400" />
                <h4 className="text-white font-bold text-sm uppercase tracking-wider">Executive Insight</h4>
             </div>
             <p className="text-slate-300 text-xs leading-relaxed italic">
                &quot;Se detecta una correlación crítica: los productos con mayor volumen de descuento (barra coral) 
                coinciden sistemáticamente con los mayores márgenes negativos. Se requiere intervención de precios.&quot;
             </p>
          </div>
        </div>
      </div>
      <ExecutiveInsight pageName="discounts" />
    </div>
  );
}


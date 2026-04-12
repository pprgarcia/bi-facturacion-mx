'use client';

import React from 'react';
import { 
  AlertTriangle, 
  Sparkles,
  CheckCircle2, 
  TrendingUp, 
  Truck, 
  Users, 
  Target
  
} from 'lucide-react';

// --- INTERFACES ---
interface ConclusionCardProps {
  icon: React.ReactNode;
  title: string;
  category: string;
  description: string;
  impact: 'alto' | 'medio' | 'bajo';
  type: 'positivo' | 'negativo' | 'neutral';
  evidence: 'Ranking de Rentabilidad por tipo de Producto' | 'Impacto de Envíos Caros en la Utilidad' | 'Mapa de Frecuencia vs Volumen' | 'Productos con Menor Desplazamiento';
}

// Componente para cada item de la lista (Reemplaza visualmente a tu BusinessQuestion actual si es texto simple)
const FindingItem = ({ text }: { text: string }) => (
  <div className="flex gap-3 items-start p-2 hover:bg-slate-50 rounded-lg transition-colors">
    <div className="mt-1 min-w-4">
      <CheckCircle2 size={16} className="text-purple-500" />
    </div>
    <p className="text-sm text-slate-600 leading-relaxed font-medium">
      {text}
    </p>
  </div>
);


export default function ConclusionsView() {
  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">

      {/* RESUMEN EJECUTIVO / HERO SECTION */}
      <div className="bg-linear-to-r from-purple-600 to-indigo-700 rounded-4xl p-10 text-white shadow-xl shadow-purple-200 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Resumen General</span>
          <h2 className="text-4xl font-black mt-4 mb-6 leading-tight">La operación es sólida, pero la rentabilidad está siendo saboteada por el Pricing.</h2>
          <p className="text-purple-100 leading-relaxed text-lg">
            Tras auditar 10MB de transacciones, confirmamos que el volumen de ventas ($12.6M) es excepcional. Sin embargo, el margen neto del 11.6% puede subir al 15% eliminando fugas específicas en subcategorías y estados críticos.
          </p>
        </div>
        <Target className="absolute right-5 bottom-5 text-white/10 w-64 h-64" />
      </div>

      {/* GRID DE HALLAZGOS ESPECÍFICOS */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      
      {/* 1. HEADER DE LA TARJETA (Para igualar estilo con las de abajo) */}
      <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center gap-4">
        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl shadow-sm">
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Resumen Ejecutivo
          </h3>
          <p className="text-slate-800 font-bold text-lg">
            Hallazgos Clave en <span className="text-purple-600">SuperTienda Pro</span>
          </p>
        </div>
      </div>

      {/* 2. CONTENIDO EN GRID (Reduce la altura visual) */}
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          
          {/* Columna Izquierda */}
          <div className="space-y-2">
            <FindingItem text="Históricamente el año comienza en el punto más bajo en ventas y asciende hasta diciembre." />
            <FindingItem text="Las caídas en ventas más pronunciadas suceden en Julio y Octubre." />
            <FindingItem text="El promedio de entregas es de 4 días desde que se postea el pedido." />
            <FindingItem text="En muebles, los descuentos son mayores que la ganancia; las mesas son las que tienen pérdidas." />
            <FindingItem text="Pérdidas inician desde descuentos del 6%; mayores al 20% generan pérdidas masivas ($920K)." />
            <FindingItem text="Mayor volumen de descuento coincide sistemáticamente con los mayores márgenes negativos, o al menos la pérdida total de la ganancia." />
          </div>

          {/* Columna Derecha */}
          <div className="space-y-2">
            <FindingItem text="No hay evidencia de que los costos por transporte sean la causa raíz de pérdidas en la venta de un producto o en un país." />
            <FindingItem text="Identificados los 25 productos con más pérdida neta y menores ventas (requieren prueba de rotación)." />
            <FindingItem text="Devido a la diversificación en el inventario, el mayor número de pedidos no coincide con los clientes estrella ni críticos." />
            <FindingItem text="Dentro de los clientes a los que más se factura existen algunos que no estan en la lista de los que más ganancia se obtiene. Revisar por qué no se obtiene la ganancia esperada." />
            <FindingItem text="De los 25 clientes menos rentables, sólo uno esta dentro de los 25 a los que se factura menos. Revisar a estos clientes críticos." />
            <FindingItem text="Determinar si el mercado interno de los paises identificados con mayor pérdida es propicio para el negocio." />
          </div>

        </div>
      </div>
    </div>
  

      {/*Conclusiones*/}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <ConclusionCard 
          icon={<AlertTriangle className="text-rose-500" />}
          category="Categorías y Margen"
          title="El Problema de Furniture (Tables)"
          description="Las mesas presentan el margen negativo más profundo. No es un error logístico, es un error de descuento excesivo que liquida la utilidad bruta."
          impact="alto"
          type="negativo"
          evidence="Ranking de Rentabilidad por tipo de Producto"
        />
 
        <ConclusionCard 
          icon={<Truck className="text-orange-500" />}
          category="Logística Internacional"
          title="Mito del Flete Caro"
          description="Los datos desmienten que el transporte afecte el margen. Los estados con envíos de +$120 son rentables; las pérdidas ocurren en envíos de -$20 por precios mal calculados."
          impact="medio"
          type="neutral"
          evidence="Impacto de Envíos Caros en la Utilidad"
        />

        <ConclusionCard 
          icon={<Users className="text-emerald-500" />}
          category="Gestión de Cartera"
          title="Concentración VIP Exitosa"
          description="Existe una intersección sana de clientes que generan alto volumen y alta rentabilidad (VIPs). Estos representan el motor de crecimiento de la empresa."
          impact="alto"
          type="positivo"
          evidence="Mapa de Frecuencia vs Volumen"
        />

        <ConclusionCard 
          icon={<TrendingUp className="text-indigo-500" />}
          category="Estrategia de Ventas"
          title="Ticket Promedio en Riesgo"
          description="Aunque el ticket promedio de $504 es saludable, la proliferación de productos con ventas mínimas ensucia la eficiencia del inventario."
          impact="medio"
          type="neutral"
          evidence="Productos con Menor Desplazamiento"
        />

      </div>

      {/* PLAN DE ACCIÓN FINAL */}
      <div className="bg-white p-10 rounded-4xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
          <CheckCircle2 className="text-emerald-500" />
          Plan de Acción Recomendado (Q1 2026)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <ActionItem 
            step="01" 
            title="Auditoría de Precios" 
            text="Ajustar el precio base en mercados con envíos económicos y margen negativo." 
          />
          <ActionItem 
            step="02" 
            title="Optimización de Mesas" 
            text="Restringir descuentos en la subcategoría 'Tables' a un máximo del 10% para recuperar el punto de equilibrio." 
          />
          <ActionItem 
            step="03" 
            title="Retención VIP" 
            text="Lanzar programa de lealtad exclusivo para los clientes identificados en el cuadrante de alto valor." 
          />
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTES AUXILIARES CON TIPADO ESTRICTO ---

function ConclusionCard({ icon, title, category, description, impact, evidence }: ConclusionCardProps) {
  const impactColors = {
    alto: "bg-rose-100 text-rose-700",
    medio: "bg-orange-100 text-orange-700",
    bajo: "bg-slate-100 text-slate-700"
  };

  return (
    <div className="bg-white p-8 rounded-[28px] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${impactColors[impact]}`}>
            Impacto {impact}
          </span>
        </div>
        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-1">{category}</p>
        <h4 className="text-xl font-bold text-slate-800 mb-4">{title}</h4>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>
      <div className="mt-8 flex items-center text-purple-600 gap-2 text-xs font-bold font-stretch-200% cursor-pointer group">
        Ver Gráfica: { evidence }

      </div>
    </div>
  );
}

function ActionItem({ step, title, text }: { step: string, title: string, text: string }) {
  return (
    <div className="relative">
      <span className="text-6xl font-black text-slate-50 absolute -top-8 -left-4 z-0 selection:bg-none">{step}</span>
      <div className="relative z-10">
        <h5 className="font-bold text-slate-800 mb-2">{title}</h5>
        <p className="text-slate-500 text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}


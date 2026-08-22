'use client';
import React from 'react';
import { TooltipProps } from 'recharts';
import { NameType, ValueType, Payload } from 'recharts/types/component/DefaultTooltipContent';

interface DataRecord {
  country?: string;
  fullName?: string;
  name?: string;
  Category?: string;
  crit_cust?: string;
  Days_to_Ship?: number;
  profit?: number;
  Profit?: number;
  loss_amount?: number;
  shipping_cost?: number;
  avg_shipping?: number;
  profit_margin?: number;
  sales?: number;
  Sales?: number;
  orders?: number;
}


// 2. Interfaz para las Props del Tooltip (SIN "any")
interface CustomProps extends TooltipProps<ValueType, NameType> {
  active?: boolean;
  payload?: Payload<ValueType, NameType>[]; // Tipo oficial de Recharts
  label?: string;
}

export default function CustomTooltip(props: CustomProps): React.JSX.Element | null {
  const { active, payload, label } = props;
  
  if (!active || !payload || !payload.length) return null;

  const dataRecord = payload[0].payload as DataRecord;
  const title = dataRecord.country || dataRecord.fullName || dataRecord.name || dataRecord.Category || label;

  // Extraemos la ganancia de forma segura para mostrarla al final si no está en el payload
  const netProfit = dataRecord.profit ?? dataRecord.Profit;

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl max-w-70 z-50 font-sans">
      <p className="text-white text-[11px] font-bold leading-tight mb-3 border-b border-slate-700 pb-2 wrap-break-words uppercase tracking-tighter">
        {title}
      </p>
      
      <div className="space-y-1.5">
        {payload.map((entry: Payload<ValueType, NameType>, index: number) => {
          const rawName = entry.name?.toString() || "";
          const val = Number(entry.value);

          let dotColor = entry.color || "#8b5cf6";
          let textColor = "text-slate-100";

          // --- DETECCIÓN DE TIPO DE DATO ---
          const isOrders = rawName.toLowerCase().includes('orders') || 
                           rawName.toLowerCase().includes('pedidos') ||
                           rawName.toLowerCase().includes('days') ||
                           rawName.toLowerCase().includes('días') ||
                           rawName.toLowerCase().includes('name') ||
                           rawName.toLowerCase().includes('clientes') ||
                           rawName.toLowerCase().includes('órdenes');
          
          const isPercentage = rawName.toLowerCase().includes('margin') || 
                               rawName.toLowerCase().includes('margen') || 
                               rawName.includes('%');

          // --- LÓGICA DE COLORES ---
          if (val < 0) {
            dotColor = "#fb7185";
            textColor = "text-rose-300";
          } else if (rawName.toLowerCase().includes('profit') || isPercentage) {
            textColor = "text-purple-300";
          }

          if (rawName.toLowerCase().includes('sales') || rawName.toLowerCase().includes('ventas')) {
            dotColor = "#94a3b8";
          }

          // --- FORMATEO FINAL ---
          let formattedValue: string;
          if (isPercentage) {
            formattedValue = `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
          } else if (isOrders) {
            formattedValue = val.toLocaleString(); // Sin signo $
          } else {
            const sign = val < 0 ? '-' : '';
            formattedValue = `${sign}$${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
          }

          return (
            <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-6 my-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                  {rawName.replace('_', ' ')}:
                </span>
              </div>
              <span className={`text-[11px] font-mono font-bold ${textColor}`}>
                {formattedValue}
              </span>
            </div>
          );
        })}

        {/* --- INYECCIÓN DE GANANCIA REAL (Específico para vista de clientes) --- */}
        {/* Si estamos en el mapa de clientes, el payload solo trae Ventas y Órdenes. 
            Agregamos el Profit aquí para explicar el color del punto. */}
        {netProfit !== undefined && payload.length < 3 && !payload.some(e => {
          const nameLower = e.name?.toString().toLowerCase() || "";
          // AQUI EL CAMBIO: Agregamos 'pérdida' y 'ganancia' a la validación
          return nameLower.includes('profit') || nameLower.includes('pérdida') || nameLower.includes('ganancia');
        }) && (
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${netProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-[10px] text-slate-200 font-bold uppercase tracking-tight">Ganancia Real:</span>
            </div>
            <span className={`text-[11px] font-mono font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netProfit < 0 ? '-' : ''}${Math.abs(netProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
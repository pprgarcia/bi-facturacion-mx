import React from 'react';

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  color: string;
  bgColor: string;
}

export default function KPICard({ title, value, icon, trend, color, bgColor }: KPICardProps) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-start transition-all hover:shadow-md">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <h2 className="text-2xl font-black text-slate-800">{value}</h2>
        <div className={`mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center ${bgColor} ${color}`}>
          {trend}
        </div>
      </div>
      <div className="p-3 bg-slate-50 rounded-2xl text-purple-600 shadow-inner">
        {icon}
      </div>
    </div>
  );
}
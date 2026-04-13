'use client';
import React, { useState } from 'react';
import { Package, Users, Globe, FileText, Menu, X, LogOut, Upload, ShieldAlert  } from 'lucide-react'; 
import DashboardView from '@/components/DashboardView';
import DiscountImpactView from '@/components/DiscountImpactView';
import ProductsView from '@/components/ProductsView';
import CustomersView from '@/components/CustomersView'; 
import CountriesView from '@/components/CountriesView'; 
import ConclusionsView from '@/components/ConclusionsView';
// Importamos la autenticación
import { useAuth } from '@/context/AuthContext';
import LoginView from '@/components/LoginView';
import UploadView from '@/components/UploadView';
import GovernanceView from '@/components/GovernanceView';

interface SidebarBtnProps {
  icon: React.ReactElement;
  label: string;
  active: boolean;
  onClick: () => void;
}

// --- COMPONENTES AUXILIARES ---
const SidebarBtn: React.FC<SidebarBtnProps> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' 
        : 'text-slate-500 hover:bg-slate-100'
    }`}
  >
    {/* Realizamos una aserción de tipo específica para las props del icono */}
    {React.cloneElement(icon as React.ReactElement<{ size?: number | string }>, { size: 20 })}
    <span className="font-medium">{label}</span>
  </button>
);


export default function MainApp() {
  const { user, loading, logout } = useAuth(); 
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const titles: Record<string, string> = {
    dashboard: "Panel de Control",
    discounts: "Impacto de Descuentos",
    products: "Auditoría de Productos",
    clients: "Análisis de Clientes",
    countries: "Global Analytics",
    conclusions: "Reporte de Conclusiones",
    upload: "Gestión de Datos",
    governance: "Gobernanza y Seguridad"
  };

  // Función para cambiar de pestaña y cerrar el menú en móviles automáticamente
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

   // --- LÓGICA DE PROTECCIÓN DE RUTA ---
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-indigo-400 animate-pulse font-mono">
          Iniciando Sistema de Inteligencia...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      
      {/* 2. BOTÓN DE HAMBURGUESA (Solo visible en móviles) */}
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="md:hidden fixed top-6 right-6 z-50 p-3 bg-purple-600 text-white rounded-2xl shadow-lg hover:bg-purple-700 transition-all"
      >
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* 3. OVERLAY (Fondo oscuro al abrir el menú en móvil) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* 4. SIDEBAR ACTUALIZADA */}
{/* SIDEBAR ACTUALIZADA */}
      <aside className={`
        w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-40 
        transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        {/* --- 1. CABECERA / LOGO --- */}
        <div className="p-6 border-b border-slate-100 font-black text-xl text-purple-600 tracking-tighter italic">
          BI Facturacion MX
        </div>

        {/* --- 2. NAVEGACIÓN DE CONTENIDO (Se expande para empujar el resto abajo) --- */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análisis</div>
          <SidebarBtn icon={<Package/>} label="Objetivos" active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} />
          <SidebarBtn icon={<FileText/>} label="Descuentos" active={activeTab === 'discounts'} onClick={() => handleTabChange('discounts')} />
          <SidebarBtn icon={<Package/>} label="Productos" active={activeTab === 'products'} onClick={() => handleTabChange('products')} />
          <SidebarBtn icon={<Users/>} label="Clientes" active={activeTab === 'clients'} onClick={() => handleTabChange('clients')} />
          <SidebarBtn icon={<Globe/>} label="Estados" active={activeTab === 'countries'} onClick={() => handleTabChange('countries')} />
          <SidebarBtn icon={<FileText/>} label="Conclusiones" active={activeTab === 'conclusions'} onClick={() => handleTabChange('conclusions')} />
        </nav>

        {/* --- 3. SECCIÓN DE ADMINISTRACIÓN (Solo visible para Admin/Owner) --- */}
        {user.role !== 'viewer' && (
          <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50/50">
            <div className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuración</div>
            
            <SidebarBtn 
              icon={<Upload/>} 
              label="Cargar Datos" 
              active={activeTab === 'upload'} 
              onClick={() => handleTabChange('upload')} 
            />
            
            <SidebarBtn 
              icon={<ShieldAlert/>} 
              label="Gobernanza" 
              active={activeTab === 'governance'} 
              onClick={() => handleTabChange('governance')} 
            />
          </div>
        )}

        {/* --- 4. CIERRE DE SESIÓN (Al final de todo) --- */}
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

{/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 md:ml-64 p-6 md:p-8 overflow-x-hidden flex flex-col min-h-screen">
        <header className="flex justify-between items-center mb-10 shrink-0 pr-14 md:pr-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              {titles[activeTab]}
            </h1>
            <p className="text-slate-500">
              Bienvenido, {user.full_name}
            </p>
          </div>
          
          <div className="hidden md:block text-right">
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Status</div>
            <div className="flex items-center gap-2 text-green-500 font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              En Línea
            </div>
          </div>
        </header>

        {/* VISTAS DINÁMICAS */}
        <div className="flex-1">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'discounts' && <DiscountImpactView />}
          {activeTab === 'products' && <ProductsView />}
          {activeTab === 'clients' && <CustomersView />}
          {activeTab === 'countries' && <CountriesView />}
          {activeTab === 'conclusions' && <ConclusionsView />}
          {activeTab === 'upload' && <UploadView />}
          {activeTab === 'governance' && <GovernanceView />}
        </div>
      </main>
    </div>
  );
}


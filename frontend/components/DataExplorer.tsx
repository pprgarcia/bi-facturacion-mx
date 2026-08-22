'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  type ColumnDef, 
  type RowSelectionState, 
  type HeaderGroup, 
  type Header, 
  type Row, 
  type Cell,
  type SortingState
} from '@tanstack/react-table';
import { 
  Search, ChevronLeft, ChevronRight, FileSpreadsheet, 
  ArrowUpDown, ArrowUp, ArrowDown, Trash2, Database
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/context/AuthContext';  

// --- INTERFACES ---
interface XMLMetadata {
  [key: string]: unknown;
}

interface Transaction {
  id: number;
  "Order Date": string;
  "Order ID": string;
  "Customer Name": string;
  "Country": string;
  "Product Name": string;
  "Sales": number;
  "Profit": number;
  "Monto Descuento": number; // Nueva columna unificada
  "Tasa Descuento": number;  // Nueva columna unificada
  "Metadata XML": XMLMetadata | null;
  [key: string]: unknown; 
}

interface ApiResponse {
  items: Transaction[];
  total: number;
  page: number;
  pages: number;
}

export default function DataExplorer() {
  const [data, setData] = useState<Transaction[]>([]);
  const [columnFilters, setColumnFilters] = useState<{id: string, value: string}[]>([]);
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [totalRows, setTotalRows] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const fetchBatch = useCallback(async () => {
    if (!API_URL) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        search: globalFilter,
      });

      if (sorting.length > 0) {
        params.append('sort_by', sorting[0].id);
        params.append('sort_order', sorting[0].desc ? 'desc' : 'asc');
      }
      
      columnFilters.forEach(f => params.append(f.id, f.value));

      const res = await fetch(`${API_URL}/api/admin/data-explorer?${params.toString()}`, { 
        credentials: 'include' 
      });
      const json: ApiResponse = await res.json();
      setData(json.items || []);
      setTotalRows(json.total || 0);
    } catch (e) {
      console.error("Error en Auditoría:", e);
    } finally {
      setLoading(false);
    }
  }, [API_URL, pagination.pageIndex, pagination.pageSize, globalFilter, columnFilters, sorting]);

  useEffect(() => { fetchBatch(); }, [fetchBatch]);

  // --- EXPORTACIÓN INTEGRAL (SIN CÁLCULOS, SOLO LA VERDAD DE PYTHON) ---
// --- EXPORTACIÓN ESTRICTA Y AUDITADA ---
  const exportToExcel = (): void => {
    const selectedRows = table.getSelectedRowModel().rows;
    const rawDataToExport = selectedRows.length > 0 ? selectedRows.map(r => r.original) : data;

    const dataForExcel = rawDataToExport.map(item => {
      // 1. Helper para limpiar los ceros que envía Pandas en campos de texto
      const cleanText = (key1: string, key2: string = "") => {
        const val = item[key1] ?? item[key2] ?? "-";
        return (val === 0 || val === "0") ? "-" : val;
      };

      // 2. Helper para números limpios
      const cleanNum = (key1: string, key2: string = "") => {
        const val = Number(item[key1] ?? item[key2] ?? 0);
        return isNaN(val) ? 0 : val;
      };

      // 3. Rescatar y formatear el JSON (Buscamos en las dos posibles llaves)
      const xmlData = item["raw_xml_data"] || item["Metadata XML"];
      let xmlString = "Sin datos XML";
      
      if (xmlData && xmlData !== 0 && xmlData !== "-") {
        try {
          // Si Pandas lo mandó como texto, lo convertimos a objeto primero
          const jsonObj = typeof xmlData === 'string' ? JSON.parse(xmlData) : xmlData;
          xmlString = JSON.stringify(jsonObj, null, 2);
        } catch {
          xmlString = String(xmlData); // Respaldo por si falla el parseo
        }
      }

      // 4. MAPEO EXACTO: El orden que definas aquí es el orden EXACTO de las columnas en Excel
      return {
        "Row ID": cleanText("id", "Row ID"),
        "Order ID": cleanText("Order ID", "order_id"),
        "Fecha": cleanText("Order Date", "order_date"),
        "Cliente": cleanText("Customer Name", "customer_name"),
        "Categoría": cleanText("Category", "category"),
        "Sub-Categoría": cleanText("Sub-Category", "sub_category"),
        "Producto": cleanText("Product Name", "product_name"),
        "Estado / Región": cleanText("Country", "country"),
        "Ventas": cleanNum("Sales", "sales"),
        "Utilidad": cleanNum("Profit", "profit"),
        "Pérdida": cleanNum("Pérdida", "perdida"),
        "Monto Descuento": cleanNum("Monto Descuento", "discount_amount"),
        "Tasa Descuento": item["Tasa Descuento"] ? `${(Number(item["Tasa Descuento"])*100).toFixed(2)}%` : "0.00%",
        "Método de Pago": cleanText("Metodo Pago", "metodo_pago"),
        "Fecha de Envío": cleanText("Ship Date", "ship_date"),
        "Modo de Envío": cleanText("Ship Mode", "ship_mode"),
        "Prioridad": cleanText("Order Priority", "order_priority"),
        "Metadata XML": xmlString
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoría_Consolidada");
    XLSX.writeFile(workbook, `Auditoria_Fiscal_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const columns = useMemo<ColumnDef<Transaction>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input type="checkbox" className="rounded" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />
      ),
      cell: ({ row }) => (
        <input type="checkbox" className="rounded" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
      ),
      enableSorting: false,
    },
    { 
      accessorKey: "Order Date", 
      header: "Fecha", 
      cell: (info) => {
        const val = info.getValue() as string;
        return val ? new Date(val).toLocaleDateString('es-MX') : '-';
      }
    },
    { accessorKey: "Order ID", header: "Folio" },
    { accessorKey: "Customer Name", header: "Cliente" },
    { accessorKey: "Country", header: "Estado" },
    { accessorKey: "Product Name", header: "Producto" },
    { 
      accessorKey: "Sales", 
      header: "Ventas", 
      cell: (info) => <span className="font-bold text-slate-700">${(Number(info.getValue())).toLocaleString()}</span> 
    },
    { 
      accessorKey: "Profit", 
      header: "Utilidad", 
      cell: (info) => {
        const val = Number(info.getValue());
        return <span className={`font-bold ${val < 0 ? "text-red-600" : "text-emerald-600"}`}>${val.toLocaleString()}</span>;
      }
    },
    { 
      accessorKey: "Monto Descuento", 
      header: "Desc. $", 
      cell: (info) => <span className="text-rose-500 font-medium">${(Number(info.getValue())).toLocaleString()}</span> 
    },
    { 
      accessorKey: "Tasa Descuento", 
      header: "Tasa", 
      cell: (info) => <span className="text-slate-400 font-medium">{(Number(info.getValue()) * 100).toFixed(1)}%</span> 
    },
    { 
      accessorKey: "Metadata XML", 
      header: "XML", 
      enableSorting: false,
      cell: (info) => {
        const val = info.getValue();
        if (typeof val !== 'object' || val === null) return <span className="text-slate-300">-</span>;
        const strVal = JSON.stringify(val);
        return <span className="text-[9px] font-mono text-indigo-400 block w-24 truncate" title={strVal}>{strVal.substring(0, 25)}...</span>;
      }
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection, pagination, sorting },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: Math.ceil(totalRows / pagination.pageSize),
  });

  const handleBulkDelete = async () => {
    // Obtenemos los IDs de las filas seleccionadas
    const selectedIds = table.getSelectedRowModel().rows.map(r => r.original.id);
    
    if (selectedIds.length === 0) return;

    if (!window.confirm(`¿Estás seguro de ELIMINAR PERMANENTEMENTE ${selectedIds.length} registros? Esta acción no se puede deshacer y afectará a todas las gráficas.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/bulk-delete-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedIds),
        credentials: 'include'
      });

      if (res.ok) {
        alert("Registros eliminados correctamente.");
        table.resetRowSelection(); // Limpiamos los checks
        fetchBatch(); // Recargamos la tabla
      } else {
        alert("Error: No tienes permisos para realizar esta acción.");
      }
    } catch {
      alert("Error de comunicación con el servidor.");
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. BUSCADOR UNIVERSAL (Ahora solo y despejado) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        {/* LADO IZQUIERDO: Buscador con ancho controlado */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscador Universal de Auditoría..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-slate-400"
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setPagination(prev => ({ ...prev, pageIndex: 0 }));
            }}
          />
        </div>

        {/* LADO DERECHO: Contador de Registros Estilizado */}
        <div className="flex items-center gap-3 bg-slate-50 px-5 py-2 rounded-2xl border border-slate-100 shadow-inner group transition-all hover:bg-purple-50">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1 group-hover:text-purple-400">
              Registros Consolidados
            </span>
            <span className="text-base font-black text-slate-700 leading-none tabular-nums group-hover:text-purple-600">
              {totalRows.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE ACCIONES (Solo aparece si hay selección) */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="bg-slate-900 text-white px-6 py-4 rounded-3xl flex justify-between items-center shadow-2xl animate-in fade-in slide-in-from-top-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-xl">
              <Database size={18} className="text-white" />
            </div>
            <span className="text-sm font-bold">
              {Object.keys(rowSelection).length} registros seleccionados
            </span>
          </div>
          
          <div className="flex gap-3">
            {/* BOTÓN EXPORTAR (Si quieres que solo el Admin exporte, envuélvelo en el check de rol) */}
            {(user?.role === 'admin' || user?.role === 'owner') && (
              <>
                <button 
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-xl text-xs font-black transition-all shadow-lg"
                >
                  <Trash2 size={14} /> ELIMINAR
                </button>
                
                <button 
                  onClick={exportToExcel}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl text-xs font-black transition-all border border-white/10"
                >
                  <FileSpreadsheet size={14} /> EXPORTAR SELECCIÓN
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              {table.getHeaderGroups().map((hg: HeaderGroup<Transaction>) => (
                <tr key={hg.id}>
                  {hg.headers.map((header: Header<Transaction, unknown>) => (
                    <th key={header.id} className="px-4 py-4 border-r border-slate-100 last:border-0 align-top">
                      <div className="flex flex-col gap-2">
                        <div 
                          className={`flex items-center gap-2 uppercase font-black text-slate-500 tracking-tighter ${header.column.getCanSort() ? 'cursor-pointer hover:text-purple-600 transition-colors' : ''}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-slate-300">
                                {header.column.getIsSorted() === 'asc' ? <ArrowUp size={10} className="text-purple-500" /> : header.column.getIsSorted() === 'desc' ? <ArrowDown size={10} className="text-purple-500" /> : <ArrowUpDown size={10} />}
                            </span>
                          )}
                        </div>

                        {header.column.id !== 'select' && header.column.id !== 'Metadata XML' && (
                          <div className="relative">
                            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300" size={10} />
                            <input
                              type="text" placeholder="FILTRAR"
                              className="w-full pl-5 pr-1 py-1 text-[9px] font-bold border border-slate-200 rounded bg-white text-slate-700 outline-none focus:ring-1 focus:ring-purple-400 uppercase"
                              onChange={(e) => {
                                const val = e.target.value;
                                setColumnFilters(prev => {
                                  const filtered = prev.filter(f => f.id !== header.column.id);
                                  return val ? [...filtered, { id: header.column.id, value: val }] : filtered;
                                });
                                setPagination(prev => ({ ...prev, pageIndex: 0 }));
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={11} className="text-center py-20 text-slate-300 animate-pulse">Consultando base de datos...</td></tr>
              ) : (
                table.getRowModel().rows.map((row: Row<Transaction>) => (
                  <tr key={row.id} className={`transition-colors ${row.getIsSelected() ? 'bg-purple-50' : 'hover:bg-slate-50/80'}`}>
                    {row.getVisibleCells().map((cell: Cell<Transaction, unknown>) => (
                      <td key={cell.id} className="px-4 py-3 border-r border-slate-50 last:border-0 text-slate-600">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/50 flex justify-between items-center border-t border-slate-200">
          <span className="text-[10px] text-slate-400 font-bold">Total: {totalRows.toLocaleString()}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="p-2 border rounded-lg bg-white disabled:opacity-20 shadow-sm"><ChevronLeft size={16}/></button>
            <span className="text-xs font-black px-4 text-slate-800">{pagination.pageIndex + 1} / {Math.ceil(totalRows / pagination.pageSize)}</span>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="p-2 border rounded-lg bg-white disabled:opacity-20 shadow-sm"><ChevronRight size={16}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}
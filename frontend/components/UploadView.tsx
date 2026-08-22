'use client';

import React, { useState } from 'react';
import { FileCheck, AlertCircle, RefreshCw, FileArchive, Table } from 'lucide-react';

type UploadType = 'csv' | 'xml';

export default function UploadView() {
  const [uploadType, setUploadType] = useState<UploadType>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    // Seleccionamos el endpoint según el tipo elegido
    const endpoint = uploadType === 'csv' ? '/api/admin/upload-csv' : '/api/admin/upload-xml-zip';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', msg: data.message || "Procesamiento exitoso" });
        setFile(null);
      } else {
        setStatus({ type: 'error', msg: data.detail || 'Error en el procesamiento' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Error de conexión con el servidor' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
        
        {/* SELECTOR DE MODO */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-10">
          <button 
            onClick={() => { setUploadType('csv'); setFile(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${uploadType === 'csv' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500'}`}
          >
            <Table size={18} /> Cargar Historia (CSV)
          </button>
          <button 
            onClick={() => { setUploadType('xml'); setFile(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${uploadType === 'xml' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500'}`}
          >
            <FileArchive size={18} /> Ingesta Fiscal (ZIP/XML)
          </button>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            {uploadType === 'csv' ? 'Actualizar Legado Histórico' : 'Sincronizar Facturación SAT'}
          </h2>
          <p className="text-slate-500 mb-8">
            {uploadType === 'csv' 
              ? 'Sube el archivo consolidado para actualizar métricas de años anteriores.' 
              : 'Sube un archivo ZIP con tus CFDI del mes para una auditoría en tiempo real.'}
          </p>

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 mb-8 hover:border-purple-400 transition-colors bg-slate-50/50">
            <input 
              type="file" 
              accept={uploadType === 'csv' ? '.csv' : '.zip'} 
              onChange={handleFileChange}
              className="hidden" 
              id="file-upload" 
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {file ? (
                <div className="flex items-center justify-center gap-3 text-purple-600 font-bold">
                  <FileCheck size={24} /> {file.name}
                </div>
              ) : (
                <div className="text-slate-400">
                  Haz clic para seleccionar el archivo {uploadType.toUpperCase()}
                </div>
              )}
            </label>
          </div>

          {status && (
            <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 justify-center ${
              status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              <AlertCircle size={20} />
              <span className="font-medium">{status.msg}</span>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold text-lg hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-200"
          >
            {uploading ? <RefreshCw className="animate-spin" /> : "Procesar Archivos"}
          </button>
        </div>
      </div>
    </div>
  );
}
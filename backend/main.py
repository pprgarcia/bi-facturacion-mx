import os
import shutil # Para guardar el archivo físicamente
import pandas as pd
import numpy as np
import jwt
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional

# Agrega esta línea para eliminar la advertencia de "Downcasting"
pd.set_option('future.no_silent_downcasting', True)

from fastapi import FastAPI, HTTPException, Depends, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

# Importaciones de módulos propios
from security import SECRET_KEY, ALGORITHM
from datetime import datetime, timezone

# 1. Librerías externas (SQLModel)
from sqlmodel import Session, select 

# 2. Unifica todas las importaciones de models en UNA SOLA LÍNEA
from models import create_db_and_tables, engine, User, PageInsight, TransactionXML

# 3. Importa el motor de XML
from xml_engine import universal_xml_parser

# 4. Importa la lógica de seguridad
from auth import auth_router, get_current_user, require_admin

# Importaciones para manejo de archivos y procesamiento de XML
import zipfile
import io

# --- LÓGICA DE INICIO Y CIERRE (LIFESPAN) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestiona el ciclo de vida de la aplicación:
    1. Carga los datos del CSV a memoria principal.
    2. Verifica y crea las tablas en Vercel Postgres.
    """
    print("🚀 Iniciando Sistema de Inteligencia BI_Facturación_MX...")

    
    # Inicializar Base de Datos
    try:
        create_db_and_tables()
        print("✅ Conexión a Vercel Postgres: Establecida y Tablas Listas.")
    except Exception as e:
        print(f"❌ Error Crítico en Base de Datos: {e}")
        
    # Cargar datos de la tienda
    load_data()
    
    yield
    print("👋 Apagando Servidor...")

# --- INSTANCIA DE LA APP ---
app = FastAPI(
    title="BI Facturacion",
    description="API de Análisis de Datos con Autenticación de Grado Enterprise",
    version="2.0.0",
    lifespan=lifespan
)

# 1. PRIMERO: Configurar CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://172.20.64.1:3000",
    "http://172.30.32.1:3000", # Para subir desde Vercel el upload de xml
    "https://bi-facturacion-mx.vercel.app",
    
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # Crucial
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Set-Cookie", "Authorization", "Accept"], # Headers explícitos
)

# --- UNIFICACIÓN DE RUTAS ---
app.include_router(auth_router)


# --- VARIABLES GLOBALES Y MOTOR DE DATOS (PANDAS) ---
df_global: Optional[pd.DataFrame] = None

def load_data() -> None:
    global df_global
    path = "supertienda.csv"
    
    df_csv = pd.DataFrame()
    df_xml = pd.DataFrame()

    # --- FASE 1: CARGA E INGENIERÍA DE DATOS DESDE CSV ---
    if os.path.exists(path):
        try:
            df_csv = pd.read_csv(path, encoding='utf-8-sig', low_memory=False)
            df_csv.columns =[c.strip() for c in df_csv.columns]
            
            cols_to_fix =['Sales', 'Profit', 'Shipping Cost', 'Pérdida']
            for col in cols_to_fix:
                if col not in df_csv.columns:
                    df_csv[col] = 0
                df_csv[col] = pd.to_numeric(
                    df_csv[col].astype(str).str.replace(',', '').replace('-', '0'), 
                    errors='coerce'
                ).fillna(0)
            
            # --- SOLUCIÓN DEFINITIVA DE DESCUENTOS PARA CSV ---
            # 1. Limpiamos el texto "40.00%" para convertirlo en decimal 0.40
            if 'Discount' in df_csv.columns:
                tasa_decimal = df_csv['Discount'].astype(str).str.replace('%', '').str.replace(' ', '')
                tasa_decimal = pd.to_numeric(tasa_decimal, errors='coerce').fillna(0) / 100
            else:
                tasa_decimal = 0.0
            
            # 2. Guardamos la Tasa Limpia
            df_csv['Tasa Descuento'] = tasa_decimal
            
            # 3. CALCULAMOS EL MONTO (Porque el CSV no lo tiene)
            df_csv['Monto Descuento'] = df_csv['Sales'] * df_csv['Tasa Descuento']
            
            # Limpiamos columnas viejas para no confundir
            if 'Discount' in df_csv.columns: df_csv = df_csv.drop(columns=['Discount'])
            if 'Discount rate' in df_csv.columns: df_csv = df_csv.drop(columns=['Discount rate'])

            df_csv['Order Date'] = pd.to_datetime(df_csv['Order Date'], dayfirst=True, errors='coerce')
            df_csv['Ship Date'] = pd.to_datetime(df_csv['Ship Date'], dayfirst=True, errors='coerce')
            df_csv = df_csv.dropna(subset=['Order Date'])
            
        except Exception as e:
            print(f"⚠️ Error procesando CSV histórico: {e}")

    # --- FASE 2: CARGA DESDE VERCEL POSTGRES (OPERACIÓN XML) ---
    try:
        with Session(engine) as session:
            statement = select(TransactionXML)
            results = session.exec(statement).all()
            if results:
                data_list = [r.dict() for r in results]
                df_xml = pd.DataFrame(data_list)
                
                # --- SOLUCIÓN DEFINITIVA DE DESCUENTOS PARA XML ---
                # El XML YA TIENE EL MONTO en la columna 'perdida' (así lo configuramos)
                df_xml['Monto Descuento'] = df_xml['perdida']
                
                # CALCULAMOS LA TASA (Al revés que en el CSV)
                # Tasa = Monto / Ventas
                df_xml['Tasa Descuento'] = np.where(
                    df_xml['sales'] > 0, 
                    df_xml['Monto Descuento'] / df_xml['sales'], 
                    0.0
                )
                
                # Mapeo a nombres del Dashboard
                df_xml = df_xml.rename(columns={
                    'order_id': 'Order ID',
                    'order_date': 'Order Date',
                    'customer_name': 'Customer Name',
                    'category': 'Category',
                    'sub_category': 'Sub-Category',
                    'product_name': 'Product Name',
                    'sales': 'Sales',
                    'profit': 'Profit',
                    'shipping_cost': 'Shipping Cost',
                    'country': 'Country',
                    'segmento': 'Segment',         
                    'zona_region': 'Market',       
                    'metodo_pago': 'Metodo Pago',  
                    'raw_xml_data': 'Metadata XML' 
                })
                # Borramos las columnas viejas de Python para no ensuciar el Excel
                df_xml = df_xml.drop(columns=['perdida'], errors='ignore')
                df_xml['Order Date'] = pd.to_datetime(df_xml['Order Date'])
    except Exception as e:
        print(f"⚠️ Error consultando transacciones XML: {e}")

    # --- FASE 3: CONSOLIDACIÓN HÍBRIDA ---
    if not df_csv.empty or not df_xml.empty:
        df_global = pd.concat([df_csv, df_xml], ignore_index=True)
        print(f"📊 Sistema Híbrido Listo: {len(df_global)} registros unificados.")
    else:
        df_global = None
        print("❌ Error: No se detectaron datos.")

    # --- FASE 3: CONSOLIDACIÓN HÍBRIDA ---
    if not df_csv.empty or not df_xml.empty:
        # Concatenamos ambas fuentes en una sola memoria global
        df_global = pd.concat([df_csv, df_xml], ignore_index=True)
        print(f"📊 Consolidación Híbrida Exitosa: {len(df_global)} registros totales en memoria.")
    else:
        df_global = None
        print("❌ Error: No se detectaron datos en el archivo local ni en la base de datos.")

# --- RUTAS DE INFORMACIÓN (ENDPOINTS) ---

@app.get("/")
def read_root():
    return {"status": "online", "message": "BI Facturacion Intelligence Unit"}
@app.get("/api/kpis")
def get_kpis(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Calcula KPIs financieros con blindaje contra errores de datos y valores nulos.
    """
    # 1. Molde de respuesta por defecto (Garantiza que el Frontend siempre reciba algo válido)
    empty_response = {
        "gross_revenue": 0.0,
        "avg_order": 0.0,
        "profit_margin": "0%",
        "sales_trend": "0%",
        "order_trend": "+0.0%",
        "current_year": datetime.now().year,
        "authorized_user": user.email
    }

    if df_global is None or df_global.empty:
        print("⚠️ [KPIs] Fallo: El motor de datos (CSV) está vacío.")
        return empty_response
    
    try:
        # 2. Validación de Columnas Críticas
        required_columns = ['Order Date', 'Sales', 'Profit']
        for col in required_columns:
            if col not in df_global.columns:
                print(f"❌ [KPIs] Error: Falta la columna crítica '{col}' en el dataset.")
                return empty_response

        # 3. Determinación de periodos (Año actual y anterior)
        max_date = df_global['Order Date'].max()
        if pd.isna(max_date):
            print("❌ [KPIs] Error: No se pudieron procesar las fechas del archivo.")
            return empty_response
            
        last_year = int(max_date.year)
        df_last = df_global[df_global['Order Date'].dt.year == last_year]
        df_prev = df_global[df_global['Order Date'].dt.year == (last_year - 1)]

        if df_last.empty:
            print(f"⚠️ [KPIs] Aviso: No hay registros para el año {last_year}.")
            return empty_response

        # 4. Cálculos Financieros Base
        sales_last = float(df_last['Sales'].sum())
        profit_last = float(df_last['Profit'].sum())
        sales_prev = float(df_prev['Sales'].sum())
        
        # 5. Cálculo de Ticket Promedio Seguro (Safe AOV)
        # Si no hay 'Order ID', usamos el índice para no romper el cálculo
        group_col = 'Order ID' if 'Order ID' in df_last.columns else df_last.index
        avg_order = float(df_last.groupby(group_col)['Sales'].sum().mean())

        # 6. Cálculo de Tendencia (Ventas vs Año Anterior)
        if sales_prev > 0:
            trend_val = ((sales_last - sales_prev) / sales_prev) * 100
            sales_trend_str = f"{'+' if trend_val >= 0 else ''}{round(trend_val, 2)}%"
        else:
            sales_trend_str = "New" # O "0%" si prefieres

        # 7. Margen de Utilidad
        margin_val = (profit_last / sales_last * 100) if sales_last > 0 else 0

        return {
            "gross_revenue": round(sales_last, 2),
            "avg_order": round(avg_order, 2),
            "profit_margin": f"{round(margin_val, 2)}%",
            "sales_trend": sales_trend_str,
            "order_trend": "+1.2%", # Valor estático o calculado si tienes Quantity
            "current_year": last_year,
            "authorized_user": user.email
        }

    except Exception as e:
        # Log detallado del error para el desarrollador en la terminal
        print(f"❌ [KPIs] Error interno procesando cálculos: {str(e)}")
        import traceback
        traceback.print_exc() 
        return empty_response


@app.get("/api/charts")
def get_charts(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Genera la data estructurada para visualizaciones de Recharts.
    """
    empty_response = {
        "sales_over_time": [],
        "category_data": []
    }

    if df_global is None or df_global.empty:
        return empty_response
        
    try:
        # 1. Análisis de Lead Time (Días de Envío)
        df = df_global.copy()
        df = df.dropna(subset=['Ship Date'])
        df['Days_to_Ship'] = (df['Ship Date'] - df['Order Date']).dt.days

        # 2. Agregación Temporal Mensual
        df['Month_Num'] = df['Order Date'].dt.month
        monthly = df.groupby('Month_Num').agg({
            'Sales': 'sum',
            'Days_to_Ship': 'mean'
        }).reset_index()

        month_map = {1:'Ene', 2:'Feb', 3:'Mar', 4:'Abr', 5:'May', 6:'Jun', 
                     7:'Jul', 8:'Ago', 9:'Sep', 10:'Oct', 11:'Nov', 12:'Dic'}
        monthly['date'] = monthly['Month_Num'].map(month_map)
        
        # 3. Desempeño por Categoría y Pérdidas
        cat = df.groupby('Category').agg({
            'Sales': 'sum', 
            'Profit': 'sum', 
            'Pérdida': 'sum'
        }).reset_index()
        
        category_results = []
        for _, row in cat.iterrows():
            category_results.append({
                "Category": row['Category'],
                "Sales": float(row['Sales']),
                "Profit": float(row['Profit']),
                "Discount_Value": abs(float(row['Pérdida']))
            })

        return {
            "sales_over_time": monthly.sort_values('Month_Num')[['date', 'Sales', 'Days_to_Ship']].to_dict(orient="records"),
            "category_data": category_results
        }
    except Exception as e:
        return empty_response


@app.get("/api/subcategories")
def get_subcategories(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Ranking de subcategorías por rentabilidad.
    """

    if df_global is None or df_global.empty:
        return []
    
    last_year = df_global['Order Date'].dt.year.max()
    sub = df_global[df_global['Order Date'].dt.year == last_year].groupby('Sub-Category').agg({
        'Sales': 'sum', 
        'Profit': 'sum'
    }).reset_index()
    
    res = [
        {
            "Sub-Category": r['Sub-Category'], 
            "Sales": float(r['Sales']), 
            "Profit": float(r['Profit'])
        } for _, r in sub.iterrows()
    ]
    return sorted(res, key=lambda x: x['Profit'], reverse=True)

# --- ENDPOINTS DE PRODUCTOS ---
# main.py - Endpoint de productos blindado

@app.get("/api/products-analysis")
def get_products_analysis(user = Depends(get_current_user)):

    empty_response = {
        "shipping": [],
        "top_losses": [],
        "bottom_20": []
    }

    if df_global is None or df_global.empty:
        return empty_response
    
    try:
        # Trabajamos sobre una copia para no alterar la memoria principal
        df = df_global.copy()

        # 1. LIMPIEZA CRÍTICA DE VALORES NULOS E INFINITOS
        # Esto evita el Error 500 y el ERR_CONNECTION_REFUSED
        df['Profit'] = df['Profit'].replace([np.inf, -np.inf], 0).fillna(0)
        df['Shipping Cost'] = df['Shipping Cost'].replace([np.inf, -np.inf], 0).fillna(0)
        df['Sales'] = df['Sales'].replace([np.inf, -np.inf], 0).fillna(0)

        # 2. LOGÍSTICA: Top 300 Transacciones con fletes más caros
        # Ordenamos por costo de envío de mayor a menor
        top_shipping_df = df.sort_values('Shipping Cost', ascending=False).head(300)
        
        shipping_list = []
        for _, row in top_shipping_df.iterrows():
            shipping_list.append({
                "name": str(row['Product Name'])[:20] + "...", # Para la gráfica
                "fullName": str(row['Product Name']),          # Para el tooltip
                "shipping_cost": float(row['Shipping Cost']),
                "profit": float(row['Profit']),
                "order_id": str(row['Order ID'])
            })

        # 3. PEORES PÉRDIDAS EN DINERO (Agrupado por producto)
        p_agg = df.groupby('Product Name').agg({'Profit': 'sum', 'Sales': 'sum'}).reset_index()
        p_agg['Profit'] = p_agg['Profit'].fillna(0)
        
        # Los 25 que más dinero nos han hecho perder en total
        losses_df = p_agg[p_agg['Profit'] < 0].sort_values('Profit', ascending=True).head(25)
        top_losses = [
            {
                "name": str(row['Product Name'])[:20] + "...",
                "fullName": str(row['Product Name']),
                "loss_amount": float(row['Profit']),
                "sales": float(row['Sales'])
            } for _, row in losses_df.iterrows()
        ]

        # 4. BOTTOM VENTAS (Los 20 productos con menos ingresos)
        bottom_df = p_agg.sort_values('Sales', ascending=True).head(20)
        bottom_20 = [
            {
                "name": str(row['Product Name'])[:20] + "...",
                "fullName": str(row['Product Name']),
                "sales": float(row['Sales'])
            } for _, row in bottom_df.iterrows()
        ]

        print(">>> Datos de productos enviados con éxito")
        return {
            "shipping": shipping_list,
            "top_losses": top_losses,
            "bottom_20": bottom_20
        }

    except Exception as e:
        print(f"ERROR EN BACKEND: {str(e)}")
        return empty_response

# main.py - Agrega este endpoint

@app.get("/api/top-discounts")
def get_top_discounts(user = Depends(get_current_user)):

    if df_global is None or df_global.empty:
        return []

    try:
        # 1. Agrupamos por producto
        p_data = df_global.groupby('Product Name').agg({
            'Sales': 'sum',
            'Profit': 'sum',
            'Pérdida': 'sum'
        }).reset_index()

        # 2. Limpieza: El valor absoluto de 'Pérdida' es nuestro volumen de descuento
        p_data['discount_val'] = p_data['Pérdida'].abs()
        
        # 3. Tomamos los 25 productos con más descuentos otorgados
        top_df = p_data.sort_values('discount_val', ascending=False).head(25)

        # 4. Sanitización para JSON
        results = [
            {
                "name": str(row['Product Name'])[:25] + "...",
                "fullName": str(row['Product Name']),
                "discountValue": round(float(row['discount_val']), 2),
                "profit": round(float(row['Profit']), 2)
            } for _, row in top_df.iterrows()
        ]

        return results
    except Exception as e:
        print(f"Error en top-discounts: {e}")
        return []



# main.py

@app.get("/api/discount-margin-impact")
def get_discount_impact(user: Dict[str, Any] = Depends(get_current_user)):

    empty_response = {
        "data":[],
        "total_loss_formatted": "$0 USD"
    }

    if df_global is None or df_global.empty:
        return empty_response
    
    try:
        # 1. Trabajamos sobre una copia limpia
        df = df_global.copy()

        # 2. LIMPIEZA FORZADA DE DESCUENTO (Mantenemos tu robustez)
        # Detectamos cómo se llama la columna actualmente en memoria
        desc_col = 'Tasa Descuento' if 'Tasa Descuento' in df.columns else 'Discount'
        
        # Si por alguna razón crítica no existe ninguna, la creamos en cero para no tronar
        if desc_col not in df.columns:
            df[desc_col] = 0.0

        # Aseguramos que sea float. Si es string "10.00%", quitamos el %
        if df[desc_col].dtype == 'object':
            df[desc_col] = df[desc_col].astype(str).str.replace('%', '', regex=False)
            df[desc_col] = pd.to_numeric(df[desc_col], errors='coerce').fillna(0) / 100
        else:
            df[desc_col] = pd.to_numeric(df[desc_col], errors='coerce').fillna(0)

        # 3. DEFINICIÓN DE RANGOS (BINS)
        bins =[-0.001, 0, 0.05, 0.10, 0.15, 0.20, 2.0] 
        labels =["0%", "1-5%", "6-10%", "11-15%", "16-20%", "Más de 20%"]
        
        # Aplicamos los rangos a la columna correcta
        df['Discount_Group'] = pd.cut(df[desc_col], bins=bins, labels=labels)

        # 4. AGRUPACIÓN Y SUMA DE PROFIT (En este caso, Pérdida)
        impact = df.groupby('Discount_Group', observed=False)['Pérdida'].sum().reset_index()

        # 5. CÁLCULO DE PÉRDIDA TOTAL
        loss_df = impact[impact['Pérdida'] < 0]
        total_loss = float(loss_df['Pérdida'].sum())

        # 6. CONVERSIÓN A TIPOS NATIVOS
        chart_data =[]
        for _, row in impact.iterrows():
            chart_data.append({
                "group": str(row['Discount_Group']),
                "profit": round(float(row['Pérdida']), 2)
            })

        print(f">>> API Descuentos: Procesados {len(df)} registros. Pérdida: {total_loss}")
        
        return {
            "data": chart_data,
            "total_loss_formatted": f"${total_loss:,.0f} USD"
        }

    except Exception as e:
        import traceback
        print(f"CRASH EN DESCUENTOS: {str(e)}")
        print(traceback.format_exc())
        return empty_response

# Para la pérdida neta real (Profit)
@app.get("/api/discount-margin-netimpact")
def get_discount_net_impact(user: Dict[str, Any] = Depends(get_current_user)):

    empty_response = {
        "data":[],
        "total_net_loss_formatted": "$0 USD"
    }

    if df_global is None or df_global.empty:
        return empty_response
    
    try:
        df = df_global.copy()

        # 2. LIMPIEZA FORZADA DE DESCUENTO
        desc_col = 'Tasa Descuento' if 'Tasa Descuento' in df.columns else 'Discount'
        if desc_col not in df.columns:
            df[desc_col] = 0.0

        if df[desc_col].dtype == 'object':
            df[desc_col] = df[desc_col].astype(str).str.replace('%', '', regex=False)
            df[desc_col] = pd.to_numeric(df[desc_col], errors='coerce').fillna(0) / 100
        else:
            df[desc_col] = pd.to_numeric(df[desc_col], errors='coerce').fillna(0)

        # 3. DEFINICIÓN DE RANGOS (BINS)
        bins =[-0.001, 0, 0.05, 0.10, 0.15, 0.20, 2.0] 
        labels =["0%", "1-5%", "6-10%", "11-15%", "16-20%", "Más de 20%"]
        
        df['Discount_Group'] = pd.cut(df[desc_col], bins=bins, labels=labels)

        # 4. AGRUPACIÓN Y SUMA DE PROFIT
        impact = df.groupby('Discount_Group', observed=False)['Profit'].sum().reset_index()

        # 5. CÁLCULO DE PÉRDIDA TOTAL
        loss_df = impact[impact['Profit'] < 0]
        total_net_loss = float(loss_df['Profit'].sum())

        # 6. CONVERSIÓN A TIPOS NATIVOS
        chart_net_data =[]
        for _, row in impact.iterrows():
            chart_net_data.append({
                "group": str(row['Discount_Group']),
                "profit": round(float(row['Profit']), 2)
            })

        print(f">>> API Descuentos Netos: Procesados {len(df)} registros. Profit: {total_net_loss}")
        
        return {
            "data": chart_net_data,
            "total_net_loss_formatted": f"${total_net_loss:,.0f} USD"
        }

    except Exception as e:
        import traceback
        print(f"CRASH EN DESCUENTOS NETOS: {str(e)}")
        print(traceback.format_exc())
        return empty_response



@app.get("/api/customers-analysis")
def get_customers_analysis(user = Depends(get_current_user)):

    empty_response = {
        "topProfitable": [],
        "topRevenue": [],
        "bottomProfitable": [],
        "bottomRevenue": [],
        "segmentation": []
    }


    if df_global is None or df_global.empty:
        return empty_response
    
    try:
        df = df_global.copy()
        # Agrupación por Cliente
        c_data = df.groupby('Customer Name').agg({
            'Sales': 'sum', 
            'Profit': 'sum', 
            'Order ID': 'nunique'
        }).reset_index()
        
        c_data.columns = ['name', 'sales', 'profit', 'orders']

        # Función auxiliar para convertir filas de dataframe en listas seguras para JSON
        def sanitize_list(df_slice):
            return [
                {
                    "name": str(row['name']),
                    "sales": round(float(row['sales']), 2),
                    "profit": round(float(row['profit']), 2),
                    "orders": int(row.get('orders', 0))
                } for _, row in df_slice.iterrows()
            ]

        # Generación de los 4 Rankings
        top_profitable = sanitize_list(c_data.sort_values('profit', ascending=False).head(20))
        top_revenue = sanitize_list(c_data.sort_values('sales', ascending=False).head(20))
        bottom_profitable = sanitize_list(c_data.sort_values('profit', ascending=True).head(20))
        bottom_revenue = sanitize_list(c_data.sort_values('sales', ascending=True).head(20))
        
        # Muestra completa para el Scatter Plot
        segmentation = sanitize_list(c_data)

        print(">>> API Clientes: JSON construido con nombres estandarizados.")
        return {
            "topProfitable": top_profitable,
            "topRevenue": top_revenue,
            "bottomProfitable": bottom_profitable,
            "bottomRevenue": bottom_revenue,
            "segmentation": segmentation
        }
    except Exception as e:
        print(f"Error en Customers API: {e}")
        return empty_response


# main.py - Actualiza este endpoint específico

@app.get("/api/countries-analysis")
def get_countries_analysis(user = Depends(get_current_user)):

    empty_response = {
        "outlier": None, "bubble_data": [], "shipping_relation": [], 
        "bottom_countries": [], "critical_geo": []
    }

    if df_global is None or df_global.empty or 'Country' not in df_global.columns:
        return empty_response
    
        # Si no hay datos suficientes para un outlier:
    if len('Country') == 0:
        return {
            "paises": [],
            "outlier": None  # <--- Enviamos None explícito
        }
    
    try:
        df = df_global.copy()
        # Agrupación base por país
        geo_data = df.groupby('Country').agg({
            'Sales': 'sum', 
            'Profit': 'sum', 
            'Shipping Cost': 'sum',
            'Order ID': 'count'
        }).reset_index()

        # 1. Separar el Outlier (Líder USA)
        sorted_geo = geo_data.sort_values('Sales', ascending=False)
        if sorted_geo.empty:
            return empty_response
        
        outlier_raw = sorted_geo.iloc[0]
        outlier_data = {
            "country": str(outlier_raw['Country']),
            "sales": float(outlier_raw['Sales']),
            "profit": float(outlier_raw['Profit']),
            "orders": int(outlier_raw['Order ID'])
        }

        # 2. Bubble Data (Top 50 sin USA)
        others = sorted_geo.iloc[1:51]
        bubble_data = [
            {
                "country": str(r['Country']),
                "sales": float(r['Sales']),
                "profit": float(r['Profit']),
                "orders": int(r['Order ID'])
            } for _, r in others.iterrows()
        ]

        # 3. RELACIÓN ENVÍO VS MARGEN (Tu Scatter solicitado)
        # Calculamos para todos los estados para tener una nube completa
        shipping_relation = [
            {
                "country": str(row['Country']),
                "avg_shipping": round(float(row['Shipping Cost'] / row['Order ID']), 2),
                "profit_margin": round(float(row['Profit'] / row['Sales'] * 100), 2) if row['Sales'] != 0 else 0
            } for _, row in geo_data.iterrows()
        ]

        # 4. Rankings Inferiores
        bottom_countries = [{"country": str(r['Country']), "profit": float(r['Profit'])} 
                           for _, r in geo_data.sort_values('Profit').head(15).iterrows()]
        
        crit_cust = df.groupby(['Customer Name', 'Country'])['Profit'].sum().reset_index()
        critical_geo = crit_cust[crit_cust['Profit'] < 0].groupby('Country').size().reset_index(name='count').sort_values('count', ascending=False).head(15)
        critical_geo_list = [{"country": str(r['Country']), "count": int(r['count'])} for _, r in critical_geo.iterrows()]

        return {
            "outlier": outlier_data,
            "bubble_data": bubble_data,
            "shipping_relation": shipping_relation, 
            "bottom_countries": bottom_countries,
            "critical_geo": critical_geo_list
        }
    except Exception as e:
        print(f"Error en Estados: {e}")
        return empty_response


# --- RUTA DE CARGA DE DATOS (ADMIN ONLY) ---

@app.post("/api/admin/upload-csv")
async def upload_csv(
    file: UploadFile = File(...), 
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Recibe un nuevo dataset, valida su estructura y actualiza el sistema.
    """
    # 1. Seguridad: Solo administradores pueden cargar datos
    if user.role != "admin":
        raise HTTPException(
            status_code=403, 
            detail="Acceso denegado: Se requieren permisos de administrador para modificar la base de datos."
        )

    # 2. Validación de extensión
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .csv")

    try:
        # Guardar temporalmente para validar
        temp_path = "temp_upload.csv"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 3. Validación de Estructura con Pandas
        test_df = pd.read_csv(temp_path, encoding='utf-8-sig', low_memory=False)
        test_df.columns = [c.strip() for c in test_df.columns]

        # Columnas obligatorias que tu Dashboard usa actualmente
        required_columns = ['Sales', 'Profit', 'Order Date', 'Ship Date', 'Category']

        missing = [col for col in required_columns if col not in test_df.columns]
        
        if missing:
            os.remove(temp_path)
            raise HTTPException(
                status_code=400, 
                detail=f"Estructura inválida. Faltan columnas: {', '.join(missing)}"
            )

        # 4. Si es válido, sobrescribir el archivo oficial
        official_path = "supertienda.csv"
        shutil.move(temp_path, official_path)

        # 5. Actualizar la memoria global inmediatamente (Hot Reload de datos)
        load_data()

                # MODIFICACIÓN: Asegurar la eliminación del temporal tras la migración
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return {
            "status": "success",
            "message": f"Dataset '{file.filename}' procesado y actualizado correctamente.",
            "records": len(df_global) if df_global is not None else 0
        }

    except Exception as e:
        # MODIFICACIÓN: Borrado de seguridad si algo falla en el proceso
        if os.path.exists("temp_upload.csv"): 
            os.remove("temp_upload.csv")
        print(f"❌ FALLO CRÍTICO EN UPLOAD: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fallo en procesamiento: {str(e)}")


@app.post("/api/admin/upload-xml-zip")
async def upload_xml_zip(
    file: UploadFile = File(...), 
    user: User = Depends(require_admin)
):
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Se requiere un archivo .zip")

    # --- INICIALIZAMOS CONTADORES FUERA DEL BUCLE ---
    total_records_added = 0
    skipped_files = 0

    try:
        contents = await file.read()
        zip_buffer = io.BytesIO(contents)
        
        with zipfile.ZipFile(zip_buffer) as z:
            # Abrimos una sesión de base de datos para todo el proceso
            with Session(engine) as session:
                for filename in z.namelist():
                    if filename.endswith('.xml'):
                        with z.open(filename) as xml_file:
                            xml_data = xml_file.read()
                            extracted_data = universal_xml_parser(xml_data)
                            
                            if not extracted_data:
                                continue
                            
                            # 1. VERIFICAR DUPLICIDAD (UUID)
                            uuid_to_check = extracted_data[0]["order_id"]
                            statement = select(TransactionXML).where(TransactionXML.order_id == uuid_to_check)
                            exists = session.exec(statement).first()
                            
                            if exists:
                                skipped_files += 1
                                continue
                            
                            # 2. SI NO EXISTE, PREPARAMOS LA INSERCIÓN
                            for item in extracted_data:
                                transaction = TransactionXML(**item)
                                session.add(transaction)
                                total_records_added += 1 # <--- CONTAMOS CADA FILA NUEVA

                # 3. GUARDAMOS TODO EN LA BASE DE DATOS
                session.commit()

        # 4. RECARGA DE MEMORIA (Solo si hubo cambios)
        if total_records_added > 0:
            load_data()
        
        # 5. RESPUESTA DE ÉXITO CON CIFRAS REALES
        return {
            "status": "success",
            "message": f"Proceso terminado: {total_records_added} registros nuevos. {skipped_files} facturas omitidas por ya existir.",
            "records_inserted": total_records_added
        }

    except Exception as e:
        print(f"❌ Error en motor de ingesta XML: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Fallo en procesamiento: {str(e)}")



# --- ENDPOINTS DE INSIGHTS ESTRATÉGICOS ---

@app.get("/api/insights/{page_name}")
def get_page_insight(page_name: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Obtiene el comentario estratégico de una página específica."""
    with Session(engine) as session:
        insight = session.exec(select(PageInsight).where(PageInsight.page_name == page_name)).first()
        if not insight:
            return {"content": "Sin comentarios estratégicos registrados aún.", "updated_by_name": "Sistema"}
        return insight

@app.post("/api/insights/{page_name}")
def update_page_insight(
    page_name: str, 
    data: Dict[str, str], 
    user: User = Depends(require_admin) # Solo Admin u Owner
):
    """Actualiza o crea el comentario estratégico."""
    with Session(engine) as session:
        statement = select(PageInsight).where(PageInsight.page_name == page_name)
        insight = session.exec(statement).first()
        
        if insight:
            insight.content = data["content"]
            insight.updated_by_name = user.full_name
            insight.updated_at = datetime.now(timezone.utc)
        else:
            insight = PageInsight(
                page_name=page_name,
                content=data["content"],
                updated_by_name=user.full_name
            )
        
        session.add(insight)
        session.commit()
        return {"status": "success"}

""" TABLA DE EXPLORACIÓN DE DATOS """

@app.get("/api/admin/data-explorer")
def get_data_explorer(
    request: Request,
    page: int = 1, 
    limit: int = 100, 
    search: Optional[str] = None,
    sort_by: Optional[str] = "Order Date", # Columna por defecto
    sort_order: Optional[str] = "desc",    # Orden por defecto
    user: User = Depends(get_current_user)
):
    if df_global is None or df_global.empty:
        return {"items": [], "total": 0}

    df_filtered = df_global.copy()
    
    # 1. Filtro Global y por columna (mismo código anterior)
    if search:
        s = search.lower()
        df_filtered = df_filtered[df_filtered.apply(lambda row: row.astype(str).str.contains(s, case=False).any(), axis=1)]

    params = request.query_params
    for key, value in params.items():
        if key not in ['page', 'limit', 'search', 'sort_by', 'sort_order'] and key in df_filtered.columns:
            if value:
                df_filtered = df_filtered[df_filtered[key].astype(str).str.contains(value, case=False)]

    # 2. LÓGICA DE ORDENAMIENTO (NUEVO)
    if sort_by in df_filtered.columns:
        ascending = True if sort_order == "asc" else False
        df_filtered = df_filtered.sort_values(by=sort_by, ascending=ascending)

    # 3. Paginación y Limpieza
    total_count = len(df_filtered)
    start = (page - 1) * limit
    end = start + limit
    
    batch = df_filtered.iloc[start:end].replace([np.inf, -np.inf], 0).fillna(0).infer_objects(copy=False)
    
    return {
        "items": batch.to_dict(orient="records"),
        "total": total_count,
        "page": page,
        "pages": (total_count // limit) + 1 if limit > 0 else 1
    }


    # --- RUTA: BORRADO MASIVO DE TRANSACCIONES (Admin Only) ---

# --- RUTA: BORRADO MASIVO DE TRANSACCIONES (Versión sin Bitácora) ---

@app.post("/api/admin/bulk-delete-transactions")
async def bulk_delete_transactions(
    ids: List[int], 
    admin: User = Depends(require_admin)
):
    """
    Elimina permanentemente registros por ID sin registro de bitácora.
    """
    if not ids:
        raise HTTPException(status_code=400, detail="No se proporcionaron IDs.")

    try:
        with Session(engine) as session:
            # Buscamos y borramos directamente
            statement = select(TransactionXML).where(TransactionXML.id.in_(ids))
            targets = session.exec(statement).all()
            
            count = len(targets)
            for t in targets:
                session.delete(t)
            
            session.commit()
            
        # Actualizamos la memoria global para que las gráficas cambien al instante
        load_data()
        
        return {"status": "success", "deleted_count": count}

    except Exception as e:
        print(f"❌ Error en borrado masivo: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar los datos.")
import os
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime
from typing import Dict, Any, Optional
from sqlmodel import SQLModel, Field, create_engine, Session, select, Column, JSON
from dotenv import load_dotenv

# Cargamos el .env aquí mismo para asegurar que las variables existan 
# en el momento que se define DATABASE_URL
load_dotenv() 

class User(SQLModel, table=True):
    __table_args__ = {"extend_existing": True} 
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True, nullable=False)
    hashed_password: str = Field(nullable=False)
    full_name: str
    role: str = Field(default="viewer")
    is_active: bool = Field(default=True)

    # ROLES: "owner", "admin", "viewer"
    role: str = Field(default="viewer")
    
    # ESTADOS: "pending" (espera), "active" (dentro), "suspended" (bloqueo temporal)
    status: str = Field(default="pending") 
    
    created_at: datetime = Field(
    sa_column=Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    )

    user_metadata: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))


    # --- MODELO DE BITÁCORA (AUDIT LOG) ---
# Esta tabla solo permite INSERT, nunca UPDATE ni DELETE por lógica de negocio

# --- 2. MODELO DE BITÁCORA ---
class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: uuid.UUID = Field(index=True)
    admin_name: str
    target_user_id: uuid.UUID
    target_user_email: str
    action: str
    details: Optional[str] = None
    
    # Configuración para que Postgres guarde la zona horaria correctamente
    timestamp: datetime = Field(
        sa_column=Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    )

# --- 3. CONFIGURACIÓN GLOBAL (FUERA DE LAS CLASES) ---

DATABASE_URL = os.getenv("POSTGRES_URL")

if not DATABASE_URL:
    raise ValueError("❌ ERROR: La variable POSTGRES_URL no está definida en el archivo .env")

# Creación del motor con Pool de conexiones robusto
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # Verifica si la conexión vive antes de usarla
    pool_recycle=60,         # Cierra conexiones cada 60 segundos (Evita el cuelgue de Neon)
    pool_size=5,             # Máximo de conexiones simultáneas
    max_overflow=10,         # Conexiones extra permitidas en picos de tráfico
    connect_args={
        "connect_timeout": 10 # Si en 10 segundos no despierta Neon, da error en lugar de colgarse
    }
)

def create_db_and_tables():
    """Crea las tablas en la base de datos si no existen."""
    SQLModel.metadata.create_all(engine)


# --- MODELO DE INSIGHTS ESTRATÉGICOS ---
class PageInsight(SQLModel, table=True):
    __table_args__ = {"extend_existing": True} 
    id: Optional[int] = Field(default=None, primary_key=True)
    page_name: str = Field(index=True, unique=True) # ej: "dashboard", "products"
    content: str                                    # El texto de la conclusión
    updated_by_name: str                            # Quién lo escribió
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    )

    # --- MODELO PARA DATOS EXTRAÍDOS DE XML ---
class TransactionXML(SQLModel, table=True):
    __table_args__ = {"extend_existing": True}
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: str = Field(index=True)
    order_date: datetime
    ship_date: Optional[datetime] = None  # Agregado
    ship_mode: Optional[str] = None      # Agregado
    customer_name: str
    segment: Optional[str] = None        # Agregado
    country: str
    market: Optional[str] = None         # Agregado
    category: str
    sub_category: str
    product_name: str
    sales: float
    quantity: int = 1                    # Agregado
    discount_amount: float = 0.0         # Agregado
    profit: float
    shipping_cost: float = Field(default=0.0)
    order_priority: Optional[str] = None # Agregado
    perdida: float                       # Ya estaba
    discount_rate: float = 0.0           # Agregado (para Discount rate)
    metodo_pago: Optional[str] = None
    raw_xml_data: Optional[str] = None

# --- NUEVOS CAMPOS ---
metodo_pago: str = Field(default="PUE") # PUE o PPD
# Aquí guardamos el 100% de lo que extraiga el motor universal
raw_xml_data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
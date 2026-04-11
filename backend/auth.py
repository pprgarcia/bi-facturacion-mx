import os
import jwt
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Response, HTTPException, Depends, Request
from sqlmodel import Session, select, func

# Importaciones de tus módulos
from models import create_db_and_tables, engine, User, PageInsight, TransactionXML, AuditLog
from security import hash_password, verify_password, create_token, SECRET_KEY, ALGORITHM

auth_router = APIRouter(prefix="/api/auth", tags=["Gobernanza y Autenticación"])

# --- DEPENDENCIAS DE SEGURIDAD (Gatekeeper) ---

def get_current_user(request: Request) -> User:
    """
    Verifica el JWT y el ESTADO del usuario en tiempo real en la DB.
    """
    token: Optional[str] = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Sesión no encontrada.")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido.")
    except:
        raise HTTPException(status_code=401, detail="Sesión expirada o inválida.")

    with Session(engine) as session:
        user = session.get(User, uuid.UUID(user_id))
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no existe.")
        
        # --- CONTROL DE ESTADOS DINÁMICO ---
        if user.status == "pending":
            raise HTTPException(
                status_code=403, 
                detail="Cuenta en revisión. Un administrador debe aprobar su acceso."
            )
        if user.status == "suspended":
            raise HTTPException(
                status_code=403, 
                detail="Su acceso ha sido pausado temporalmente por la administración."
            )
            
        return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    """Fuerza a que el usuario sea admin u owner para acceder a la ruta."""
    if user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requieren permisos de administrador.")
    return user

# --- ENDPOINTS DE ACCESO ---

@auth_router.post("/register")
async def register(user_data: Dict[str, Any]):
    with Session(engine) as session:
        # 1. Verificar si el email ya existe
        existing = session.exec(select(User).where(User.email == user_data['email'])).first()
        if existing:
            raise HTTPException(status_code=400, detail="El email ya está registrado.")
        
        # 2. Lógica de "Primer Usuario = Admin"
        user_count = session.exec(select(func.count(User.id))).one()
        
        if user_count == 0:
            new_role = "admin"
            new_status = "active"
        else:
            new_role = "viewer"
            new_status = "pending" # Sala de espera para los demás

        new_user = User(
            email=user_data['email'],
            hashed_password=hash_password(user_data['password']),
            full_name=user_data.get('full_name', 'Nuevo Usuario'),
            role=new_role,
            status=new_status,
            is_active=True
        )
        
        session.add(new_user)
        session.commit()
        return {"mensaje": f"Registro exitoso como {new_role}. Estatus: {new_status}"}

@auth_router.post("/login")
async def login(response: Response, request: Request, user_data: Dict[str, Any]):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == user_data['email'])).first()
        
        if not user or not verify_password(user.hashed_password, user_data['password']):
            raise HTTPException(status_code=401, detail="Credenciales incorrectas.")
        
        # El login solo genera el token. El middleware 'get_current_user' 
        # se encargará de bloquear el paso si el estatus no es 'active'.
        token = create_token({
            "sub": str(user.id), 
            "email": user.email, 
            "full_name": user.full_name,
            "role": user.role
        })

        # Detectamos si NO estamos en local
        is_prod = not ("127.0.0.1" in str(request.base_url) or "localhost" in str(request.base_url))

        response.set_cookie(
            key="session_token",
            value=token,
            httponly=True,
            # EN PRODUCCIÓN (Render -> Vercel):
            # secure DEBE ser True y samesite DEBE ser "none"
            secure=True if is_prod else False,
            samesite="none" if is_prod else "lax", 
            path="/",
            max_age=86400
        )
        
        return {"mensaje": "Validación exitosa", "status": user.status}

@auth_router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "status": user.status
    }

# --- ENDPOINTS DE GOBERNANZA (Admin Only) ---

@auth_router.get("/users/all")
async def list_users(admin: User = Depends(require_admin)):
    """Lista todos los usuarios para la gestión del admin."""
    with Session(engine) as session:
        users = session.exec(select(User).order_by(User.created_at.desc())).all()
        return users

@auth_router.patch("/users/{target_id}/governance")
async def update_user_governance(
    target_id: uuid.UUID, 
    update_data: Dict[str, Any], 
    admin: User = Depends(require_admin)
):
    """
    Aprueba, suspende o cambia roles, y escribe en la Bitácora.
    """
    with Session(engine) as session:
        target = session.get(User, target_id)
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")
        
        # Seguridad: Un Admin no puede modificar a un Owner
        if target.role == "owner" and admin.role != "owner":
            raise HTTPException(status_code=403, detail="No puede modificar al dueño del sistema.")

        old_status = target.status
        old_role = target.role
        
        # Aplicar cambios
        if "status" in update_data:
            target.status = update_data["status"]
        if "role" in update_data:
            target.role = update_data["role"]
            
        # 3. REGISTRAR EN LA BITÁCORA INMUTABLE
        log_entry = AuditLog(
            admin_id=admin.id,
            admin_name=admin.full_name,
            target_user_id=target.id,
            target_user_email=target.email,
            action="MODIFICACION_GOBERNANZA",
            details=f"Status: {old_status}->{target.status} | Role: {old_role}->{target.role}"
        )
        
        session.add(target)
        session.add(log_entry)
        session.commit()
        
        return {"mensaje": "Gobernanza actualizada y registrada en bitácora."}

@auth_router.get("/audit-logs")
async def get_logs(admin: User = Depends(require_admin)):
    """Muestra la bitácora de acciones administrativas."""
    with Session(engine) as session:
        logs = session.exec(select(AuditLog).order_by(AuditLog.timestamp.desc())).all()
        return logs

@auth_router.post("/logout")
async def logout(response: Response, request: Request):
    # Detectamos si es producción igual que en el login
    is_prod = not ("127.0.0.1" in str(request.base_url) or "localhost" in str(request.base_url))

    response.delete_cookie(
        key="session_token",
        path="/",
        # ESTAS LÍNEAS SON LA CLAVE:
        secure=True if is_prod else False,
        samesite="none" if is_prod else "lax"
    )
    return {"mensaje": "Sesión cerrada"}


# --- RUTA: ELIMINAR USUARIO (Admin Only) ---
@auth_router.delete("/users/{target_id}")
async def delete_user(
    target_id: uuid.UUID, 
    admin: User = Depends(require_admin)
):
    if target_id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta.")

    with Session(engine) as session:
        target = session.get(User, target_id)
        
        if not target:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")
        
        # Seguridad: No se puede borrar al dueño del sistema
        if target.role == "owner":
            raise HTTPException(status_code=403, detail="No es posible eliminar al dueño principal.")

        # 1. Registramos la eliminación en la bitácora ANTES de borrar al usuario
        log_entry = AuditLog(
            admin_id=admin.id,
            admin_name=admin.full_name,
            target_user_id=target.id,
            target_user_email=target.email,
            action="ELIMINACION_USUARIO",
            details=f"Usuario eliminado permanentemente por el administrador."
        )
        
        session.add(log_entry)
        session.delete(target) # Borramos el registro del usuario
        session.commit()
        
        return {"mensaje": "Usuario eliminado correctamente y registrado en bitácora."}
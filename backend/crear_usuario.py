from sqlmodel import Session, select
from models import engine, User
# En tu auth.py vi que las funciones de seguridad vienen de 'security'
from security import hash_password 

def crear():
    with Session(engine) as session:
        # Buscamos si ya existe el admin para no duplicar
        statement = select(User).where(User.email == "joserodriguez@bifacturacion.com")
        usuario = session.exec(statement).first()
        
        if usuario:
            print(f"El usuario {usuario.email} ya existe. Vamos a actualizar su contraseña.")
            usuario.hashed_password = hash_password("admin_bifact!2026")
            usuario.status = "active"
            usuario.role = "owner"
        else:
            print("Creando usuario nuevo...")
            usuario = User(
                email="joserodriguez@bifacturacion.com",
                hashed_password=hash_password("admin_bifact!2026"),
                full_name="Admin Rescatado",
                role="owner",
                status="active"
            )
            session.add(usuario)
        
        session.commit()
        print("✅ PROCESO EXITOSO")
        print("Email: joserodriguez@bifacturacion.com")
        print("Password: admin_bifact!2026!")

if __name__ == "__main__":
    crear()
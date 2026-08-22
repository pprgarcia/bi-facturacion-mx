# 1. Usar una imagen base de Python ligera
FROM python:3.10-slim

# 2. Evitar que Python genere archivos .pyc y permitir logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# 4. Copiar el archivo de requisitos e instalar las dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# 5. Copiar el resto del código de tu backend
COPY . .

# 6. Exponer el puerto (Render usa una variable de entorno PORT, pero por defecto usa el 8000 internamente)
EXPOSE 8000

# 7. Comando para arrancar la app
# Asumiendo que tu archivo principal se llama "main.py" y la instancia de FastAPI es "app"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
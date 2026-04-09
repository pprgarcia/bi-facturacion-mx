import xml.etree.ElementTree as ET
import io # Necesario para procesar los bytes
from datetime import datetime
from typing import List, Dict, Any

# --- TRADUCTORES DE CATÁLOGOS ---

def obtener_estado_por_cp(cp: str) -> str:
    """Mapea los primeros dos dígitos del CP al Estado de México."""
    if not cp or len(cp) < 2: return "Otros"
    prefijo = cp[:2]
    mapeo = {
        '01': 'CDMX', '02': 'CDMX', '03': 'CDMX', '04': 'CDMX', '05': 'CDMX',
        '20': 'Aguascalientes', '21': 'Baja California', '23': 'Baja California Sur',
        '24': 'Campeche', '29': 'Chiapas', '31': 'Chihuahua', '06': 'CDMX',
        '34': 'Durango', '37': 'Guanajuato', '39': 'Guerrero', '42': 'Hidalgo',
        '44': 'Jalisco', '50': 'Estado de México', '58': 'Michoacán', '62': 'Morelos',
        '63': 'Nayarit', '64': 'Nuevo León', '68': 'Oaxaca', '72': 'Puebla',
        '76': 'Querétaro', '77': 'Quintana Roo', '78': 'San Luis Potosí',
        '80': 'Sinaloa', '83': 'Sonora', '86': 'Tabasco', '87': 'Tamaulipas',
        '91': 'Veracruz', '97': 'Yucatán', '98': 'Zacatecas'
    }
    return mapeo.get(prefijo, "Otros Estados")

def traducir_clave_sat(clave: str) -> str:
    """Mapea la ClaveProdServ del SAT a tus categorías de Dashboard."""
    if not clave: return "Otros"
    # Lógica de prefijos: los primeros 2 o 4 dígitos definen la industria
    if clave.startswith('43'): return "Tecnología"
    if clave.startswith('56'): return "Muebles"
    if clave.startswith('44'): return "Oficina"
    if clave.startswith('80'): return "Servicios"
    return "Insumos Varios"

def calcular_utilidad_estandar(categoria: str, ventas: float) -> float:
    """
    Simula un costo estándar por categoría si el cliente no provee costos reales.
    Esto permite que el dashboard siempre muestre un margen esperado.
    """
    margenes = {
        "Tecnología": 0.25, # 25% de margen
        "Muebles": 0.15,     # 15% de margen
        "Oficina": 0.35,     # 35% de margen
        "Servicios": 0.60    # 60% de margen
    }
    porcentaje = margenes.get(categoria, 0.20) # 20% por defecto
    return ventas * porcentaje

def xml_to_dict(node) -> Dict[str, Any]:
    """Función recursiva que convierte CUALQUIER nodo y sus hijos en un diccionario."""
    # 1. Capturar atributos del nodo actual
    # Usamos str(val) para asegurar que todo sea serializable
    data = {attr: str(val) for attr, val in node.attrib.items()}
        # 2. Buscar hijos (como Impuestos, Traslados, etc.)
    for child in node:
        tag = child.tag.split('}')[-1] # Limpiar namespace
        child_data = xml_to_dict(child)
      
        # Si el hijo ya existe (como varios Conceptos), lo convertimos en lista
        if tag in data:
            if not isinstance(data[tag], list):
                data[tag] = [data[tag]]
            data[tag].append(child_data)
        else:
            data[tag] = child_data
            
    return data

def universal_xml_parser(xml_content: bytes) -> List[Dict[str, Any]]:
    """Parser robusto para CFDI que mapea a la estructura de Supertienda."""
    try:
        # 1. Obtener namespaces dinámicamente de los bytes
        # Corregimos el error de 'k' no definido
        ns = {k if k else 'cfdi': v for _, (k, v) in ET.iterparse(io.BytesIO(xml_content), events=['start-ns'])}
        
        root = ET.fromstring(xml_content)
    except Exception as e:
        print(f"Error parseando XML: {e}")
        return []
    
    # 2. Datos del Comprobante (Cabezal)
    fecha_str = root.get('Fecha', '')
    try:
        fecha_obj = datetime.fromisoformat(fecha_str) if fecha_str else datetime.now()
    except ValueError:
        fecha_obj = datetime.now()
    
    receptor = root.find('.//{*}Receptor', ns)
    nombre_cliente = receptor.get('Nombre', 'Consumidor Final') if receptor is not None else 'N/A'
    
    timbre = root.find('.//{*}TimbreFiscalDigital', ns)
    uuid_sat = timbre.get('UUID', 'SIN-UUID') if timbre is not None else 'SIN-UUID'

    registros: List[Dict[str, Any]] = []

    # 3. Procesamiento de Conceptos
    for concepto in root.findall('.//{*}Concepto', ns):
        # Extraemos el método de pago del nodo raíz
        valor_str = concepto.get('Importe', '0')
        importe = float(valor_str) 
        profit_estimado = importe * 0.25
        
        fila = {
            "order_id": uuid_sat,
            "order_date": fecha_obj,
            "customer_name": nombre_cliente,
            "category": "Technology" if "01" in (concepto.get('ClaveProdServ') or "") else "Office Supplies",
            "sub_category": concepto.get('ClaveUnidad', 'Unidad'),
            "product_name": concepto.get('Descripcion', 'Producto XML'),
            "sales": importe,
            "profit": profit_estimado,
            "shipping_cost": 0.0,
            "perdida": 0.0,
            "country": "Mexico",
            "metodo_pago": root.get('MetodoPago', 'PUE'),
            "raw_xml_data": xml_to_dict(root)
        }
        registros.append(fila)

    return registros
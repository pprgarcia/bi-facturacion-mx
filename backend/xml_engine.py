import xml.etree.ElementTree as ET
import io
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any

# --- TRADUCTORES DE CATÁLOGOS ---

def obtener_estado_por_cp(cp: str) -> str:
    """Mapea los primeros dos dígitos del CP al Estado de México."""
    if not cp or len(cp) < 2: return "CDMX"
    prefijo = cp[:2]
    mapeo_cp = {
        '01': 'CDMX', '02': 'CDMX', '03': 'CDMX', '04': 'CDMX', '05': 'CDMX', '06': 'CDMX',
        '20': 'Aguascalientes', '21': 'Baja California', '23': 'Baja California Sur',
        '24': 'Campeche', '29': 'Chiapas', '31': 'Chihuahua', '34': 'Durango', 
        '37': 'Guanajuato', '39': 'Guerrero', '42': 'Hidalgo', '44': 'Jalisco', 
        '50': 'Estado de México', '58': 'Michoacán', '62': 'Morelos', '63': 'Nayarit', 
        '64': 'Nuevo León', '68': 'Oaxaca', '72': 'Puebla', '76': 'Querétaro', 
        '77': 'Quintana Roo', '78': 'San Luis Potosí', '80': 'Sinaloa', '83': 'Sonora', 
        '86': 'Tabasco', '87': 'Tamaulipas', '91': 'Veracruz', '97': 'Yucatán', '98': 'Zacatecas'
    }
    return mapeo_cp.get(prefijo, "Otros Estados")

def traducir_clave_sat(clave: str) -> str:
    """Mapea la ClaveProdServ del SAT a las categorías originales de Supertienda."""
    if not clave: return "Office Supplies"
    if clave.startswith(('43', '81')): return "Technology"
    if clave.startswith('56'): return "Furniture"
    return "Office Supplies"

def calcular_utilidad_estandar(categoria: str, ventas: float) -> float:
    """Estimación de utilidad basada en márgenes históricos de Supertienda."""
    margenes = {"Technology": 0.25, "Furniture": 0.10, "Office Supplies": 0.30}
    return round(ventas * margenes.get(categoria, 0.20), 2)

def xml_to_dict(node) -> Dict[str, Any]:
    """Función recursiva para convertir el XML completo en un diccionario serializable."""
    data = {attr: str(val) for attr, val in node.attrib.items()}
    for child in node:
        tag = child.tag.split('}')[-1] 
        child_data = xml_to_dict(child)
        if tag in data:
            if not isinstance(data[tag], list):
                data[tag] = [data[tag]]
            data[tag].append(child_data)
        else:
            data[tag] = child_data
    return data

# --- MOTOR DE PROCESAMIENTO ---

def universal_xml_parser(xml_content: bytes) -> List[Dict[str, Any]]:
    """Parser para CFDI que mapea datos a la estructura del Dashboard."""
    try:
        # Extracción de namespaces dinámicos
        ns = {k if k else 'cfdi': v for _, (k, v) in ET.iterparse(io.BytesIO(xml_content), events=['start-ns'])}
        root = ET.fromstring(xml_content)
    except Exception as e:
        print(f"Error parseando XML: {e}")
        return []
    
    # 1. Datos del Comprobante
    fecha_str = root.get('Fecha', '')
    try:
        fecha_pedido = datetime.fromisoformat(fecha_str) if fecha_str else datetime.now()
    except:
        fecha_pedido = datetime.now()
    
    # Estimación de envío (+1 día de la fecha de factura)
    fecha_envio = fecha_pedido + timedelta(days=1)
    
    # Geografía basada en el CP del emisor
    cp_origen = root.get('LugarExpedicion', '01000')
    estado_mx = obtener_estado_por_cp(cp_origen)
    
    receptor = root.find('.//{*}Receptor', ns)
    nombre_cliente = receptor.get('Nombre', 'Público en General') if receptor is not None else 'N/A'
    
    timbre = root.find('.//{*}TimbreFiscalDigital', ns)
    uuid_sat = timbre.get('UUID', 'SIN-UUID') if timbre is not None else 'SIN-UUID'

    registros: List[Dict[str, Any]] = []

       # 1. Obtenemos el CP del emisor desde el atributo 'LugarExpedicion'
    cp_emisor = root.get('LugarExpedicion', '01000')
    
    # 2. Creamos la variable que te falta llamando a la función traductora
    estado_real_mx = obtener_estado_por_cp(cp_emisor)

    # 2. Partidas de la Factura (Conceptos)
    for concepto in root.findall('.//{*}Concepto', ns):
        importe = float(concepto.get('Importe', '0'))
        descuento_monto = float(concepto.get('Descuento', '0'))
        
        # Categorización y utilidad estimada
        clave_sat = concepto.get('ClaveProdServ', '')
        categoria = traducir_clave_sat(clave_sat)
        profit_estimado = calcular_utilidad_estandar(categoria, importe)
        
        # Tasa de descuento real del CFDI
        total_partida = importe + descuento_monto
        tasa = round(descuento_monto / total_partida, 4) if total_partida > 0 else 0.0

         
        # 1. Extraemos el CP del atributo 'LugarExpedicion' del XML
# --- PASOS PREVIOS (Para que las variables existan) ---
    cp_emisor = root.get('LugarExpedicion', '01000')
    estado_real_mx = obtener_estado_por_cp(cp_emisor)
    
    # Determinamos un "Ship Mode" basado en el Método de Pago del SAT
    metodo_sat = root.get('MetodoPago', 'PUE')
    modo_envio = "Express" if metodo_sat == "PUE" else "Estándar"

    # --- PROCESAMIENTO DE CONCEPTOS ---
    for concepto in root.findall('.//{*}Concepto', ns):
        importe = float(concepto.get('Importe', '0'))
        descuento_monto = float(concepto.get('Descuento', '0'))
        
        # Extraemos la descripción real del producto
        nombre_producto = concepto.get('Descripcion', 'Producto sin descripción')

        fila = {
            "order_id": uuid_sat,
            "order_date": fecha_pedido,
            "ship_date": fecha_envio,
            "ship_mode": modo_envio,  # <--- Dinámico ahora
            "customer_name": nombre_cliente,
            "category": categoria,
            "sub_category": concepto.get('ClaveUnidad', 'Unidad'),
            "product_name": nombre_producto, # <--- Nombre real ahora
            "sales": importe,
            "quantity": int(float(concepto.get('Cantidad', '1'))), # <--- Más seguro
            "discount_amount": descuento_monto,
            "profit": profit_estimado,
            "shipping_cost": 0.0,
            "order_priority": "Media", # <--- Texto en lugar de None
            "perdida": 0.0,
            "country": estado_real_mx, # <--- Variable ya definida arriba
            "discount_rate": tasa,
            "metodo_pago": metodo_sat,
            "raw_xml_data": json.dumps(xml_to_dict(root))
        }
        registros.append(fila)

    return registros


    metodo_pago: Optional[str] = None
    raw_xml_data: Optional[str] = None

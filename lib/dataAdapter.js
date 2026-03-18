import { client } from '@/lib/sanity';

// 🛒 Obtener Menú (ACTUALIZADO PARA MAP Y CONTADOR LOCAL)
export async function getProductos() {
    return await client.fetch(
        `*[_type == "plato"] | order(nombre asc) { 
            _id, 
            nombre, 
            precio, 
            "categoria": coalesce(categoria->titulo, "COCINA"), 
            imagen,
            controlaInventario,
            insumoVinculado,
            cantidadADescontar,
            totalVentas,
            // 🔥 SECCIÓN CRÍTICA: Traemos los datos del insumo vinculado para el Map
            "stockActual": insumoVinculado->stockActual,
            "stockMinimo": insumoVinculado->stockMinimo
        }`,
        {},
        { useCdn: false }
    );
}

// 👥 Obtener Meseros
export async function getMeseros() {
    return await client.fetch(`*[_type == "mesero"] | order(nombre asc)`);
}

// 🛡️ Obtener PIN de Seguridad
export async function getSeguridad() {
    return await client.fetch(
        `*[_type == "seguridad"][0]{ pinAdmin, pinCajero }`,
        {},
        { useCdn: false }
    );
}

// 📊 Guardar Venta (Centralizado)
export async function registrarVenta(datosVenta) {
    const res = await fetch('/api/ventas', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(datosVenta) 
    });
    return res;
}




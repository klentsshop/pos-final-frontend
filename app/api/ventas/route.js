import { NextResponse } from 'next/server';
import { sanityClientServer } from '@/lib/sanity';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const payload = await req.json();
        
        // --- VARIABLES ORIGINALES ---
        const mesa = payload.mesa || 'General';
        const mesero = payload.mesero || 'Personal General';
        const metodoPagoRaw = payload.metodoPago || 'efectivo';
        const metodoPago = metodoPagoRaw.toLowerCase().trim();
        const totalPagado = Number(payload.totalPagado) || 0;
        const propinaRecaudada = Number(payload.propinaRecaudada) || 0;
        const ordenId = payload.ordenId;
        const tipoOrden = typeof payload.tipoOrden === 'string' 
    ? payload.tipoOrden.trim() 
    : 'mesa';
        // --- FECHAS Y FOLIO (Lógica original preservada) ---
        const now = new Date();
        const fechaUTC = now.toISOString();
        const fechaLocal = new Date().toLocaleString('sv-SE', { 
            timeZone: 'America/Bogota' 
        });

        const datePart = fechaUTC.slice(2, 10).replace(/-/g, '');
        const randomPart = (crypto.randomBytes(2).toString('hex') || "").toUpperCase() || "0000";
        const folioGenerado = `TAL-${datePart}-${randomPart}`;

        // --- BÚSQUEDA DE IDS PARA POPULARIDAD (Garantía de ID real) ---
        const nombresPlatos = (payload.platosVendidosV2 || []).map(item => item.nombrePlato || item.nombre);
        const mapeoSanity = await sanityClientServer.fetch(
            `*[_type == "plato" && nombre in $nombres]{nombre, _id}`,
            { nombres: nombresPlatos },
            { useCdn: false }
        );

        // --- MAPEO DE PLATOS (Campos idénticos al original) ---
        const platosVenta = (payload.platosVendidosV2 || []).map(item => ({
            _key: crypto.randomUUID(),
            _type: 'platoVendidoV2',
            nombrePlato: item.nombrePlato || item.nombre,
            cantidad: Number(item.cantidad) || 1,
            precioUnitario: Number(item.precioUnitario) || 0,
            subtotal: Number(item.subtotal) || 0,
            comentario: item.comentario || ""
        }));

        const abrirCajon = metodoPago === 'efectivo';

        // ============================
        // TRANSACCIÓN ATÓMICA ÚNICA
        // ============================
        let transaction = sanityClientServer.transaction();

        // 1. Crear Venta (Reporte)
        transaction = transaction.create({
            _type: 'venta',
            folio: folioGenerado,
            mesa,
            mesero,
            tipoOrden,
            metodoPago,
            totalPagado,
            propinaRecaudada,
            fecha: fechaUTC,
            fechaLocal: fechaLocal,
            platosVendidosV2: platosVenta,
        });

        // 2. Crear Ticket para APK (Impresión)
        transaction = transaction.create({
            _type: 'ticketCobro',
            mesa,
            mesero,
            metodoPago,
            items: platosVenta.map(p => ({
                _key: crypto.randomUUID(),
                nombrePlato: p.nombrePlato,
                cantidad: p.cantidad,
                precio: p.precioUnitario,
                subtotal: p.subtotal
            })),
            subtotal: totalPagado,
            propina: propinaRecaudada,
            total: totalPagado + propinaRecaudada,
            abrirCajon,
            impreso: false,
            fecha: fechaUTC
        });

        // 3. Borrar Mesa Activa
        if (ordenId) {
            transaction = transaction.delete(ordenId);
        }

        // 4. 🔥 POPULARIDAD (Centralizada aquí para evitar duplicados)
        (payload.platosVendidosV2 || []).forEach(p => {
            const nombrePlato = p.nombrePlato || p.nombre;
            const match = mapeoSanity.find(m => m.nombre === nombrePlato);
            // Si no hay ID real por nombre, intentamos el ID del payload (si es válido)
            const realId = match ? match._id : (p._id && !p._id.includes(' ') ? p._id : null);

            if (realId && realId.length > 5) {
                transaction = transaction.patch(realId, {
                    setIfMissing: { totalVentas: 0 },
                    inc: { totalVentas: Number(p.cantidad) || 1 }
                });
            }
        });

        await transaction.commit();

        return NextResponse.json({ 
            ok: true, 
            message: 'Venta registrada, popularidad actualizada y mesa liberada',
            folio: folioGenerado
        }, { status: 201 });

    } catch (err) {
        console.error('🔥 [FATAL_ERROR_VENTAS]:', err.message);
        return NextResponse.json({ 
            ok: false, 
            error: 'Error en la transacción final',
            details: err.message 
        }, { status: 500 });
    }
}
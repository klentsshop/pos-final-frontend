import { NextResponse } from 'next/server';
import { sanityClientServer } from '@/lib/sanity';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * LISTAR ÓRDENES ACTIVAS
 * Consulta original intacta para el panel de mesas.
 */
export async function GET() {
    try {
        const query = `*[_type == "ordenActiva"] | order(fechaCreacion asc) {
            _id,
            mesa,
            mesero,
            tipoOrden,
            fechaCreacion,
            platosOrdenados,
            imprimirSolicitada
        }`;

        const data = await sanityClientServer.fetch(query, {}, { useCdn: false });
        return NextResponse.json(data || []); 
    } catch (error) {
        console.error('[API_LIST_GET_ERROR]:', error);
        return NextResponse.json([], { status: 200 });
    }
}

/**
 * CREAR O ACTUALIZAR ORDEN
 * Versión ultra-optimizada: Sin popularidad para evitar duplicados.
 * Mantiene lógica de inventario y escudo de seguridad.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { mesa, mesero, platosOrdenados, ordenId, tipoOrden } = body;

        // Validación de entrada original
        if (!mesa || !Array.isArray(platosOrdenados) || platosOrdenados.length === 0) {
            return NextResponse.json(
                { error: 'Datos incompletos para procesar la orden.' },
                { status: 400 }
            );
        }

        // 1. NORMALIZACIÓN Y CÁLCULO DE ESTACIONES (Lógica de Inventario PRESERVADA)
        const estacionesSet = new Set(); 

        const platosNormalizados = platosOrdenados.map(p => {
            const cantidad = Number(p.cantidad) || 1;
            const precio = Number(p.precioUnitario || p.precioNum) || 0; 
            
            // 🆕 Lógica Senior: Captura de categoría para la APK
            // .toUpperCase() es vital para que coincida con el Store de la tablet
            const categoriaPlato = (p.categoria || "COCINA").trim().toUpperCase();
            estacionesSet.add(categoriaPlato);

            return {
                // Mantenemos tus generadores de keys y lógica de IDs intactos
                _key: p._key || p.lineId || Math.random().toString(36).substring(2, 9), 
                _id: p._id, 
                nombrePlato: p.nombrePlato || p.nombre, 
                cantidad,
                precioUnitario: precio,
                subtotal: precio * cantidad,
                comentario: p.comentario || "",
                categoria: categoriaPlato, // 🆕 Requerido por la APK para filtrar
                controlaInventario: p.controlaInventario || false,
                cantidadADescontar: p.cantidadADescontar || 0,
                insumoVinculado: p.insumoVinculado || null
            };
        });

        // Convertimos el Set a Array para estacionesPendientes
        const estacionesPendientes = Array.from(estacionesSet);

        const fechaActual = new Date().toISOString();
        const valorSolicitada = body.imprimirSolicitada === true;

        // 2. ESCUDO ANTI-DUPLICADOS (GROQ Original intacto)
        let idDestino = ordenId;
        if (!idDestino) {
            idDestino = await sanityClientServer.fetch(
                `*[_type == "ordenActiva" && mesa == $mesa][0]._id`,
                { mesa },
                { useCdn: false }
            );
        }

        // 3. TRANSACCIÓN ÚNICA (Integración Multi-Estación)
        let transaction = sanityClientServer.transaction();

        if (idDestino) {
            // Actualizar mesa existente
            transaction = transaction.patch(idDestino, {
                set: {
                    mesa,
                    mesero,
                    tipoOrden: tipoOrden || 'mesa',
                    platosOrdenados: platosNormalizados,
                    ultimaActualizacion: fechaActual,
                    imprimirSolicitada: valorSolicitada,
                    // 🆕 Actualiza el semáforo de impresión para las tablets
                    estacionesPendientes: estacionesPendientes 
                }
            });
        } else {
            // Crear mesa nueva
            transaction = transaction.create({
                _type: 'ordenActiva',
                mesa,
                mesero,
                tipoOrden: tipoOrden || 'mesa',
                fechaCreacion: fechaActual,
                ultimaActualizacion: fechaActual,
                platosOrdenados: platosNormalizados,
                imprimirSolicitada: valorSolicitada,
                estacionesPendientes: estacionesPendientes // 🆕 Carga inicial de estaciones
            });
        }

        // Ejecución de la transacción
        const result = await transaction.commit();

        return NextResponse.json({ 
            message: idDestino ? 'Orden actualizada' : 'Orden creada', 
            ordenId: idDestino || (result.results[0] ? result.results[0].id : null)
        }, { status: idDestino ? 200 : 201 });

    } catch (error) {
        console.error('🔥 [API_ORDENES_POST_ERROR]:', error.message);
        return NextResponse.json(
            { error: 'Error en servidor Sanity', details: error.message },
            { status: 500 }
        );
    }
}
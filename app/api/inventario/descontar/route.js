import { NextResponse } from 'next/server';
import { sanityClientServer } from '@/lib/sanity';

export async function POST(request) {
    try {
        const { insumoId, cantidad } = await request.json();

        if (!insumoId || !cantidad) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        // 1. Ejecutamos el descuento
        const result = await sanityClientServer
            .patch(insumoId)
            .setIfMissing({ stockActual: 0, stockMinimo: 5 }) // Evita errores si no existen campos
            .dec({ stockActual: cantidad })
            .commit();

        // 2. Validación de Stock Insuficiente (Agotado)
        if (result.stockActual < 0) {
            // Revertimos inmediatamente para dejar el stock en 0 o lo que estaba
            const revertido = await sanityClientServer
                .patch(insumoId)
                .inc({ stockActual: cantidad })
                .commit();

            return NextResponse.json({ 
                error: 'Stock insuficiente', 
                disponible: revertido.stockActual // Enviamos el valor real recuperado
            }, { status: 409 });
        }

        // 3. INTEGRACIÓN ALERTA STOCK MÍNIMO
        // Comparamos el stock resultante contra el valor que definiste en Sanity
        const esStockBajo = result.stockActual <= (result.stockMinimo || 0);

        return NextResponse.json({ 
            success: true, 
            nuevoStock: result.stockActual,
            alertaStockBajo: esStockBajo, // 🔔 Señal para el POS
            nombreInsumo: result.nombre // Para que el alert sea más claro
        });

    } catch (error) {
        console.error('[INVENTARIO_ERROR]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
import { NextResponse } from 'next/server';
import { sanityClientServer } from '@/lib/sanity';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { items } = await request.json();

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
        }

        for (const item of items) {
            // 1. Identificar el ID (sea que venga directo o en el array de insumos)
            const insumoId = item.insumoId || (item.insumos && item.insumos[0]?._id);
            
            // 2. Calcular la cantidad de forma segura
            // Si viene del botón menos, usamos item.cantidad (que es 1)
            // Si viene de borrar mesa, multiplicamos cantidad de platos por cantidad del insumo
            const cantPlatos = Number(item.cantidad) || 1;
            const cantInsumo = item.insumos ? (Number(item.insumos[0]?.cantidad) || 1) : 1;
            const totalARecuperar = cantPlatos * cantInsumo;

            if (insumoId) {
                console.log(`🚀 Devolviendo ${totalARecuperar} unidades al insumo: ${insumoId}`);
                
                await sanityClientServer
                    .patch(insumoId)
                    .setIfMissing({ stockActual: 0 })
                    .inc({ stockActual: totalARecuperar })
                    .commit();
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('❌ ERROR_DEVOLVER_ROUTE:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
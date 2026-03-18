// app/hooks/useImpresion.js

/**
 * 🛠️ Hook de Impresión Senior
 * Maneja la lógica de agrupación de platos y el disparo de impresión por CSS Media Queries.
 */
export function useImpresion(cart, config) {

    /**
     * 🖨️ IMPRIMIR TICKET CLIENTE
     * Limpiado: Ya no intenta forzar switches en Sanity.
     * Solo dispara la impresión del navegador para el Ticket de Caja.
     */
    const imprimirTicket = () => {
        if (!cart || cart.length === 0) return;

        // Preparamos las clases CSS para que el TicketTemplate muestre solo lo de Cliente
        document.body.classList.remove('imprimiendo-cocina');
        document.body.classList.add('imprimiendo-cliente');

        // Pequeño delay para asegurar que el DOM se ajuste antes de abrir el diálogo
        setTimeout(() => { 
            window.print(); 
            document.body.classList.remove('imprimiendo-cliente'); 
        }, 300);
    };

    /**
     * 👨‍🍳 IMPRIMIR COMANDA COCINA
     * Dispara la impresión de la comanda con notas agrupadas.
     */
    const imprimirCocina = () => {
        if (!cart || cart.length === 0) return;

        document.body.classList.remove('imprimiendo-cliente');
        document.body.classList.add('imprimiendo-cocina');

        setTimeout(() => { 
            window.print(); 
            document.body.classList.remove('imprimiendo-cocina');
        }, 300);
    };

    /**
     * 👤 AGRUPACIÓN PARA CLIENTE
     * Suma cantidades de items idénticos (mismo nombre y precio) para un ticket limpio.
     */
    const agruparParaCliente = () => {
        const agrupados = cart.reduce((acc, item) => {
            const precioBase = item.precioNum || 0;
            const key = `${item.nombre}-${precioBase}`;

            if (!acc[key]) {
                acc[key] = { 
                    nombre: item.nombre,
                    cantidad: 0,
                    subtotal: 0
                };
            }

            acc[key].cantidad += item.cantidad;
            acc[key].subtotal += (precioBase * item.cantidad);
            return acc;
        }, {});

        return Object.values(agrupados);
    };

    /**
     * 👨‍🍳 AGRUPACIÓN PARA COCINA
     * Agrupa por comentario + prioriza el orden (bebidas al final).
     */
    const agruparParaCocina = () => {
        const agrupados = cart.reduce((acc, item) => {
            const notaKey = item.comentario
                ? item.comentario.trim().toLowerCase()
                : 'sin-nota';

            const key = `${item.nombre}-${notaKey}`;

            if (!acc[key]) {
                acc[key] = { 
                    nombre: item.nombre,
                    categoria: item.categoria,
                    cantidad: 0,
                    comentario: item.comentario
                };
            }

            acc[key].cantidad += item.cantidad;
            return acc;
        }, {});

        const lista = Object.values(agrupados);

        // 🔥 Lógica de ordenamiento profesional para cocina
        const bebidaSlug = (config?.categoriaBebidas || 'bebida').toLowerCase();
        const prioridad = (config?.palabraPrioridadCocina || 'almuerzo').toLowerCase();

        return lista.sort((a, b) => {
            const catA = (a.categoria || '').toLowerCase();
            const catB = (b.categoria || '').toLowerCase();

            // 1. Bebidas al final de la comanda
            if (catA === bebidaSlug && catB !== bebidaSlug) return 1;
            if (catA !== bebidaSlug && catB === bebidaSlug) return -1;

            // 2. Prioridad por nombre (Ej: Sopa o Almuerzo arriba)
            const esA = a.nombre.toLowerCase().includes(prioridad);
            const esB = b.nombre.toLowerCase().includes(prioridad);
            if (esA && !esB) return -1;
            if (!esA && esB) return 1;

            return a.nombre.localeCompare(b.nombre);
        });
    };

    return { 
        imprimirTicket,
        imprimirCocina,
        agruparParaCliente,
        agruparParaCocina
    };
}
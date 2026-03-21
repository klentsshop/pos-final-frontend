'use client';
import React, { useState, useEffect, useMemo } from 'react';

export function useOrdenHandlers({
    cart, total, clearCart, clearWithStockReturn, setCartFromOrden, 
    apiGuardar, apiEliminar, refreshOrdenes,
    ordenesActivas, esModoCajero, setMostrarCarritoMobile,
    nombreMesero, setNombreMesero,tipoOrden,
    rep 
}) {
    const [ordenActivaId, setOrdenActivaId] = useState(null);
    const [ordenMesa, setOrdenMesa] = useState(null);
    const [mensajeExito, setMensajeExito] = useState(false);
    const [errorMesaOcupada, setErrorMesaOcupada] = useState(null);

    const esVentaDirecta = esModoCajero && cart.length > 0 && !ordenActivaId;
    const textoBotonPrincipal = esVentaDirecta ? "GUARDAR" : (ordenActivaId ? "ACTUALIZAR" : "GUARDAR");

    useEffect(() => {
        if (esModoCajero && !nombreMesero) {
            setNombreMesero("Caja");
        }
    }, [esModoCajero]);

    // ==============================
    // CARGAR ORDEN EXISTENTE
    // ==============================
    const cargarOrden = async (id) => {
        try {
            const res = await fetch('/api/ordenes/get', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ ordenId: id }) 
            });
            const o = await res.json();
            
            if (o && o.platosOrdenados) {
                // 1. 🛡️ Seteamos la identidad de la orden primero
                setOrdenActivaId(o._id); 
                setOrdenMesa(o.mesa); 
                
                const meseroFinal = o.mesero || o.nombreMesero || localStorage.getItem('ultimoMesero') || (esModoCajero ? "Caja" : null);
                setNombreMesero(meseroFinal); 

                // 2. ⏳ PEQUEÑO DELAY (50ms): Esto es el secreto anti-titileo.
                // Le damos tiempo a la UI para que asiente el nombre de la mesa 
                // antes de inyectar todos los platos al carrito.
                setTimeout(() => {
                    const platosParaCarrito = o.platosOrdenados.map(p => ({
                        ...p,
                        // 1. Identidad del plato
                        nombre: p.nombrePlato || p.nombre,
                        precioNum: p.precioUnitario || p.precio,
                        
                        // 2. 🛡️ BLINDAJE DE CATEGORÍA: 
                        categoria: (p.categoria || p.categoriaPlato || "").toString().toUpperCase().trim(),
                        
                        // 3. Flags de impresión y estado
                        seImprime: p.seImprime === true, 
                    }));

                    // Enviamos al carrito con el tipo de orden recuperado de Sanity
                    setCartFromOrden(platosParaCarrito, o.tipoOrden || 'mesa'); 
                }, 50);

                setMostrarCarritoMobile(true);
                return { 
                    success: true, 
                    tipoOrden: o.tipoOrden || 'mesa' 
                };
            }
        } catch (e) { 
            console.error("Error crítico en carga de orden:", e); 
        }
        return false;
    };

    // ==============================
    // GUARDAR ORDEN (MESA)
    // ==============================
    // ==============================
    // GUARDAR ORDEN (VERSIÓN FINAL BLINDADA)
    // ==============================
    const guardarOrden = async () => {
        if (cart.length === 0) return;

        let mesaDefault = esModoCajero ? "0" : "0";
        let mesa = ordenMesa || prompt("Mesa o Cliente:", mesaDefault);
        if (!mesa) return;

        const nombreNuevoNorm = mesa.toLowerCase().trim();

        // ✨ DETECCIÓN SENIOR PARA EL RADIO (Justo después del prompt)
        let tipoParaSanity = tipoOrden;
     
        if (nombreNuevoNorm.startsWith('domi')) {
            tipoParaSanity = 'domicilio';
        } else if (nombreNuevoNorm.startsWith('llevar')) {
            tipoParaSanity = 'llevar';
        } else if (/^\d+$/.test(nombreNuevoNorm) || nombreNuevoNorm.startsWith('mesa')) {
            tipoParaSanity = 'mesa';
        }
        // --- 🛡️ NUEVO ESCUDO HÍBRIDO "DOMI-SEGURO" ---
        if (!ordenActivaId) {
            const soloNumerosNuevos = mesa.match(/\d+/g)?.join("");

            // Definimos qué palabras activan la flexibilidad de números
            const palabrasFlex = ['domi', 'domicilio', 'llevar'];
            const esBusquedaFlexible = palabrasFlex.some(p => nombreNuevoNorm.startsWith(p));

            const existe = (ordenesActivas || []).find((o) => {
                const nombreExistenteNorm = (o.mesa || "").toLowerCase().trim();
                const soloNumerosExistentes = (o.mesa || "").match(/\d+/g)?.join("");

                // 1. Validación Texto Exacto
                const coincidenciaTexto = nombreExistenteNorm === nombreNuevoNorm;
                if (coincidenciaTexto) return true;

                // 2. Validación Numérica: Solo si NO es Domi/Llevar.
                if (!esBusquedaFlexible) {
                    const coincidenciaNumero = soloNumerosNuevos && soloNumerosExistentes && (soloNumerosNuevos === soloNumerosExistentes);
                    return coincidenciaNumero;
                }
                return false;
            });

            if (existe) {
                setErrorMesaOcupada(mesa); 
                return; 
            }
        }
        // --- 🛡️ FIN DEL ESCUDO ---

        // Mantenemos intacta tu lógica de meseros
        let meseroFinal = nombreMesero || localStorage.getItem('ultimoMesero') || (esModoCajero ? "Caja" : null);
        if (!meseroFinal) {
            alert("⚠️ Por favor, selecciona un mesero antes de guardar la orden.");
            return;
        }

        localStorage.setItem('ultimoMesero', meseroFinal);

        // ✅ LÓGICA DE INVENTARIO Y MAPEO (INTACTA)
        const platosParaGuardar = cart.map(i => ({ 
            _id: i._id,
            _key: i._key || i.lineId || `new-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, 
            nombrePlato: i.nombre || i.nombrePlato, 
            cantidad: i.cantidad, 
            precioUnitario: i.precioNum, 
            subtotal: i.precioNum * i.cantidad,
            comentario: i.comentario || "",
            // 🚀 BISTURÍ: Aquí resolvemos el problema de la categoría en una sola línea
            categoria: (i.categoria || i.categoriaPlato || i.nombreCategoria || "").toString().trim().toUpperCase(),
            seImprime: i.seImprime === true,
            controlaInventario: i.controlaInventario || false,
            insumoVinculado: i.insumoVinculado || null,
            cantidadADescontar: i.cantidadADescontar || 0
        }));

        try {
            setMensajeExito(true);
            setMostrarCarritoMobile(false);

            // ✅ ENVÍO A API (INTACTO)
            await apiGuardar({ 
                mesa: mesa.trim(), 
                mesero: meseroFinal, 
                ordenId: ordenActivaId, 
                platosOrdenados: platosParaGuardar,
                imprimirSolicitada: true, 
                tipoOrden: tipoParaSanity,
                ultimaActualizacion: new Date().toISOString()
            });
            
            await refreshOrdenes();

            setTimeout(() => {
                setMensajeExito(false);
                setOrdenActivaId(null); 
                setOrdenMesa(null); 
                clearCart(); 
                if (meseroFinal) setNombreMesero(meseroFinal);
            }, 1500);

        } catch (e) { 
            console.error("🔥 [ERROR_GUARDAR_ORDEN]:", e);
            setMensajeExito(false);
            alert("❌ Error crítico con Sanity."); 
        }
    };
    // ==============================
    // COBRAR ORDEN
    // ==============================
    const cobrarOrden = async (metodoPago) => {
        if (cart.length === 0) return alert("⚠️ El carrito está vacío.");
        if (!esModoCajero) return alert("⚠️ Solo el cajero puede realizar cobros directos.");
        
        // 💰 CÁLCULO DE SEGURIDAD PARA PROPINA
        const subtotalVenta = cart.reduce((s, i) => s + (Number(i.precioNum) * i.cantidad), 0);
        const valorPropina = total > subtotalVenta ? total - subtotalVenta : 0;

        // 1. Confirmación (Tu lógica original)
        if (!confirm(`💰 ¿Confirmar cobro por $${total.toLocaleString('es-CO')} en ${metodoPago}?`)) return;

        setMensajeExito(true); 

        // 📅 Fecha Local Bogotá (Tu lógica original intacta)
        const fechaLocal = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })).toISOString();

        try {
            const res = await fetch('/api/ventas', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    mesa: ordenMesa || "0", 
                    tipoOrden: tipoOrden || "mesa",
                    mesero: nombreMesero || "Caja", 
                    metodoPago: metodoPago,
                    totalPagado: Number(subtotalVenta),
                    propinaRecaudada: Number(valorPropina),
                    fechaLocal, 
                    ordenId: ordenActivaId || null, 
                    platosVendidosV2: cart.map(i => ({ 
                        nombrePlato: i.nombre || i.nombrePlato, 
                        cantidad: i.cantidad, 
                        precioUnitario: i.precioNum, 
                        subtotal: i.precioNum * i.cantidad,
                        comentario: i.comentario || "" 
                    })) 
                }) 
            });

            if (res.ok) {
                const ventaGuardada = await res.json();
                
                // Impresión automática del ticket
                if (ventaGuardada?._id) {
                    const urlTicket = `/ticket/${ventaGuardada._id}?type=cliente&auto=true`;
                    window.open(urlTicket, 'ventana_impresion_unica', 'width=100,height=100');
                }

                // Limpieza rápida (Tu tiempo original de 0.5s)
                setTimeout(async () => {
                    if (ordenActivaId) await apiEliminar(ordenActivaId);
                    clearCart(); 
                    setOrdenActivaId(null); 
                    setOrdenMesa(null); 
                    await refreshOrdenes();
                    if (rep?.cargarReporteAdmin) rep.cargarReporteAdmin();
                    
                    setMensajeExito(false);
                }, 500); 
            } else {
                setMensajeExito(false);
                alert("❌ Error en el servidor al procesar la venta.");
            }
        } catch (e) { 
            setMensajeExito(false);
            alert('❌ Error en el pago. Revisa la conexión.'); 
        }
    };

    const cancelarOrden = async () => {
        if (!ordenActivaId) return;
        if (!esModoCajero) return alert("🔒 PIN de Cajero requerido.");
        
        // 1. Única confirmación: Si el usuario dice que sí, procedemos sin más interrupciones
        if (confirm(`⚠️ ¿Eliminar orden de ${ordenMesa}?`)) {
            // 🛡️ Activamos el escudo para bloquear el botón mientras Sanity procesa
            setMensajeExito(true); 

            try {
                // Ejecutamos las acciones de borrado en Sanity y local
                await apiEliminar(ordenActivaId);
                await clearWithStockReturn(); 
                
                setOrdenActivaId(null); 
                setOrdenMesa(null);
                
                await refreshOrdenes(); 

                // ✅ BISTURÍ: Eliminamos el alert("🗑️ Eliminada.")
                // Ahora el sistema simplemente se limpia y ya queda listo.

                // Liberamos el escudo después de un breve respiro para que la UI se asiente
                setTimeout(() => {
                    setMensajeExito(false);
                }, 300);

            } catch (error) { 
                setMensajeExito(false);
                alert("❌ Error al eliminar la orden."); 
            }
        }
    };

    return React.useMemo(() => ({
        ordenActivaId, ordenMesa, nombreMesero, setNombreMesero,
        cargarOrden, errorMesaOcupada, setErrorMesaOcupada,
        guardarOrden, cobrarOrden, cancelarOrden,
        mensajeExito, textoBotonPrincipal, setMensajeExito,
        setOrdenActivaId, setOrdenMesa
    }), [
        ordenActivaId, ordenMesa, nombreMesero, errorMesaOcupada, 
        mensajeExito, textoBotonPrincipal, esModoCajero, cart.length, total, tipoOrden
    ]);
}
'use client';

import React, { useState, useEffect } from 'react';
import { formatPrecioDisplay, METODOS_PAGO } from '@/lib/utils';
// ✅ Importamos la configuración maestra para volverlo vendible
import { SITE_CONFIG } from '@/lib/config';

/**
 * 🛡️ COMPONENTE INTERNO: InputComentario
 */
function InputComentario({ item, actualizarComentario }) {
    const [texto, setTexto] = useState(item.comentario || '');

    useEffect(() => {
        setTexto(item.comentario || '');
    }, [item.comentario]);

    return (
        <input 
            type="text"
            placeholder="📝 Notas para cocina (Ej: Sin sopa)..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={() => actualizarComentario(item.lineId, texto)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    actualizarComentario(item.lineId, texto);
                    e.target.blur();
                }
            }}
            style={{ 
                marginTop: '6px', 
                padding: '6px 10px', 
                fontSize: '0.85rem', 
                border: '1px dashed #D1D5DB', 
                borderRadius: '6px', 
                backgroundColor: 'white', 
                color: SITE_CONFIG.theme.textDark, 
                outline: 'none', 
                width: '100%'
            }}
        />
    );
}

export default function TicketPanel({
    cart, total, metodoPago, setMetodoPago, quitarDelCarrito, agregarAlCarrito,
    guardarOrden, cobrarOrden, generarCierreDia, solicitarAccesoCajero,
    solicitarAccesoAdmin, registrarGasto, refreshOrdenes, setMostrarListaOrdenes,
    mostrarCarritoMobile, setMostrarCarritoMobile, ordenMesa, nombreMesero,
    setNombreMesero, listaMeseros, 
    esModoCajero, ordenActivaId, numOrdenesActivas, cleanPrice, styles,
    cancelarOrden,
    clearCart,
    imprimirComandaCocina,
    imprimirTicket, 
    actualizarComentario,
    propina = 0, setPropina, // 👈 Props para propina
    montoManual = 0, setMontoManual,
    setMostrarModalHistorial,
    setMostrarInventario // 👈 Props para monto manual
}) {
    // 🔍 Mejora: Función para limpiar el emoji del título y evitar el doble icono
    const limpiarIconoDeTexto = (texto) => {
        const partes = texto.split(' ');
        if (partes.length > 1) return partes.slice(1).join(' '); // Retorna el texto sin el primer elemento (emoji)
        return texto;
    };

    // Buscamos el icono dinámico para el selector de pago
    const iconoPagoActual = METODOS_PAGO.find(m => m.value === metodoPago)?.title.split(' ')[0] || '💰';
    // ... justo antes del return del TicketPanel
     const [pagaCon, setPagaCon] = useState('');
     const [tipoOrden, setTipoOrden] = useState('mesa');
     const cambio = pagaCon && Number(pagaCon) > 0 ? (Number(pagaCon) - total) : 0;
    return (
        <div 
            className={`${styles.ticketPanel} ${mostrarCarritoMobile ? styles.ticketPanelShowMobile : ''}`}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            
            {/* 1. BOTÓN VOLVER (MÓVIL) */}
            <div 
    onClick={() => setMostrarCarritoMobile(false)} 
    className={styles.closeCartMobile}
    style={{ padding: '25px 10px', textAlign: 'center', backgroundColor: '#000000' }}
>
    ▼ TOCAR PARA VOLVER A LOS PLATOS
</div>

{/* 2. CABECERA - ROLES Y MESEROS */}
<div style={{ padding: 'clamp(10px, 2vw, 8px) clamp(14px, 3vw, 12px)', background: SITE_CONFIG.theme.dark, color: 'white', flexShrink: 0 }}>
    
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2
                onClick={solicitarAccesoCajero} 
                style={{ 
                    fontSize: 'clamp(1.05rem, 2.5vw, 0.95rem)', 
                    margin: 0, 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    color: esModoCajero ? SITE_CONFIG.theme.primary : 'white',
                    lineHeight: 1.2
                }}
            >
                {(SITE_CONFIG.brand.shortName || SITE_CONFIG.brand.name)?.toUpperCase() || "POS"} {ordenMesa ? `(${ordenMesa})` : 'ACTUAL'}
            </h2>

            {cart.length > 0 && (
                <button 
    onClick={() => {
        if (typeof clearCart === 'function') {
            clearCart(); 
            if (typeof setNombreMesero === 'function') setNombreMesero(null);
        }
    }}
    title="Nueva Orden (Limpiar pantalla)"
    style={{
        width: '65px',            // Más ancho para que respire
        height: '45px',           // Un poco más bajo para estilo "cápsula"
        borderRadius: '25px',     // Bordes totalmente redondeados
        backgroundColor: '#E5E7EB', // Gris claro profesional (Apple Style)
        color: '#374151',         // Icono en gris oscuro
        border: '1px solid #D1D5DB', // Borde sutil
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '22px',         // Emoji un pelín más pequeño para que no toque los bordes
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        touchAction: 'manipulation',
        marginLeft: '10px'
    }}
>
    🧹
</button>

            )}
        </div>

        <select 
            value={nombreMesero || ""} 
            onChange={(e) => {
            setNombreMesero(e.target.value);
            // Guardamos en localStorage para que no se pierda al recargar
             localStorage.setItem('ultimoMesero', e.target.value);
            }}
            style={{ 
                padding: 'clamp(8px, 2vw, 4px) clamp(10px, 2.5vw, 6px)',
                borderRadius: '6px',
                border: `1px solid ${SITE_CONFIG.theme.textDark}`, 
                backgroundColor: '#374151',
                color: 'white',
                fontSize: 'clamp(0.95rem, 2.8vw, 0.8rem)',
                fontWeight: 'bold',
                width: 'auto',
                maxWidth: '180px'
            }}
        >
            <option value="">👤 Mesero...</option>
            {esModoCajero && <option value="Caja">💰 Caja (Auto)</option>}
            {listaMeseros?.map(m => (
                <option key={m._id} value={m.nombre}>{m.nombre}</option>
            ))}
        </select>
    </div>
    
   <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '6px 0', justifyContent: 'center' }}>
    
    {/* 1. ÓRDENES */}
    <button 
        onClick={() => { refreshOrdenes(); setMostrarListaOrdenes(true); }} 
        style={{
            flex: '0 0 31%',
            padding: 'clamp(8px, 2.4vw, 7px) 2px',
            backgroundColor: '#9CA3AF',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: 'clamp(0.85rem, 2.5vw, 0.75rem)',
            fontWeight: '900',
            cursor: 'pointer'
        }}
    >
        ÓRDENES ({numOrdenesActivas})
    </button>

    {/* 2. REPORTE */}
    <button 
        onClick={() => esModoCajero ? generarCierreDia() : alert("🔒 Solo el cajero puede ver reportes")} 
        style={{ 
            flex: '0 0 31%',
            padding: 'clamp(8px, 2.4vw, 7px) 2px',
            fontSize: 'clamp(0.85rem, 2.5vw, 0.75rem)', 
            backgroundColor: esModoCajero ? SITE_CONFIG.theme.danger : '#4B5563', 
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '900', 
            cursor: esModoCajero ? 'pointer' : 'not-allowed',
            opacity: esModoCajero ? 1 : 0.6
        }}
    >
        REPORTE
    </button>

    {/* 3. ADMIN */}
    <button 
        onClick={solicitarAccesoAdmin} 
        style={{
            flex: '0 0 31%',
            padding: 'clamp(10px, 2.8vw, 8px) 2px',
            fontSize: 'clamp(0.85rem, 2.5vw, 0.75rem)',
            backgroundColor: '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '900',
            cursor: 'pointer'
        }}
    >
        ADMIN
    </button>

    {/* 4. INVENTARIO */}
    <button 
    onClick={() => setMostrarInventario(true)} // 👈 Solo cambiamos esto
    style={{
        flex: '0 0 31%',
        padding: 'clamp(14px, 3.5vw, 10px) 2px',
        fontSize: 'clamp(0.85rem, 2.5vw, 0.75rem)',
        backgroundColor: '#2563eb', // Tu azul de inventario
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontWeight: '900',
        cursor: 'pointer'
    }}
>
    INVENTARIO
</button>

    {/* 5. + GASTO */}
    <button 
        onClick={registrarGasto} 
        style={{
            flex: '0 0 31%',
            padding: 'clamp(14px, 3.5vw, 10px) 2px',
            fontSize: 'clamp(0.85rem, 2.5vw, 0.75rem)',
            backgroundColor: SITE_CONFIG.theme.accent,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '900',
            cursor: 'pointer'
        }}
    >
        + GASTO
    </button>

    {/* 6. VENTAS */}
    <button 
        onClick={() => setMostrarModalHistorial(true)} 
        style={{
            flex: '0 0 31%',
            padding: 'clamp(14px, 3.5vw, 10px) 2px',
            fontSize: 'clamp(0.85rem, 2.5vw, 0.75rem)',
            backgroundColor: '#228B22', 
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '900',
            cursor: 'pointer'
        }}
    >
        VENTAS
    </button>
</div>
</div>

            {/* 3. LISTADO DE PRODUCTOS (RESTAURADA ALINEACIÓN Y LÓGICA DE ORDENAMIENTO) */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 15px', background: '#f9fafb' }}>
                {cart.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#9CA3AF', marginTop: '20px' }}>No hay productos seleccionados</p>
                ) : (
                    [...cart]
                        .sort((a, b) => {
                            const catA = (a.categoria || "").toLowerCase();
                            const catB = (b.categoria || "").toLowerCase();
                            if (catA === SITE_CONFIG.logic.drinkCategory && catB !== SITE_CONFIG.logic.drinkCategory) return 1;
                            if (catA !== SITE_CONFIG.logic.drinkCategory && catB === SITE_CONFIG.logic.drinkCategory) return -1;
                            const nameA = a.nombre.toLowerCase();
                            const nameB = b.nombre.toLowerCase();
                            const esPriA = SITE_CONFIG.logic.priorityKeywords.some(k => nameA.includes(k));
                            const esPriB = SITE_CONFIG.logic.priorityKeywords.some(k => nameB.includes(k));
                            if (esPriA && !esPriB) return -1;
                            if (!esPriA && esPriB) return 1;
                            return nameA.localeCompare(nameB);
                        })
                        .map(item => (
            <div key={item.lineId} style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '1.05rem', color: '#111827', lineHeight: '1.2' }}>{item.nombre}</strong><br/>
                        <small style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                            ${(item.precioNum || 0).toLocaleString(SITE_CONFIG.brand.currency)} c/u
                        </small>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Subtotal del item */}
                        <strong style={{ fontSize: '1rem', fontWeight: '700', color: '#111827' }}>
                            {((item.precioNum || 0) * item.cantidad).toLocaleString(SITE_CONFIG.brand.currency)}
                        </strong>

                        {/* 💊 CONTROLES DE CANTIDAD (NUEVO ORDEN: + VALOR -) */}
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            backgroundColor: '#F3F4F6', 
                            padding: '4px 8px', 
                            borderRadius: '20px',
                            border: '1px solid #E5E7EB'
                        }}>
                            {/* 1. Botón MÁS (+) a la izquierda */}
                            <button 
                                onClick={() => agregarAlCarrito(item)} 
                                style={{ 
                                    color: '#059669', 
                                    border: 'none', 
                                    background: 'none', 
                                    fontSize: '1.4rem', 
                                    fontWeight: 'bold', 
                                    cursor: 'pointer',
                                    padding: '0 5px',
                                    lineHeight: 1
                                }}
                            >
                                +
                            </button>

                            {/* 2. Cantidad en el centro */}
                            <span style={{ 
                                fontSize: '0.95rem', 
                                fontWeight: '850', 
                                minWidth: '20px', 
                                textAlign: 'center',
                                color: '#374151'
                            }}>
                                {item.cantidad}
                            </span>

                            {/* 3. Botón MENOS (-) a la derecha */}
                            <button 
                                onClick={() => quitarDelCarrito(item.lineId)} 
                                style={{ 
                                    color: SITE_CONFIG.theme.danger, 
                                    border: 'none', 
                                    background: 'none', 
                                    fontSize: '1.4rem', 
                                    fontWeight: 'bold', 
                                    cursor: 'pointer',
                                    padding: '0 5px',
                                    lineHeight: 1
                                }}
                            >
                                −
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Campo de Comentarios (Notas para cocina) */}
                <InputComentario item={item} actualizarComentario={actualizarComentario} />
            </div>
        ))
                )}
            </div>

            {/* 4. PIE DE PÁGINA - SELECTORES MEJORADOS Y CAMPO OTRO */}
            <div style={{ padding: '12px 15px', background: 'white', borderTop: '2px solid #eee', flexShrink: 0 }}>
                
                {/* 💳 SELECTORES: PAGO, PROPINA Y CAMPO OTRO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>{iconoPagoActual}</span>
                            <select 
                                value={metodoPago} 
                                onChange={(e) => setMetodoPago(e.target.value)}
                                style={{ 
                                    width: '100%', padding: '10px 10px 10px 32px', borderRadius: '8px', border: '1px solid #D1D5DB',
                                    backgroundColor: '#FFFFFF', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', cursor: 'pointer'
                                }}
                            >
                                {METODOS_PAGO.map(m => (
                                    <option key={m.value} value={m.value}>
                                        {(limpiarIconoDeTexto(m?.title) || "")?.toUpperCase() || ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ flex: 1, position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>🎁</span>
                            <select 
                                value={propina} 
                                onChange={(e) => {
                                    setPropina(Number(e.target.value));
                                    if (Number(e.target.value) !== -1) setMontoManual(0);
                                }}
                                style={{ 
                                    width: '100%', padding: '10px 10px 10px 32px', borderRadius: '8px', border: '1px solid #D1D5DB',
                                    backgroundColor: '#FFFFFF', fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', cursor: 'pointer'
                                }}
                            >
                                <option value="0">SIN PROPINA (0%)</option>
                                <option value="10">SUGERIDA (10%)</option>
                                <option value="5">CORTESÍA (5%)</option>
                                <option value="-1">VALOR MANUAL ($)</option>
                            </select>
                        </div>
                    </div>
                    {/* 🛵 NUEVAS CASILLAS DE TIPO DE SERVICIO (DEBAJO DE LOS SELECTORES) */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        padding: '8px 10px', 
                        backgroundColor: '#F9FAFB', 
                        borderRadius: '8px', 
                        border: '1px solid #E5E7EB'
                    }}>
                        {[
                            { id: 'mesa', label: 'Mesa', icon: '🏠' },
                            { id: 'domicilio', label: 'Domi', icon: '🛵' },
                            { id: 'llevar', label: 'Llevar', icon: '🛍️' }
                        ].map((opcion) => (
                            <label 
                                key={opcion.id} 
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: '800',
                                    color: tipoOrden === opcion.id ? '#10B981' : '#6B7280'
                                }}
                            >
                                <input
                                    type="radio"
                                    name="tipoServicio"
                                    value={opcion.id}
                                    checked={tipoOrden === opcion.id}
                                    onChange={() => setTipoOrden(opcion.id)}
                                    style={{ 
                                        cursor: 'pointer',
                                        accentColor: '#10B981',
                                        width: '16px',
                                        height: '16px'
                                    }}
                                />
                                {opcion.label}
                            </label>
                        ))}
                    </div>
                    {/* 💰 CAMPO PARA MONTO MANUAL (Solo aparece si se elige valor manual) */}
                    {propina === -1 && (
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: '#10B981' }}>$</span>
                            <input 
                                type="number"
                                placeholder="Escriba valor de propina..."
                                value={montoManual || ''}
                                onChange={(e) => setMontoManual(Number(e.target.value))}
                                style={{ width: '100%', padding: '10px 10px 10px 25px', borderRadius: '8px', border: '2px solid #10B981', outline: 'none', fontWeight: 'bold' }}
                            />
                        </div>
                    )}
                </div>
                {/* 💰 SECCIÓN TOTAL Y CALCULADORA COMPACTA (OPTIMIZADA) */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '6px 0', 
                    borderTop: '1px solid #eee',
                    marginBottom: '6px'
                }}>
                    {/* IZQUIERDA: Calculadora compacta con input más ancho */}
                    {esModoCajero ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#9CA3AF', marginBottom: '2px' }}>PAGA CON:</span>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', fontWeight: 'bold', color: '#6B7280' }}>$</span>
                                    <input 
                                        type="number"
                                        placeholder="0"
                                        value={pagaCon}
                                        onChange={(e) => setPagaCon(e.target.value)}
                                        style={{ 
                                            width: '110px', 
                                            padding: '4px 6px 4px 16px', 
                                            borderRadius: '6px', 
                                            border: '1px solid #D1D5DB', 
                                            fontSize: '0.9rem', 
                                            fontWeight: '900',
                                            outline: 'none',
                                            backgroundColor: '#F9FAFB'
                                        }}
                                    />
                                </div>
                            </div>

                            {pagaCon && (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#9CA3AF', marginBottom: '2px' }}>CAMBIO:</span>
                                    <span style={{ 
                                        fontSize: '0.95rem', 
                                        fontWeight: '950', 
                                        color: cambio < 0 ? '#EF4444' : '#059669' 
                                    }}>
                                        {SITE_CONFIG.brand.symbol}{cambio.toLocaleString(SITE_CONFIG.brand.currency)}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ flex: 1 }}></div> 
                    )}

                    {/* DERECHA: Total alineado independientemente */}
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: SITE_CONFIG.theme.textDark, lineHeight: '1' }}>TOTAL</span>
                        <span style={{ fontSize: '1.45rem', fontWeight: '950', color: '#000', lineHeight: '1.1', marginTop: '2px' }}>
                            {SITE_CONFIG.brand.symbol}{total.toLocaleString(SITE_CONFIG.brand.currency)}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '4px', width: '100%', alignItems: 'center' }}>
    {/* 1. SECCIÓN IMPRESIÓN: Solo si hay algo en el carrito */}
    {cart.length > 0 && (
        <>
            <button 
                onClick={imprimirTicket} 
                style={{ 
                    flex: '0 0 16%', // Ajuste para que no empuje a los demás
                    padding: '12px 1px', 
                    backgroundColor: SITE_CONFIG.theme.secondary, 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    fontWeight: '800', 
                    fontSize: '0.60rem', 
                    cursor: 'pointer' 
                }}
            >
                CLIENTE
            </button>
            <button 
                onClick={imprimirComandaCocina} 
                style={{ 
                    flex: '0 0 16%', 
                    padding: '12px 1px', 
                    backgroundColor: SITE_CONFIG.theme.dark, 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    fontWeight: '800', 
                    fontSize: '0.60rem', 
                    cursor: 'pointer' 
                }}
            >
                COCINA
            </button>
        </>
    )}

    {/* 2. BOTÓN BORRAR: Aparece solo si la mesa ya existe en Sanity (ordenActivaId) */}
    {ordenActivaId && (
        <button 
            className={styles.btnNegro} 
            onClick={cancelarOrden}
            style={{ 
                flex: '0 0 16%', 
                padding: '12px 1px', 
                backgroundColor: '#000', 
                color: '#ff4444', 
                border: '1px solid #ff4444', 
                borderRadius: '6px', 
                fontWeight: '800', 
                fontSize: '0.60rem', 
                cursor: 'pointer' 
            }}
        >
            BORRAR
        </button>
    )}

    {/* 3. BOTÓN GUARDAR / ACTUALIZAR: Siempre visible */}
    <button 
        onClick={guardarOrden} 
        style={{ 
            flex: '1', 
            padding: '12px 2px', 
            backgroundColor: '#fbbf24', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            fontWeight: '900', 
            fontSize: '0.75rem', 
            cursor: 'pointer',
            minWidth: '0' // Evita que el texto largo rompa el layout
        }}
    >
        {ordenActivaId ? 'ACTUALIZAR' : 'GUARDAR'}
    </button>
    {/* 4. BOTÓN COBRAR: Solo si es cajero y la orden ya está guardada */}
{esModoCajero && cart.length > 0 && (
    <button 
        onClick={() => {
            cobrarOrden(metodoPago, tipoOrden); // 1. Ejecuta el proceso de cobro
            setPagaCon(''); // 2. Limpia la calculadora de cambio
           
        }} 
        style={{ 
            flex: '1', 
            padding: '12px 2px', 
            backgroundColor: SITE_CONFIG.theme.primary, 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            fontWeight: '900', 
            fontSize: '0.75rem', 
            cursor: 'pointer',
            minWidth: '0'
        }}
    >
        COBRAR
    </button>
)}
</div>
            </div>
        </div>
    );
}
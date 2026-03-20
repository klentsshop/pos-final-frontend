'use client';

import React, { useState, useEffect, useMemo } from 'react';
// 🛡️ ADAPTADOR: Gestiona si cargamos datos de Sanity o de DEMO_DATA
import { getProductos, getMeseros } from '@/lib/dataAdapter';
import { ENV, DEMO_DATA } from '@/lib/env';

import { useCart } from '@/app/context/CartContext'; 
import { useOrdenes } from '@/hooks/useOrdenes';
import { useReportes } from '@/hooks/useReportes';
import { useImpresion } from '@/hooks/useImpresion';
import { useAccesos } from '@/hooks/useAccesos';
import { useOrdenHandlers } from '@/hooks/useOrdenHandlers';
import { useGastos } from '@/hooks/useGastos';
import { cleanPrice, getFechaBogota } from '@/lib/utils';

import { SITE_CONFIG as RESTAURANTE_CONFIG } from '@/lib/config';
import { PrintTemplates } from '@/components/pos/PrintTemplates';
import ReporteModal from '@/components/modals/ReporteModal';
import AdminModal from '@/components/modals/AdminModal';
import ListaOrdenesModal from '@/components/modals/ListaOrdenesModal';
import TicketPanel from '@/components/pos/TicketPanel';
import ProductGrid from '@/components/pos/ProductGrid';
import styles from './MenuPanel.module.css';
import HistorialVentasModal from '@/components/modals/HistorialVentasModal';
import InventarioModal from '@/components/modals/InventarioModal';
import { useInventario } from '@/hooks/useInventario';

export default function MenuPanel() {
    const { 
        items: cart, total, addProduct: agregarAlCarrito, decrease: quitarDelCarrito, 
        metodoPago, setMetodoPago, setCartFromOrden, clear: clearCart, clearWithStockReturn, 
        actualizarComentario, propina, setPropina, montoManual, setMontoManual 
    } = useCart();

    const { 
        ordenes: ordenesActivas, guardarOrden: apiGuardar, 
        eliminarOrden: apiEliminar, refresh: refreshOrdenes 
    } = useOrdenes();

    const [platos, setPlatos] = useState([]);
    const [categoriaActiva, setCategoriaActiva] = useState('todos');
    const [cargando, setCargando] = useState(true);
    const [mostrarListaOrdenes, setMostrarListaOrdenes] = useState(false);
    const [nombreMesero, setNombreMesero] = useState(null);
    const [mostrarCategoriasMobile, setMostrarCategoriasMobile] = useState(false);
    const [mostrarCarritoMobile, setMostrarCarritoMobile] = useState(false);
    const [listaMeseros, setListaMeseros] = useState([]);
    const [busqueda, setBusqueda] = useState(''); // 🔍 Nuevo estado para el buscador
    const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
    const [mostrarInventario, setMostrarInventario] = useState(false);

    const rep = useReportes(getFechaBogota);
    const imp = useImpresion(cart, RESTAURANTE_CONFIG.logic);
    const datosAgrupados = React.useMemo(() => {
    if (!cart?.length) return { cliente: [], cocina: [] };
    return {
        cliente: imp.agruparParaCliente(),
        cocina: imp.agruparParaCocina()
    };
}, [cart]);
    const gst = useGastos();
    
    const acc = useAccesos(RESTAURANTE_CONFIG, setNombreMesero, {
        // ✅ Corregido: Activamos modal y cargamos datos con delay para evitar colisión de prompts
        onAdminSuccess: (pin) => { 
            rep.setMostrarAdmin(true); 
            setTimeout(() => {
                rep.cargarReporteAdmin(pin);
            }, 100);
        }
    });
    const { tipoOrden } = useCart();
    const ord = useOrdenHandlers({
        cart, total, clearCart, clearWithStockReturn, setCartFromOrden, apiGuardar, apiEliminar, 
        refreshOrdenes, ordenesActivas, esModoCajero: acc.esModoCajero, 
        setMostrarCarritoMobile, nombreMesero, setNombreMesero, tipoOrden
    });

    const handleReimprimirVenta = async (venta) => {
    try {
        const res = await fetch('/api/ventas/reimprimir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ venta })
        });
        if (res.ok) {
            alert("✅ Ticket enviado a la impresora");
        } else {
            alert("❌ Error al generar reimpresión");
        }
    } catch (error) {
        console.error(error);
        alert("❌ Error de conexión");
    }
   };
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (ENV.mode === "template") {
                    setPlatos(DEMO_DATA.platos);
                    setListaMeseros(DEMO_DATA.meseros);
                    setCargando(false);
                    return;
                }

                const [platosData, meserosData] = await Promise.all([
                    getProductos(),
                    getMeseros()
                ]);
                setPlatos(platosData);
                setListaMeseros(meserosData);
                setCargando(false);
            } catch (error) { 
                console.error("Error en MenuPanel:", error); 
            }
        };
        fetchData();
    }, []);

    const platosFiltradosFinal = React.useMemo(() => {
    return platos.filter(p => {
        const nombre = p.nombrePlato || p.nombre || "";
        const cumpleBusqueda = nombre.toLowerCase().includes(busqueda.toLowerCase());
        const cumpleCategoria = categoriaActiva === 'todos' || p.categoria === categoriaActiva;
        return cumpleBusqueda && cumpleCategoria;
    });
}, [platos, busqueda, categoriaActiva]);

// Función para limpiar platos y soltar la mesa (quita el modo "Actualizar")
    const manejarLimpiezaTotal = () => {
    // 🛡️ Solo devolvemos stock si NO hay una orden activa de Sanity cargada
    // Si ord.ordenActivaId es null, significa que es una orden nueva en el "Mostrador"
    if (!ord.ordenActivaId) {
        clearWithStockReturn(); 
    } else {
        // Si hay una orden activa, solo limpiamos la pantalla SIN devolver stock
        clearCart(); 
    }

    // Soltamos la mesa visualmente
    ord.setOrdenActivaId(null);
    ord.setOrdenMesa(null);
};
    return (
        <div className={styles.mainWrapper}>
            <div className={styles.posLayout}>
                <TicketPanel 
                    cart={cart} total={total} metodoPago={metodoPago} setMetodoPago={setMetodoPago}
                    quitarDelCarrito={quitarDelCarrito} agregarAlCarrito={agregarAlCarrito} guardarOrden={ord.guardarOrden} errorMesaOcupada={ord.errorMesaOcupada}
                    setErrorMesaOcupada={ord.setErrorMesaOcupada}cobrarOrden={() => ord.cobrarOrden(metodoPago)}
                    generarCierreDia={rep.generarCierreDia} solicitarAccesoCajero={acc.solicitarAccesoCajero}
                    solicitarAccesoAdmin={acc.solicitarAccesoAdmin} registrarGasto={gst.registrarGasto}
                    refreshOrdenes={refreshOrdenes} setMostrarListaOrdenes={setMostrarListaOrdenes}
                    mostrarCarritoMobile={mostrarCarritoMobile} setMostrarCarritoMobile={setMostrarCarritoMobile}
                    ordenMesa={ord.ordenMesa} nombreMesero={ord.nombreMesero || nombreMesero} setNombreMesero={ord.setNombreMesero || setNombreMesero}
                    listaMeseros={listaMeseros} esModoCajero={acc.esModoCajero}
                    ordenActivaId={ord.ordenActivaId} numOrdenesActivas={ordenesActivas.length} 
                    cleanPrice={cleanPrice} styles={styles} cancelarOrden={ord.cancelarOrden} 
                   clearCart={manejarLimpiezaTotal} imprimirTicket={imp.imprimirTicket} mensajeExito={ord.mensajeExito}
                    actualizarComentario={actualizarComentario} imprimirComandaCocina={imp.imprimirCocina}
                    propina={propina} setPropina={setPropina} montoManual={montoManual} setMontoManual={setMontoManual}
                    setMostrarModalHistorial={setMostrarModalHistorial} setMostrarInventario={setMostrarInventario}
                />

                <ProductGrid 
                    platos={platos} 
                    platosFiltrados={platosFiltradosFinal} // ✅ Usamos la nueva lógica filtrada
                    busqueda={busqueda}                   // ✅ Pasamos el texto
                    setBusqueda={setBusqueda}
                    categoriaActiva={categoriaActiva} setCategoriaActiva={setCategoriaActiva}
                    mostrarCategoriasMobile={mostrarCategoriasMobile} setMostrarCategoriasMobile={setMostrarCategoriasMobile}
                    agregarAlCarrito={agregarAlCarrito} styles={styles}
                    mostrarCarritoMobile={mostrarCarritoMobile} setMostrarCarritoMobile={setMostrarCarritoMobile}
                    cart={cart}   // 👈 AGREGA ESTA LÍNEA
                    total={total}
                    ordenesActivas={ordenesActivas} 
                    cargarOrden={ord.cargarOrden}
                    clearCart={manejarLimpiezaTotal}
                    mensajeExito={ord.mensajeExito}
                />

                <PrintTemplates 
                    cart={cart} total={total} ordenMesa={ord.ordenMesa} 
                    nombreMesero={nombreMesero} config={RESTAURANTE_CONFIG} 
                    agrupadoCliente={datosAgrupados.cliente}                agrupadoCocina={datosAgrupados.cocina}
                    ordenActivaId={ord.ordenActivaId}
                    cleanPrice={cleanPrice}
                    propina={propina} montoManual={montoManual}
                />
            </div>

            <div className={styles.tablesFooter}>
                <div style={{ fontWeight: '900', color: 'white', marginRight: '15px', fontSize: '0.75rem' }}>MESAS ACTIVAS:</div>
                {ordenesActivas.map((orden) => (
                    <button key={orden._id} className={`${styles.tableBtn} ${ord.ordenActivaId === orden._id ? styles.tableBtnActive : ''}`} onClick={() => ord.cargarOrden(orden._id)}>
                        {orden.mesa}
                    </button>
                ))}
            </div>

            <ListaOrdenesModal isOpen={mostrarListaOrdenes} onClose={() => setMostrarListaOrdenes(false)} ordenes={ordenesActivas} onCargar={(id) => { ord.cargarOrden(id).then(s => s && setMostrarListaOrdenes(false)) }} />
            <ReporteModal isOpen={rep.mostrarReporte} onClose={() => rep.setMostrarReporte(false)} cargando={rep.cargandoReporte} datos={rep.datosReporte} fechaInicio={rep.fechaInicioReporte} setFechaInicio={rep.setFechaInicioReporte} fechaFin={rep.fechaFinReporte} setFechaFin={rep.setFechaFinReporte} onGenerar={rep.generarCierreDia} listaGastos={rep.listaGastosDetallada} />
            
            <AdminModal 
                isOpen={rep.mostrarAdmin} 
                onClose={() => rep.setMostrarAdmin(false)} 
                fechaInicio={rep.fechaInicioFiltro} 
                setFechaInicio={rep.setFechaInicioFiltro} 
                fechaFin={rep.fechaFinFiltro} 
                setFechaFin={rep.setFechaFinFiltro} 
                onGenerar={() => rep.cargarReporteAdmin()} 
                cargando={rep.cargandoAdmin} 
                reporte={rep.reporteAdmin} 
            />
            <HistorialVentasModal 
             isOpen={mostrarModalHistorial} 
             onClose={() => setMostrarModalHistorial(false)} 
             onReimprimir={handleReimprimirVenta}
            />
            <InventarioModal 
            isOpen={mostrarInventario} 
            onClose={() => setMostrarInventario(false)} 
            />
            {/* 🚨 BLOQUEO TOTAL DISUASIVO */}
            {ord.errorMesaOcupada && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: '#dc2626', zIndex: 99999, display: 'flex',
                    flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                    color: 'white', textAlign: 'center', padding: '20px'
                }}>
                    <span style={{ fontSize: '5rem' }}>⚠️</span>
                    <h1 style={{ fontSize: '3rem', fontWeight: '900' }}>MESA OCUPADA</h1>
                    <p style={{ fontSize: '1.5rem' }}>
                        La mesa <strong>{ord.errorMesaOcupada}</strong> ya tiene un pedido activo.
                    </p>
                    <button 
                        onClick={() => ord.setErrorMesaOcupada(null)}
                        style={{
                            marginTop: '25px', padding: '15px 40px', backgroundColor: 'white',
                            color: '#dc2626', border: 'none', borderRadius: '50px',
                            fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer'
                        }}
                    >
                        Dale Guardar Nuevamente, Con otro Nombre
                    </button>
                </div>
            )}
        </div>
    );
}
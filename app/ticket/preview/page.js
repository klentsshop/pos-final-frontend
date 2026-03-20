'use client';
import React, { useEffect, useState } from 'react';
import { SITE_CONFIG } from '@/lib/config';

export default function TicketPreviewPage() {
    const [data, setData] = useState(null);

    useEffect(() => {
        const savedData = sessionStorage.getItem('ticket_preview_data');
        if (savedData) {
            setData(JSON.parse(savedData));
        }
    }, []);

    if (!data) return <p style={{ textAlign: 'center', marginTop: '50px' }}>Cargando ticket...</p>;

    const totalProductos = data.productos.reduce((acc, item) => acc + (item.precioNum * item.cantidad), 0);
    const valorPropina = data.propina === -1 ? data.montoManual : (totalProductos * (data.propina / 100));
    const totalFinal = totalProductos + valorPropina;

    // ✨ Lógica para evitar redundancia (Ej: Evita "DOMICILIO: Domicilio 1")
    const mostrarEncabezadoMesa = () => {
        const tipo = data.tipoOrden?.toUpperCase() || "";
        const mesa = data.mesa || "";
        if (mesa.toUpperCase().includes(tipo)) return mesa; // Si ya dice "Domi", solo muestra "Domi 1"
        return `${tipo}: ${mesa}`; // Si es mesa normal, muestra "MESA: 5"
    };

    return (
        <div style={{ 
            width: '100%', 
            maxWidth: '400px', 
            margin: '0 auto', 
            padding: '20px', 
            backgroundColor: 'white', 
            fontFamily: 'monospace', 
            color: '#000' 
        }}>
            {/* 🏥 BOTÓN VOLVER ORIGINAL */}
            <button 
                onClick={() => window.close()} 
                className="no-print"
                style={{ 
                    width: '100%', padding: '15px', marginBottom: '20px', 
                    backgroundColor: '#000', color: '#fff', border: 'none', 
                    borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                    fontSize: '1rem'
                }}
            >
                ⬅️ CERRAR Y VOLVER AL POS
            </button>

            {/* 🎫 DISEÑO DEL TICKET */}
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}>{SITE_CONFIG.brand.name.toUpperCase()}</h2>
                <p style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: '5px 0' }}>
                    {mostrarEncabezadoMesa()}
                </p>
                <p style={{ fontSize: '0.8rem', margin: '2px 0' }}>Mesero: {data.mesero}</p>
                <p style={{ fontSize: '0.7rem' }}>{new Date(data.fecha).toLocaleString()}</p>
            </div>

            <hr style={{ border: 'none', borderTop: '1px dashed #000' }} />

            <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                        <th style={{ textAlign: 'left', padding: '5px 0' }}>Cant</th>
                        <th style={{ textAlign: 'left' }}>Producto</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.productos.map((item, index) => (
                        <tr key={index}>
                            <td style={{ padding: '5px 0' }}>{item.cantidad}</td>
                            <td>{item.nombre}</td>
                            <td style={{ textAlign: 'right' }}>
                                ${(item.precioNum * item.cantidad).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <hr style={{ border: 'none', borderTop: '1px dashed #000', marginTop: '10px' }} />

            <div style={{ textAlign: 'right', marginTop: '10px' }}>
                <p style={{ margin: '2px 0' }}>Subtotal: ${totalProductos.toLocaleString()}</p>
                {valorPropina > 0 && <p style={{ margin: '2px 0' }}>Propina: ${valorPropina.toLocaleString()}</p>}
                <h3 style={{ margin: '5px 0', fontSize: '1.2rem', borderTop: '1px solid #000', paddingTop: '5px' }}>
                    TOTAL: ${totalFinal.toLocaleString()}
                </h3>
            </div>

            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.8rem' }}>
                ¡Gracias por su visita!
            </p>

            <style jsx>{`
                @media print {
                    .no-print { display: none !important; }
                    body { padding: 0; margin: 0; }
                }
            `}</style>
        </div>
    );
}
'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { cleanPrice } from '@/lib/utils'; // ✅ Usamos tu utilidad global

const CartContext = createContext();
const avisosDados = new Set();
const stockLocalCache = new Map();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [propina, setPropina] = useState(0); // 👈 Estado para el % de propina
  const [montoManual, setMontoManual] = useState(0); // 👈 Campo "Otro" (Monto manual)

  // 💾 1. Al iniciar, recuperar del navegador si existe algo (Ahora localStorage)
  useEffect(() => {
    const saved = localStorage.getItem('talanquera_cart');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) setItems(parsed);
    }

    // 🔥 SINCRONIZACIÓN ENTRE PESTAÑAS:
    const syncTabs = (e) => {
      if (e.key === 'talanquera_cart') {
        const newValue = e.newValue ? JSON.parse(e.newValue) : [];
        setItems(newValue);
      }
    };
    window.addEventListener('storage', syncTabs);
    return () => window.removeEventListener('storage', syncTabs);
  }, []);

  // 💾 2. Cada vez que cambien los items, guardarlos en el navegador
  useEffect(() => {
    localStorage.setItem('talanquera_cart', JSON.stringify(items));
  }, [items]);


const addProduct = async (product) => {
  const pId = product._id || product.id;
  const insumoId = product.insumoVinculado?._ref;

  // --- 🛡️ ESCUDO PREVENTIVO (Bloqueo Síncrono) ---
  if (product.controlaInventario && insumoId) {
    const stockEnProducto = Number(product.stockActual) || 0;
    
    // 🔄 SOLUCIÓN AL FANTASMA: Si el producto trae más stock que el mapa, actualizamos el mapa
    if (!stockLocalCache.has(insumoId) || stockEnProducto > Number(stockLocalCache.get(insumoId))) {
      stockLocalCache.set(insumoId, stockEnProducto);
    }

    const stockDisponible = Number(stockLocalCache.get(insumoId));
    const cantidadADescontar = Number(product.cantidadADescontar) || 1;

    // 🚀 BLINDAJE DECIMAL: Agregamos + 0.001 para que 0.99999999 no bloquee un descuento de 1
    if ((stockDisponible + 0.001) < cantidadADescontar) {
      alert(`🚫 STOCK AGOTADO LOCAL: No puedes agregar más "${product.nombre}".`);
      return; 
    }

    // Restamos del mapa inmediatamente para bloquear el siguiente clic
    stockLocalCache.set(insumoId, stockDisponible - cantidadADescontar);
  }

  // --- 🍎 1. LÓGICA VISUAL (Instantánea) ---
  const precioNum = cleanPrice(product.precio);

  setItems(prev => {
    const existingIdx = prev.findIndex(it => (it._id || it.id) === pId && (!it.comentario || it.comentario.trim() === ''));
    if (existingIdx !== -1) {
      const copy = [...prev];
      const nuevaCantidad = copy[existingIdx].cantidad + 1;
      copy[existingIdx] = { ...copy[existingIdx], cantidad: nuevaCantidad, subtotalNum: nuevaCantidad * precioNum };
      return copy;
    }
    return [...prev, { ...product, _id: pId, lineId: crypto.randomUUID(), cantidad: 1, precioNum, subtotalNum: precioNum, comentario: '',categoria: product.categoria || "COCINA" }];
  });

  // --- 🛡️ 2. LÓGICA DE INVENTARIO Y REVERSIÓN ---
  if (product.controlaInventario && insumoId) {
    fetch('/api/inventario/descontar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insumoId, cantidad: product.cantidadADescontar || 1 })
    })
    .then(async (res) => {
      const data = await res.json();

      if (res.status === 409) {
        // El servidor manda: si no hay, ponemos 0 y avisamos
        stockLocalCache.set(insumoId, 0);
        avisosDados.add(insumoId);

        setItems(prev => {
          const idx = prev.findIndex(it => (it._id || it.id) === pId && (!it.comentario || it.comentario.trim() === ''));
          if (idx === -1) return prev;
          const copy = [...prev];
          if (copy[idx].cantidad > 1) {
            const nCant = copy[idx].cantidad - 1;
            copy[idx] = { ...copy[idx], cantidad: nCant, subtotalNum: nCant * precioNum };
            return copy;
          } else {
            return copy.filter((_, i) => i !== idx);
          }
        });

        alert(`🚫 ERROR DE STOCK: El servidor indica que solo quedaban ${data.disponible} unidades.`);
        return;
      }
      
      if (res.ok) {
        // Sincronización final con el dato real del servidor
        stockLocalCache.set(insumoId, Number(data.nuevoStock));
        if (data.alertaStockBajo && !avisosDados.has(insumoId)) {
          avisosDados.add(insumoId);
          alert(`⚠️ AVISO: Stock bajo de "${product.nombre}" (${data.nuevoStock} disp.)`);
        }
      }
    })
    .catch(err => console.error("Error crítico inventario:", err));
  }
};
  const setCartFromOrden = (platosOrdenados = []) => {
    localStorage.removeItem('talanquera_cart');
    
    const reconstruido = platosOrdenados.map(p => ({
      lineId: p._key || crypto.randomUUID(),
      _id: p._id || p.nombrePlato,
      nombre: p.nombrePlato,
      precio: cleanPrice(p.precioUnitario),
      cantidad: Number(p.cantidad) || 1,
      precioNum: cleanPrice(p.precioUnitario),
      subtotalNum: cleanPrice(p.precioUnitario) * (Number(p.cantidad) || 1),
      comentario: p.comentario || "",
      categoria: p.categoria || "COCINA",
      // 🚨 ESTOS SON LOS CABLES QUE FALTABAN:
      controlaInventario: p.controlaInventario || false,
      insumoVinculado: p.insumoVinculado || null,
      cantidadADescontar: p.cantidadADescontar || 0
    }));

    console.log('✅ [CartContext] MESA CARGADA CON INVENTARIO:', reconstruido);
    setItems(reconstruido);
};
  const actualizarComentario = (lineId, comentario) => {
    setItems(prev =>
      prev.map(it =>
        it.lineId === lineId ? { ...it, comentario } : it
      )
    );
  };

 const decrease = async (lineId) => {
  const itemADisminuir = items.find(i => i.lineId === lineId);
  if (!itemADisminuir) return;

  const insumoId = itemADisminuir.insumoVinculado?._ref;

  if (itemADisminuir.controlaInventario && insumoId) {
    const stockActualEnMapa = stockLocalCache.get(insumoId) || 0;
    const unidadInsumoXPlato = Number(itemADisminuir.cantidadADescontar) || 1;
    stockLocalCache.set(insumoId, stockActualEnMapa + unidadInsumoXPlato);

    fetch('/api/inventario/devolver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        items: [{ 
          // 🚨 CAMBIO CRÍTICO: Usamos 'insumoId' para que la API lo reconozca
          insumoId: insumoId, 
          cantidad: 1, // 1 plato
          insumos: [{ _id: insumoId, cantidad: unidadInsumoXPlato }] // Mantenemos este por si acaso
        }] 
      })
    })
    .then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data.nuevoStock) {
            stockLocalCache.set(insumoId, Number(data.nuevoStock));
        }
        if (!data.alertaStockBajo) {
          avisosDados.delete(insumoId);
        }
      }
    })
    .catch(err => console.error("Error al devolver stock:", err));
  }

  // Lógica de UI intacta
  setItems(prev => {
    const idx = prev.findIndex(i => i.lineId === lineId);
    if (idx === -1) return prev;
    const copy = [...prev];
    if (copy[idx].cantidad <= 1) {
      copy.splice(idx, 1);
    } else {
      const nuevaCant = copy[idx].cantidad - 1;
      copy[idx] = { 
        ...copy[idx], 
        cantidad: nuevaCant,
        subtotalNum: nuevaCant * (copy[idx].precioNum || 0)
      };
    }
    return copy;
  });
};
  const clear = () => {
    setItems([]);
    setPropina(0);
    setMontoManual(0);
    localStorage.removeItem('talanquera_cart');
    localStorage.removeItem('talanquera_mesa');
  };
  const clearWithStockReturn = async () => {
    // 1. Preparamos el paquete de datos en el formato que la API espera
    const itemsParaDevolver = items
      .filter(it => it.controlaInventario && (it.insumoVinculado?._ref || it.insumoId))
      .map(it => ({
        insumoId: it.insumoVinculado?._ref || it.insumoId,
        // Calculamos el total: (lo que gasta cada plato) x (cuántos platos hay)
        cantidad: (Number(it.cantidadADescontar) || 1) * (Number(it.cantidad) || 1)
      }));

    // 2. Si hay algo que devolver, hacemos UN SOLO viaje a la API (más rápido)
    if (itemsParaDevolver.length > 0) {
      try {
        await fetch('/api/inventario/devolver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            items: itemsParaDevolver // 👈 Aquí está la clave: enviamos la carpeta "items"
          })
        });
        console.log("✅ Stock devuelto masivamente");
      } catch (e) {
        console.error("Error devolviendo stock en limpieza profunda", e);
      }
    }
    
    // 3. Limpieza visual
    clear(); 
};
  // 🧮 CÁLCULO DEL TOTAL BLINDADO
  const total = useMemo(() => {
    const subtotalProductos = items.reduce((s, it) => s + (it.precioNum * it.cantidad), 0);
    
    // Si la propina es manual (-1), ignoramos porcentajes y sumamos el monto puro
    if (propina === -1) {
      return subtotalProductos + Number(montoManual);
    }
    
    const valorPropinaPorcentaje = subtotalProductos * (propina / 100);
    return subtotalProductos + valorPropinaPorcentaje;
  }, [items, propina, montoManual]);

  return (
    <CartContext.Provider value={{
      items,
      addProduct,
      setCartFromOrden,
      decrease,
      clear,
      clearWithStockReturn,
      total,
      metodoPago,
      setMetodoPago,
      propina,
      setPropina,
      montoManual,
      setMontoManual,
      actualizarComentario,
      cleanPrice: cleanPrice
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
// Archivo: talanquera-frontend/lib/utils.js
import { SITE_CONFIG } from './config';

export const cleanPrice = (valor) => {
    if (typeof valor === 'number') return valor;
    if (!valor && valor !== 0) return 0;
    const cleaned = String(valor).replace(/[^0-9]/g, '');
    const n = parseInt(cleaned, 10);
    return isNaN(n) ? 0 : n;
};

export const formatPrecioDisplay = cleanPrice;

// ✅ Cero pérdida: traerá las 12 categorías desde el config.js
export const categoriasMap = SITE_CONFIG.categorias;

// ✅ Traerá los 3 métodos de pago desde el config.js
export const METODOS_PAGO = SITE_CONFIG.metodosPago;

export const getFechaBogota = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: SITE_CONFIG.logic.timezone || 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
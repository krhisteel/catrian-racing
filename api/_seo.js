// Utilidades compartidas para las páginas indexables, el sitemap y el catálogo de Google.
const SUPABASE_URL = 'https://odywoasventojksfemgp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3b6ZTWdN05NeRyWOzE4AOg_f7TqFIn-';
const STORE_NAME = 'Catrian Racing';

const CATEGORIES = ['Motos', 'Repuestos', 'Equipamiento', 'Accesorios'];
const DESCRIPTIONS = {
    'Motos': 'Motos nuevas listas para entregar. Cotiza la tuya y te contamos de disponibilidad y financiamiento.',
    'Repuestos': 'Repuestos de mantención y desgaste para calle, off-road y scooter. Busca por tu moto y compra con despacho a todo Chile.',
    'Equipamiento': 'Cascos, chaquetas y guantes para rodar seguro, con tallas para todos.',
    'Accesorios': 'Accesorios para proteger, personalizar y equipar tu moto.',
    'Neumáticos': 'Neumáticos para calle, deportivos, off-road y scooter. Filtra por medida, uso y posición para encontrar el tuyo.',
    'Frenos': 'Pastillas y repuestos de frenos para frenar con seguridad en calle y pista.',
    'Filtros': 'Filtros de aceite y aire para cada mantención.',
    'Baterías': 'Baterías selladas libres de mantención para que tu moto parta siempre.',
    'Encendido': 'Bujías y repuestos de encendido para un motor que responde.',
    'Aceites y lubricantes': 'Aceites de motor y lubricantes para cadena.',
    'Transmisión': 'Kits de arrastre, cadenas y correas de transmisión.',
    'Suspensión': 'Retenes y repuestos para mantener la suspensión como nueva.',
    'Cascos': 'Cascos certificados para ciudad, ruta y pista.',
    'Chaquetas': 'Chaquetas con protecciones para rodar cómodo y seguro.',
    'Guantes': 'Guantes con refuerzos para calle y pista.',
    'Seguridad': 'Candados y alarmas para proteger tu moto.',
    'Escapes': 'Escapes deportivos para más sonido y estilo.',
    'Electrónica': 'Soportes y accesorios electrónicos para tu moto.'
};

async function db(path) {
    const res = await fetch(SUPABASE_URL + path, { headers: { apikey: SUPABASE_KEY } });
    if (!res.ok) throw new Error('db ' + res.status);
    return res.json();
}

function activeProducts() {
    return db('/rest/v1/products?select=*&active=is.true&order=sort.asc,name.asc');
}

// Dominio oficial de la tienda: no se toma de las cabeceras de la petición (evita URLs canónicas ajenas).
// Si conectas un dominio propio, define SITE_ORIGIN en Vercel (ej: https://catrianracing.cl).
const SITE_ORIGIN = String(process.env.SITE_ORIGIN || 'https://catrian-racing.vercel.app').replace(/\/+$/, '');

function origin() {
    return SITE_ORIGIN;
}

function esc(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Las redes sociales no muestran SVG: se usa la versión PNG de las ilustraciones locales.
function imageUrl(base, p) {
    const src = (p.images && p.images[0]) || p.img || '';
    if (!src) return base + '/img/productos/neumatico.png';
    if (/^https?:\/\//.test(src)) return src;
    return base + '/' + src.replace(/^\/+/, '').replace(/\.svg$/, '.png');
}

function productPath(p) {
    return '/productos/' + encodeURIComponent(p.id);
}

function categoryPath(cat, sub) {
    return '/categoria/' + encodeURIComponent(cat) + (sub ? '/' + encodeURIComponent(sub) : '');
}

function clip(text, max) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : text;
}

function inStock(p) {
    return p.stock == null || p.stock > 0;
}

module.exports = {
    STORE_NAME, CATEGORIES, DESCRIPTIONS, db, activeProducts, origin, esc, imageUrl,
    productPath, categoryPath, clip, inStock
};

(function () {
    var WHATSAPP = '56936621284';
    var FREE_SHIPPING_FROM = 100000;
    var MP_ENABLED = false; // Pago con tarjeta en línea (Mercado Pago), se activa en el panel.
    // Tarifas de envío por región (se administran en Ajustes del panel).
    var SHIPPING_RATES = {
        'Arica y Parinacota': 7990, 'Tarapacá': 7990, 'Antofagasta': 7990, 'Atacama': 6490, 'Coquimbo': 6490,
        'Valparaíso': 5490, 'Metropolitana': 3990, "O'Higgins": 5490, 'Maule': 5990, 'Ñuble': 5990, 'Biobío': 5990,
        'La Araucanía': 6990, 'Los Ríos': 6990, 'Los Lagos': 6990, 'Aysén': 9990, 'Magallanes': 9990
    };
    var STORAGE_KEY = 'catrian-cart';
    var FAVS_KEY = 'catrian-favs';
    var RECENT_KEY = 'catrian-recent';
    var DB = window.CATRIAN_SUPABASE || null;

    // El catálogo, las motos, los cupones y los ajustes se administran desde admin.html
    // (Supabase). Los datos de abajo son el respaldo si la base de datos no responde.
    // quote: true → el producto se cotiza por WhatsApp en vez de ir al carro.
    // Motos para el buscador «Busca por tu moto». Los ids se usan en «fits» de cada repuesto.
    var vehicles = [
        { id: 'honda-cb190r', type: 'Calle', brand: 'Honda', model: 'CB190R' },
        { id: 'yamaha-fz25', type: 'Calle', brand: 'Yamaha', model: 'FZ25' },
        { id: 'suzuki-gixxer150', type: 'Calle', brand: 'Suzuki', model: 'Gixxer 150' },
        { id: 'bajaj-ns200', type: 'Calle', brand: 'Bajaj', model: 'Pulsar NS200' },
        { id: 'kawasaki-ninja400', type: 'Calle', brand: 'Kawasaki', model: 'Ninja 400' },
        { id: 'ktm-duke390', type: 'Calle', brand: 'KTM', model: 'Duke 390' },
        { id: 'honda-xr150l', type: 'Off-road', brand: 'Honda', model: 'XR150L' },
        { id: 'yamaha-xtz250', type: 'Off-road', brand: 'Yamaha', model: 'XTZ 250' },
        { id: 'suzuki-dr650', type: 'Off-road', brand: 'Suzuki', model: 'DR650' },
        { id: 'ktm-exc300', type: 'Off-road', brand: 'KTM', model: 'EXC 300' },
        { id: 'honda-pcx160', type: 'Scooter', brand: 'Honda', model: 'PCX 160' },
        { id: 'yamaha-nmax155', type: 'Scooter', brand: 'Yamaha', model: 'NMAX 155' },
        { id: 'suzuki-burgman125', type: 'Scooter', brand: 'Suzuki', model: 'Burgman 125' }
    ];

    var STREET = ['honda-cb190r', 'yamaha-fz25', 'suzuki-gixxer150', 'bajaj-ns200', 'kawasaki-ninja400', 'ktm-duke390'];
    var OFFROAD = ['honda-xr150l', 'yamaha-xtz250', 'suzuki-dr650', 'ktm-exc300'];
    var SCOOTER = ['honda-pcx160', 'yamaha-nmax155', 'suzuki-burgman125'];

    // Catálogo: edita aquí precios, stock, fotos y variantes.
    // quote: true → el producto se cotiza por WhatsApp en vez de ir al carro.
    // fits: motos compatibles (sin «fits» = universal). freeShip: despacho gratis a todo Chile.
    var products = [
        {
            id: 'pista-250', name: 'Modelo Pista 250', cat: 'Motos', price: 2490000, quote: true, cc: 250,
            img: 'https://live.staticflickr.com/2311/2354229865_5dd534fba7.jpg',
            desc: 'Deportiva 250cc, ideal para ciudad y ruta.',
            specs: [['Cilindrada', '250 cc'], ['Potencia', '28 HP'], ['Año', '2025']]
        },
        {
            id: 'trail-400', name: 'Trail 400', cat: 'Motos', price: 3190000, quote: true, cc: 400,
            img: 'https://live.staticflickr.com/2186/2269295323_8c741e70e3.jpg',
            desc: 'Doble propósito, lista para el barro.',
            specs: [['Cilindrada', '400 cc'], ['Potencia', '35 HP'], ['Año', '2024']]
        },
        {
            id: 'naked-500', name: 'Naked 500', cat: 'Motos', price: 4050000, quote: true, cc: 500, badge: 'Nuevo',
            img: 'https://live.staticflickr.com/2315/1961611743_74c76f78f8.jpg',
            desc: 'Potencia urbana con estilo agresivo.',
            specs: [['Cilindrada', '500 cc'], ['Potencia', '47 HP'], ['Año', '2025']]
        },
        {
            id: 'kit-arrastre', name: 'Kit de arrastre', cat: 'Repuestos', sub: 'Transmisión', brand: 'EK', price: 24990, stock: 14,
            img: 'img/productos/kit-arrastre.svg', images: ['img/productos/kit-arrastre.svg', 'img/productos/kit-arrastre-2.svg'],
            desc: 'Cadena, piñón y catalina de acero templado.',
            options: { name: 'Paso de cadena', values: ['428', '520', '525'] },
            fits: STREET.concat(OFFROAD)
        },
        {
            id: 'neumatico-dunlop-110-70-17', name: 'Neumático Dunlop Calle 110/70-17', cat: 'Repuestos', sub: 'Neumáticos', brand: 'Dunlop', price: 54990, stock: 8, freeShip: true,
            img: 'img/productos/neumatico-dunlop-110-70-17.svg', images: ['img/productos/neumatico-dunlop-110-70-17.svg', 'img/productos/neumatico-dunlop-110-70-17-2.svg'],
            desc: 'Neumático de calle con buen agarre en seco y mojado, ideal para uso diario.',
            specs: [['Medida', '110/70-17'], ['Uso', 'Calle'], ['Posición', 'Delantero'], ['Construcción', 'Radial'], ['Índice de carga y velocidad', '54H']],
            fits: ['honda-cb190r', 'yamaha-fz25', 'suzuki-gixxer150', 'bajaj-ns200', 'kawasaki-ninja400', 'ktm-duke390']
        },
        {
            id: 'neumatico-michelin-140-70-17', name: 'Neumático Michelin Sport 140/70-17', cat: 'Repuestos', sub: 'Neumáticos', brand: 'Michelin', price: 89990, stock: 5, badge: 'Más vendido', freeShip: true,
            img: 'img/productos/neumatico-michelin-140-70-17.svg', images: ['img/productos/neumatico-michelin-140-70-17.svg', 'img/productos/neumatico-michelin-140-70-17-2.svg'],
            desc: 'Compuesto deportivo de alto agarre para calle rápida y track days.',
            specs: [['Medida', '140/70-17'], ['Uso', 'Deportivo'], ['Posición', 'Trasero'], ['Construcción', 'Radial'], ['Índice de carga y velocidad', '66H']],
            fits: ['honda-cb190r', 'yamaha-fz25', 'bajaj-ns200', 'kawasaki-ninja400']
        },
        {
            id: 'neumatico-pirelli-150-60-17', name: 'Neumático Pirelli Racing 150/60-17', cat: 'Repuestos', sub: 'Neumáticos', brand: 'Pirelli', price: 119990, stock: 3, compare: 134990, freeShip: true,
            img: 'img/productos/neumatico-pirelli-150-60-17.svg', images: ['img/productos/neumatico-pirelli-150-60-17.svg', 'img/productos/neumatico-pirelli-150-60-17-2.svg'],
            desc: 'Compuesto deportivo de alto agarre para calle rápida y track days.',
            specs: [['Medida', '150/60-17'], ['Uso', 'Deportivo'], ['Posición', 'Trasero'], ['Construcción', 'Radial'], ['Índice de carga y velocidad', '66W']],
            fits: ['kawasaki-ninja400', 'ktm-duke390']
        },
        {
            id: 'neumatico-metzeler-90-90-21', name: 'Neumático Metzeler Enduro 90/90-21', cat: 'Repuestos', sub: 'Neumáticos', brand: 'Metzeler', price: 79990, stock: 6,
            img: 'img/productos/neumatico-metzeler-90-90-21.svg', images: ['img/productos/neumatico-metzeler-90-90-21.svg', 'img/productos/neumatico-metzeler-90-90-21-2.svg'],
            desc: 'Tacos profundos para tierra, barro y ripio. Gran tracción fuera del camino.',
            specs: [['Medida', '90/90-21'], ['Uso', 'Off-road'], ['Posición', 'Delantero'], ['Construcción', 'Diagonal'], ['Índice de carga y velocidad', '54R']],
            fits: ['honda-xr150l', 'yamaha-xtz250', 'suzuki-dr650', 'ktm-exc300']
        },
        {
            id: 'neumatico-kenda-110-100-18', name: 'Neumático Kenda MX 110/100-18', cat: 'Repuestos', sub: 'Neumáticos', brand: 'Kenda', price: 49990, stock: 0,
            img: 'img/productos/neumatico-kenda-110-100-18.svg', images: ['img/productos/neumatico-kenda-110-100-18.svg', 'img/productos/neumatico-kenda-110-100-18-2.svg'],
            desc: 'Tacos profundos para tierra, barro y ripio. Gran tracción fuera del camino.',
            specs: [['Medida', '110/100-18'], ['Uso', 'Off-road'], ['Posición', 'Trasero'], ['Construcción', 'Diagonal'], ['Índice de carga y velocidad', '64M']],
            fits: ['yamaha-xtz250', 'suzuki-dr650', 'ktm-exc300']
        },
        {
            id: 'neumatico-irc-130-70-13', name: 'Neumático IRC Scooter 130/70-13', cat: 'Repuestos', sub: 'Neumáticos', brand: 'IRC', price: 44990, stock: 10,
            img: 'img/productos/neumatico-irc-130-70-13.svg', images: ['img/productos/neumatico-irc-130-70-13.svg', 'img/productos/neumatico-irc-130-70-13-2.svg'],
            desc: 'Neumático urbano para scooter, cómodo y de larga duración.',
            specs: [['Medida', '130/70-13'], ['Uso', 'Scooter'], ['Posición', 'Trasero'], ['Construcción', 'Diagonal'], ['Índice de carga y velocidad', '63P']],
            fits: ['honda-pcx160', 'yamaha-nmax155']
        },
        {
            id: 'bateria', name: 'Batería 12V', cat: 'Repuestos', sub: 'Baterías', brand: 'Yuasa', price: 34990, stock: 6,
            img: 'img/productos/bateria.svg', images: ['img/productos/bateria.svg', 'img/productos/bateria-2.svg'],
            desc: 'Batería sellada libre de mantención.',
            specs: [['Voltaje', '12 V'], ['Capacidad', '7 Ah']],
            fits: STREET.concat(SCOOTER, ['honda-xr150l', 'yamaha-xtz250'])
        },
        {
            id: 'filtro-aceite', name: 'Filtro de aceite', cat: 'Repuestos', sub: 'Filtros', brand: 'Hiflo', price: 8990, compare: 11990, stock: 30,
            img: 'img/productos/filtro-aceite.svg', images: ['img/productos/filtro-aceite.svg', 'img/productos/filtro-aceite-2.svg'],
            desc: 'Filtro de alto flujo para mantención periódica.',
            fits: STREET.concat(OFFROAD, SCOOTER)
        },
        {
            id: 'filtro-aire', name: 'Filtro de aire', cat: 'Repuestos', sub: 'Filtros', brand: 'Hiflo', price: 12990, stock: 11,
            img: 'img/productos/filtro-aire.svg', images: ['img/productos/filtro-aire.svg', 'img/productos/filtro-aire-2.svg'],
            desc: 'Mejor respiración del motor y protección contra el polvo.',
            fits: ['honda-cb190r', 'yamaha-fz25', 'honda-xr150l', 'yamaha-xtz250', 'honda-pcx160', 'yamaha-nmax155']
        },
        {
            id: 'pastillas', name: 'Pastillas de freno', cat: 'Repuestos', sub: 'Frenos', brand: 'EBC', price: 19990, stock: 3,
            img: 'img/productos/pastillas.svg', images: ['img/productos/pastillas.svg', 'img/productos/pastillas-2.svg'],
            desc: 'Compuesto sinterizado para calle y pista.',
            options: { name: 'Posición', values: ['Delantera', 'Trasera'] },
            fits: STREET.concat(OFFROAD, SCOOTER)
        },
        {
            id: 'bujia', name: 'Bujía de iridio', cat: 'Repuestos', sub: 'Encendido', brand: 'NGK', price: 9990, stock: 40, badge: 'Más vendido',
            img: 'img/productos/bujia.svg', images: ['img/productos/bujia.svg', 'img/productos/bujia-2.svg'],
            desc: 'Encendido más rápido y mayor duración que una bujía estándar.',
            fits: STREET.concat(OFFROAD, SCOOTER)
        },
        {
            id: 'aceite', name: 'Aceite 10W-40 4L', cat: 'Repuestos', sub: 'Aceites y lubricantes', brand: 'Motul', price: 39990, stock: 18, freeShip: true,
            img: 'img/productos/aceite.svg', images: ['img/productos/aceite.svg', 'img/productos/aceite-2.svg'],
            desc: 'Aceite semisintético para motores 4T.',
            fits: STREET.concat(['honda-xr150l', 'yamaha-xtz250', 'suzuki-dr650'], SCOOTER)
        },
        {
            id: 'lubricante-cadena', name: 'Lubricante de cadena', cat: 'Repuestos', sub: 'Aceites y lubricantes', brand: 'Motul', price: 11990, stock: 22,
            img: 'img/productos/lubricante-cadena.svg', images: ['img/productos/lubricante-cadena.svg', 'img/productos/lubricante-cadena-2.svg'],
            desc: 'Spray que protege la cadena del desgaste y la corrosión.',
            fits: STREET.concat(OFFROAD)
        },
        {
            id: 'retenes', name: 'Kit de retenes de horquilla', cat: 'Repuestos', sub: 'Suspensión', brand: 'All Balls', price: 21990, stock: 7,
            img: 'img/productos/retenes.svg', images: ['img/productos/retenes.svg', 'img/productos/retenes-2.svg'],
            desc: 'Retenes y guardapolvos para evitar fugas en la suspensión.',
            fits: ['honda-cb190r', 'yamaha-fz25', 'kawasaki-ninja400', 'ktm-duke390'].concat(OFFROAD)
        },
        {
            id: 'correa', name: 'Correa de transmisión', cat: 'Repuestos', sub: 'Transmisión', brand: 'Bando', price: 32990, stock: 5,
            img: 'img/productos/correa.svg', images: ['img/productos/correa.svg', 'img/productos/correa-2.svg'],
            desc: 'Correa reforzada para transmisión automática de scooter.',
            fits: SCOOTER
        },
        {
            id: 'casco', name: 'Casco integral', cat: 'Equipamiento', sub: 'Cascos', brand: 'LS2', price: 129990, compare: 159990, stock: 5, freeShip: true,
            img: 'img/productos/casco.svg', images: ['img/productos/casco.svg', 'img/productos/casco-2.svg'],
            desc: 'Certificación DOT/ECE, visor antiempañante.',
            options: { name: 'Talla', values: ['S', 'M', 'L', 'XL'] }, optionStock: { S: 1, M: 2, L: 2, XL: 0 }
        },
        {
            id: 'chaqueta', name: 'Chaqueta con protecciones', cat: 'Equipamiento', sub: 'Chaquetas', brand: 'Alpinestars', price: 149990, stock: 4, badge: 'Nuevo', freeShip: true,
            img: 'img/productos/chaqueta.svg', images: ['img/productos/chaqueta.svg', 'img/productos/chaqueta-2.svg'],
            desc: 'Textil ventilada con protecciones en codos y hombros.',
            options: { name: 'Talla', values: ['S', 'M', 'L', 'XL'] }
        },
        {
            id: 'guantes', name: 'Guantes racing', cat: 'Equipamiento', sub: 'Guantes', brand: 'Alpinestars', price: 29990, stock: 12,
            img: 'img/productos/guantes.svg', images: ['img/productos/guantes.svg', 'img/productos/guantes-2.svg'],
            desc: 'Cuero con refuerzos en nudillos y palma.',
            options: { name: 'Talla', values: ['S', 'M', 'L', 'XL'] }
        },
        {
            id: 'candado', name: 'Candado de disco', cat: 'Accesorios', sub: 'Seguridad', brand: 'Kovix', price: 24990, stock: 2,
            img: 'img/productos/candado.svg', images: ['img/productos/candado.svg', 'img/productos/candado-2.svg'],
            desc: 'Acero reforzado con alarma de 110 dB.'
        },
        {
            id: 'escape', name: 'Escape deportivo', cat: 'Accesorios', sub: 'Escapes', brand: 'Akrapovič', price: 189990, stock: 0,
            img: 'img/productos/escape.svg', images: ['img/productos/escape.svg', 'img/productos/escape-2.svg'],
            desc: 'Silenciador de acero inoxidable, sonido racing.',
            fits: ['kawasaki-ninja400', 'ktm-duke390', 'yamaha-fz25']
        },
        {
            id: 'soporte-celular', name: 'Soporte de celular', cat: 'Accesorios', sub: 'Electrónica', brand: 'Quad Lock', price: 14990, compare: 18990, stock: 20,
            img: 'img/productos/soporte-celular.svg', images: ['img/productos/soporte-celular.svg', 'img/productos/soporte-celular-2.svg'],
            desc: 'Montaje a manubrio con amortiguación de vibraciones.'
        }
    ];

    var byId = {};
    var vehicleById = {};

    function indexCatalog() {
        byId = {};
        products.forEach(function (p, i) {
            p.order = i;
            byId[p.id] = p;
        });
        vehicleById = {};
        vehicles.forEach(function (v) { vehicleById[v.id] = v; });
    }
    indexCatalog();

    var PAGE_SIZE = 9;
    var MOTO_KEY = 'catrian-moto';

    var state = { cat: 'all', sub: '', brand: '', vehicle: '', query: '', sort: 'featured', onlySale: false, onlyStock: false, coupon: null, couponInfo: null, limit: PAGE_SIZE, collection: null, facets: {} };
    var cart = loadCart();
    var favs = loadList(FAVS_KEY);
    var recent = loadList(RECENT_KEY);
    var lastFocus = null;

    function $(id) {
        return document.getElementById(id);
    }

    function money(n) {
        return '$' + Math.round(n).toLocaleString('es-CL');
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function normalize(str) {
        return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function loadCart() {
        try {
            var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(saved) ? saved.filter(function (line) { return byId[line.id]; }) : [];
        } catch (e) {
            return [];
        }
    }

    function loadList(key) {
        try {
            var saved = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(saved) ? saved.filter(function (id) { return byId[id]; }) : [];
        } catch (e) {
            return [];
        }
    }

    function saveList(key, list) {
        try {
            localStorage.setItem(key, JSON.stringify(list));
        } catch (e) { /* sin almacenamiento */ }
    }

    function saveCart() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        } catch (e) { /* sin almacenamiento: el carro vive solo en esta visita */ }
    }

    function cartCount() {
        return cart.reduce(function (sum, line) { return sum + line.qty; }, 0);
    }

    function cartSubtotal() {
        return cart.reduce(function (sum, line) { return sum + byId[line.id].price * line.qty; }, 0);
    }

    function waUrl(text) {
        return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text);
    }

    function quoteUrl(p) {
        return waUrl('Hola Catrian Racing! Quiero cotizar la ' + p.name + ' (' + money(p.price) + ').');
    }

    function notifyUrl(p) {
        return waUrl('Hola Catrian Racing! Avísenme cuando vuelva a haber stock de: ' + p.name + '.');
    }

    // Stock de una opción (talla, medida...) si se controla por opción; si no, el del producto.
    function variantStock(p, option) {
        if (p.optionStock && option && p.optionStock[option] !== undefined) return p.optionStock[option];
        return p.stock;
    }

    function maxQty(p, option) {
        var s = variantStock(p, option);
        return s === undefined || s === null ? 99 : s;
    }

    function soldOut(p) {
        return !p.quote && p.stock === 0;
    }

    function externalLink(className, text, href) {
        var a = el('a', className, text);
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener';
        return a;
    }

    function isFav(id) {
        return favs.indexOf(id) !== -1;
    }

    function toggleFav(id) {
        if (isFav(id)) favs.splice(favs.indexOf(id), 1);
        else favs.push(id);
        saveList(FAVS_KEY, favs);
        renderFavCount();
        if (state.cat === 'fav') renderProducts();
        document.querySelectorAll('.fav-btn[data-id="' + id + '"]').forEach(syncFavButton);
        toast(isFav(id) ? byId[id].name + ' guardado en favoritos' : 'Quitado de favoritos');
    }

    function favButton(p) {
        var b = el('button', 'fav-btn');
        b.type = 'button';
        b.dataset.id = p.id;
        b.innerHTML = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-9.2-8.6C1.2 8.2 3 4.5 6.6 4.5c2.1 0 3.4 1.2 4.4 2.6h2c1-1.4 2.3-2.6 4.4-2.6 3.6 0 5.4 3.7 3.8 6.9C19 15.6 12 20 12 20z"/></svg>';
        b.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleFav(p.id);
        });
        syncFavButton(b);
        return b;
    }

    function syncFavButton(b) {
        var on = isFav(b.dataset.id);
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.setAttribute('aria-label', (on ? 'Quitar de favoritos: ' : 'Guardar en favoritos: ') + byId[b.dataset.id].name);
    }

    function renderFavCount() {
        var badge = $('fav-count');
        badge.textContent = favs.length;
        badge.classList.toggle('show', favs.length > 0);
    }

    function discount(p) {
        return p.compare ? Math.round((1 - p.price / p.compare) * 100) : 0;
    }

    function priceRow(p) {
        var row = el('div', 'price-row');
        row.appendChild(el('span', 'price', money(p.price)));
        if (p.compare) row.appendChild(el('s', 'price-compare', money(p.compare)));
        return row;
    }

    function productImages(p) {
        if (p.images && p.images.length) return p.images;
        return p.img ? [p.img] : [];
    }

    // Fotos tipo estudio (producto sobre fondo blanco); las motos usan foto completa.
    function isStudio(p) {
        return p.cat !== 'Motos';
    }

    function productImage(p, parent, index, className) {
        var src = productImages(p)[index || 0];
        if (!src) return null;
        var img = document.createElement('img');
        img.src = src;
        img.alt = index ? p.name + ' (foto ' + (index + 1) + ')' : p.name;
        img.loading = 'lazy';
        if (className) img.className = className;
        img.onerror = function () { img.remove(); };
        parent.appendChild(img);
        return img;
    }

    function skuOf(p) {
        return p.sku || ('CR-' + p.id.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase());
    }

    /* ===== CATÁLOGO ===== */
    function visibleProducts() {
        var q = normalize(state.query.trim());
        var list = products.filter(function (p) {
            if (state.cat === 'fav' && !isFav(p.id)) return false;
            if (state.cat !== 'all' && state.cat !== 'fav' && p.cat !== state.cat) return false;
            if (state.onlySale && !p.compare) return false;
            if (state.onlyStock && soldOut(p)) return false;
            if (state.sub && p.sub !== state.sub) return false;
            if (!matchesFacets(p)) return false;
            if (state.brand && p.brand !== state.brand) return false;
            if (state.vehicle && (p.quote || (p.fits && p.fits.indexOf(state.vehicle) === -1))) return false;
            return !q || normalize(p.name + ' ' + p.desc + ' ' + p.cat + ' ' + (p.sub || '') + ' ' + (p.brand || '')).indexOf(q) !== -1;
        });
        var sorters = {
            featured: function (a, b) { return a.order - b.order; },
            'price-asc': function (a, b) { return a.price - b.price; },
            'price-desc': function (a, b) { return b.price - a.price; },
            name: function (a, b) { return a.name.localeCompare(b.name, 'es'); }
        };
        return list.sort(sorters[state.sort]);
    }

    function productCard(p) {
        var card = el('article', 'card product' + (soldOut(p) ? ' sold-out' : '') + (inTransition ? ' no-in' : ''));
        card.style.viewTransitionName = 'p-' + p.id.replace(/[^a-zA-Z0-9_-]/g, '-');

        var media = el('button', 'card-media product-media' + (isStudio(p) ? ' studio' : ''));
        media.type = 'button';
        media.setAttribute('aria-label', 'Ver ' + p.name);
        media.addEventListener('click', function () { openModal(p.id); });
        productImage(p, media);
        if (productImages(p).length > 1) productImage(p, media, 1, 'alt-img');
        if (soldOut(p)) media.appendChild(el('span', 'card-media-tag tag-out', 'Agotado'));
        else if (p.compare) media.appendChild(el('span', 'card-media-tag tag-sale', '-' + discount(p) + '%'));
        else if (p.badge) media.appendChild(el('span', 'card-media-tag', p.badge));
        else if (p.quote) media.appendChild(el('span', 'card-media-tag', 'Disponible'));
        if (p.cc) media.appendChild(el('span', 'card-media-number', String(p.cc)));
        media.appendChild(el('span', 'quick-view', 'Vista rápida'));
        card.appendChild(media);
        card.appendChild(favButton(p));

        var body = el('div', 'card-body');
        var catLink = el('a', 'product-cat', [p.sub || p.cat, p.brand].filter(Boolean).join(' · '));
        catLink.href = collectionHash(p.cat, p.sub);
        body.appendChild(catLink);
        body.appendChild(el('h3', '', p.name));
        var rv = reviewsOf(p.id);
        if (rv.length) body.appendChild(ratingRow(rv, 'card-rating'));
        body.appendChild(el('p', 'card-desc', p.desc));
        if (state.vehicle && p.fits) body.appendChild(el('p', 'fit-ok', '✓ Compatible con tu ' + vehicleName(state.vehicle)));
        if (p.freeShip && !soldOut(p)) body.appendChild(el('p', 'free-ship', 'Despacho gratis a todo Chile'));
        if (p.stock > 0 && p.stock <= 3) body.appendChild(el('p', 'low-stock', '¡Últimas ' + p.stock + ' unidades!'));

        var footer = el('div', 'card-footer');
        footer.appendChild(priceRow(p));
        var action;
        if (p.quote) {
            action = externalLink('btn btn-sm btn-ghost', 'Cotizar', quoteUrl(p));
        } else if (soldOut(p)) {
            action = externalLink('btn btn-sm btn-ghost', 'Avísame', notifyUrl(p));
        } else {
            action = el('button', 'btn btn-sm btn-primary', p.options ? 'Elegir' : 'Agregar');
            action.type = 'button';
            action.addEventListener('click', function () {
                if (p.options) openModal(p.id);
                else addToCart(p.id, '', 1);
            });
        }
        footer.appendChild(action);
        body.appendChild(footer);
        card.appendChild(body);
        return card;
    }

    function renderProducts() {
        var grid = $('product-grid');
        var list = visibleProducts();
        grid.textContent = '';
        list.slice(0, state.limit).forEach(function (p) { grid.appendChild(productCard(p)); });
        var shown = Math.min(state.limit, list.length);
        $('shop-count').textContent = list.length > shown
            ? 'Mostrando ' + shown + ' de ' + list.length + ' productos'
            : list.length + (list.length === 1 ? ' producto' : ' productos');
        $('shop-more').hidden = list.length <= shown;
        renderSubChips();
        var empty = $('shop-empty');
        empty.hidden = list.length > 0;
        empty.textContent = state.cat === 'fav' && !favs.length
            ? 'Aún no guardas favoritos. Toca el corazón de un producto para guardarlo.'
            : 'No encontramos productos con esos filtros.';
    }

    // Transición de vista al filtrar: las tarjetas se deslizan a su nueva posición.
    var inTransition = false;
    function withTransition(update) {
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!document.startViewTransition || reduce) {
            update();
            return;
        }
        document.startViewTransition(function () {
            inTransition = true;
            try { update(); } finally { inTransition = false; }
        });
    }

    function resetPage() {
        state.limit = PAGE_SIZE;
    }

    function subsOf(cat) {
        var subs = [];
        products.forEach(function (p) {
            if (p.cat === cat && p.sub && subs.indexOf(p.sub) === -1) subs.push(p.sub);
        });
        return subs;
    }

    function renderSubChips() {
        var wrap = $('shop-subs');
        var cat = state.cat;
        var subs = CATEGORY_LIST.indexOf(cat) !== -1 ? subsOf(cat) : [];
        wrap.textContent = '';
        wrap.hidden = !subs.length;
        [''].concat(subs).forEach(function (sub) {
            var c = el('a', 'chip chip-sub' + (sub === state.sub && state.collection ? ' active' : ''), sub || 'Todo ' + cat.toLowerCase());
            c.href = collectionHash(cat, sub);
            if (sub === state.sub && state.collection) c.setAttribute('aria-current', 'page');
            wrap.appendChild(c);
        });
    }

    function fillBrandSelect() {
        var select = $('shop-brand');
        while (select.options.length > 1) select.remove(1);
        var brands = [];
        products.forEach(function (p) {
            if (p.brand && brands.indexOf(p.brand) === -1) brands.push(p.brand);
        });
        brands.sort(function (a, b) { return a.localeCompare(b, 'es'); }).forEach(function (b) {
            var o = el('option', '', b);
            o.value = b;
            select.appendChild(o);
        });
    }

    /* ===== BUSCADOR POR MOTO ===== */
    function vehicleName(id) {
        var v = vehicleById[id];
        return v ? v.brand + ' ' + v.model : '';
    }

    function fillSelect(select, placeholder, values) {
        select.textContent = '';
        var first = el('option', '', placeholder);
        first.value = '';
        select.appendChild(first);
        values.forEach(function (v) {
            var o = el('option', '', v[1]);
            o.value = v[0];
            select.appendChild(o);
        });
        select.disabled = values.length === 0;
    }

    function uniq(list) {
        return list.filter(function (v, i) { return list.indexOf(v) === i; });
    }

    function updateFitBrands() {
        var type = $('fit-type').value;
        var brands = uniq(vehicles.filter(function (v) { return v.type === type; }).map(function (v) { return v.brand; }));
        fillSelect($('fit-brand'), 'Marca', type ? brands.map(function (b) { return [b, b]; }) : []);
        updateFitModels();
    }

    function updateFitModels() {
        var type = $('fit-type').value;
        var brand = $('fit-brand').value;
        var models = vehicles.filter(function (v) { return v.type === type && v.brand === brand; });
        fillSelect($('fit-model'), 'Modelo', brand ? models.map(function (v) { return [v.id, v.model]; }) : []);
        $('fit-go').disabled = true;
    }

    function setVehicle(id) {
        state.vehicle = id;
        try {
            if (id) localStorage.setItem(MOTO_KEY, id);
            else localStorage.removeItem(MOTO_KEY);
        } catch (e) { /* sin almacenamiento */ }
        var current = $('fit-current');
        current.hidden = !id;
        $('fit-current-name').textContent = vehicleName(id);
        if (id && state.cat === 'Motos') state.cat = 'all';
        resetPage();
        setCat(state.cat);
        renderKit();
    }

    /* ===== KIT DE MANTENCIÓN PARA LA MOTO ELEGIDA ===== */
    var KIT_SLOTS = [
        { sub: 'Aceites y lubricantes', match: /aceite/i, label: 'Aceite de motor' },
        { sub: 'Filtros', match: /aceite/i, label: 'Filtro de aceite' },
        { sub: 'Filtros', match: /aire/i, label: 'Filtro de aire' },
        { sub: 'Encendido', match: /buj/i, label: 'Bujía' },
        { sub: 'Aceites y lubricantes', match: /cadena/i, label: 'Lubricante de cadena', chain: true }
    ];

    function kitFor(vehicleId) {
        var v = vehicleById[vehicleId];
        if (!v) return [];
        var scooter = /scooter/i.test(v.type || '');
        var used = {};
        var items = [];
        KIT_SLOTS.forEach(function (slot) {
            if (slot.chain && scooter) return;
            // Primero lo específico para la moto; si no hay, lo universal.
            var options = products.filter(function (p) {
                return p.cat === 'Repuestos' && p.sub === slot.sub && slot.match.test(p.name) && !p.quote && !used[p.id] &&
                    maxQty(p, firstOption(p)) > 0 && (!p.fits || p.fits.indexOf(vehicleId) !== -1);
            }).sort(function (a, b) { return (b.fits ? 1 : 0) - (a.fits ? 1 : 0) || a.price - b.price; });
            if (options[0]) {
                used[options[0].id] = true;
                items.push({ label: slot.label, product: options[0], option: firstOption(options[0]) });
            }
        });
        return items;
    }

    function firstOption(p) {
        if (!p.options) return '';
        return p.options.values.filter(function (v) { return maxQty(p, v) > 0; })[0] || p.options.values[0];
    }

    function renderKit() {
        var box = $('kit');
        box.textContent = '';
        var items = state.vehicle ? kitFor(state.vehicle) : [];
        box.hidden = items.length < 2;
        if (box.hidden) return;
        var head = el('div', 'kit-head');
        var titles = el('div');
        titles.appendChild(el('span', 'section-tag', 'Kit de mantención'));
        titles.appendChild(el('h3', '', 'Todo para la mantención de tu ' + vehicleName(state.vehicle)));
        head.appendChild(titles);
        box.appendChild(head);
        var list = el('ul', 'kit-list');
        var checks = [];
        items.forEach(function (it) {
            var li = el('li', 'kit-item');
            var label = el('label', 'kit-check');
            var cb = el('input');
            cb.type = 'checkbox';
            cb.checked = true;
            cb.addEventListener('change', updateTotal);
            checks.push({ input: cb, item: it });
            label.appendChild(cb);
            var thumb = el('span', 'kit-thumb');
            productImage(it.product, thumb);
            label.appendChild(thumb);
            var info = el('span', 'kit-info');
            info.appendChild(el('small', '', it.label));
            info.appendChild(el('strong', '', it.product.name + (it.option ? ' (' + it.option + ')' : '')));
            label.appendChild(info);
            label.appendChild(el('span', 'kit-price', money(it.product.price)));
            li.appendChild(label);
            var see = el('button', 'kit-see', 'Ver');
            see.type = 'button';
            see.setAttribute('aria-label', 'Ver ' + it.product.name);
            see.addEventListener('click', function () { openModal(it.product.id); });
            li.appendChild(see);
            list.appendChild(li);
        });
        box.appendChild(list);
        var foot = el('div', 'kit-foot');
        var total = el('strong', 'kit-total');
        foot.appendChild(total);
        var add = el('button', 'btn btn-primary', 'Agregar kit al carro');
        add.type = 'button';
        add.addEventListener('click', function () {
            var chosen = checks.filter(function (c) { return c.input.checked; });
            if (!chosen.length) return toast('Elige al menos un producto del kit.');
            chosen.forEach(function (c) { addToCart(c.item.product.id, c.item.option, 1); });
            toast(chosen.length + (chosen.length === 1 ? ' producto agregado' : ' productos agregados') + ' al carro');
        });
        foot.appendChild(add);
        box.appendChild(foot);
        function updateTotal() {
            var sum = checks.filter(function (c) { return c.input.checked; }).reduce(function (t, c) { return t + c.item.product.price; }, 0);
            total.textContent = 'Total kit: ' + money(sum);
            add.disabled = !sum;
        }
        updateTotal();
    }

    function setCat(cat) {
        if (cat !== state.cat) {
            state.sub = '';
            resetPage();
        }
        state.cat = cat;
        document.querySelectorAll('#shop-chips .chip').forEach(function (c) {
            var on = c.dataset.cat === cat;
            c.classList.toggle('active', on);
            c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderProducts();
    }

    function goToShop(cat) {
        if (state.collection) {
            history.replaceState(null, '', '#tienda');
            exitCollection();
        }
        setCat(cat);
        $('tienda').scrollIntoView();
    }

    /* ===== PÁGINAS DE CATEGORÍA Y SUBCATEGORÍA ===== */
    var CATEGORY_LIST = ['Motos', 'Repuestos', 'Equipamiento', 'Accesorios'];
    var DESCRIPTIONS = {
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
    var FACET_SKIP = ['Índice de carga y velocidad'];

    function collectionHash(cat, sub) {
        return '#c/' + encodeURIComponent(cat) + (sub ? '/' + encodeURIComponent(sub) : '');
    }

    function parseCollection() {
        var m = /^#c\/([^/]+)(?:\/(.+))?$/.exec(location.hash);
        if (!m) return null;
        try {
            return { cat: decodeURIComponent(m[1]), sub: m[2] ? decodeURIComponent(m[2]) : '' };
        } catch (e) {
            return null;
        }
    }

    function matchesFacets(p) {
        return Object.keys(state.facets).every(function (key) {
            var want = state.facets[key];
            if (!want) return true;
            return (p.specs || []).some(function (s) { return s[0] === key && s[1] === want; });
        });
    }

    function enterCollection(cat, sub) {
        if (CATEGORY_LIST.indexOf(cat) === -1) {
            exitCollection();
            return;
        }
        if (sub && subsOf(cat).indexOf(sub) === -1) sub = '';
        var changed = !state.collection || state.collection.cat !== cat || state.collection.sub !== sub;
        state.collection = { cat: cat, sub: sub };
        state.cat = cat;
        state.sub = sub;
        if (changed) {
            state.facets = {};
            state.brand = '';
            $('shop-brand').value = '';
            resetPage();
        }
        document.body.classList.add('collection-mode');
        $('collection-head').hidden = false;
        renderCollectionHead();
        renderProducts();
        document.title = (sub || cat) + ' | Catrian Racing';
        if (changed) window.scrollTo(0, 0);
    }

    function exitCollection() {
        if (!state.collection) return;
        state.collection = null;
        state.facets = {};
        state.sub = '';
        document.body.classList.remove('collection-mode');
        $('collection-head').hidden = true;
        $('facets').hidden = true;
        document.title = 'Catrian Racing | Motos, Repuestos y Taller';
        setCat('all');
    }

    function renderCollectionHead() {
        var c = state.collection;
        var inView = products.filter(function (p) { return p.cat === c.cat && (!c.sub || p.sub === c.sub); });

        var crumbs = $('col-crumbs');
        crumbs.textContent = '';
        var trail = [['Inicio', '#inicio'], ['Tienda', '#tienda']];
        if (c.sub) trail.push([c.cat, collectionHash(c.cat)]);
        trail.forEach(function (t) {
            var a = el('a', 'crumb', t[0]);
            a.href = t[1];
            crumbs.appendChild(a);
            crumbs.appendChild(el('span', 'crumb-sep', '›'));
        });
        crumbs.appendChild(el('span', 'crumb current', c.sub || c.cat));

        $('col-tag').textContent = c.sub ? c.cat : 'Categoría';
        $('col-title').textContent = c.sub || c.cat;
        $('col-desc').textContent = DESCRIPTIONS[c.sub || c.cat] || 'Encuentra ' + (c.sub || c.cat).toLowerCase() + ' con despacho a todo Chile y retiro gratis en tienda.';
        var available = inView.filter(function (p) { return !soldOut(p); }).length;
        $('col-count').textContent = inView.length + (inView.length === 1 ? ' producto' : ' productos') + ' · ' + available + ' disponibles';

        var art = $('col-art');
        art.textContent = '';
        inView.filter(function (p) { return productImages(p).length; }).slice(0, 3).forEach(function (p, i) {
            var bubble = el('span', 'col-bubble b' + i + (isStudio(p) ? ' studio' : ''));
            productImage(p, bubble);
            art.appendChild(bubble);
        });

        var tiles = $('col-subs');
        tiles.textContent = '';
        var subs = c.sub ? [] : subsOf(c.cat);
        tiles.hidden = !subs.length;
        if (subs.length) {
            tiles.appendChild(el('h2', 'col-subs-title', 'Compra por subcategoría'));
            var grid = el('div', 'col-subs-grid');
            subs.forEach(function (sub) {
                var items = products.filter(function (p) { return p.cat === c.cat && p.sub === sub; });
                var a = el('a', 'col-tile');
                a.href = collectionHash(c.cat, sub);
                var media = el('span', 'col-tile-media' + (isStudio(items[0]) ? ' studio' : ''));
                var withImg = items.filter(function (p) { return productImages(p).length; })[0];
                if (withImg) productImage(withImg, media);
                a.appendChild(media);
                a.appendChild(el('strong', '', sub));
                a.appendChild(el('span', '', items.length + (items.length === 1 ? ' producto' : ' productos')));
                grid.appendChild(a);
            });
            tiles.appendChild(grid);
        }
        renderFacets(inView);
    }

    function renderFacets(inView) {
        var wrap = $('facets');
        wrap.textContent = '';
        var c = state.collection;
        if (!c || !c.sub) {
            wrap.hidden = true;
            return;
        }
        var keys = [];
        var values = {};
        inView.forEach(function (p) {
            (p.specs || []).forEach(function (s) {
                if (FACET_SKIP.indexOf(s[0]) !== -1) return;
                if (!values[s[0]]) {
                    values[s[0]] = [];
                    keys.push(s[0]);
                }
                if (values[s[0]].indexOf(s[1]) === -1) values[s[0]].push(s[1]);
            });
        });
        keys = keys.filter(function (k) { return values[k].length > 1 && values[k].length <= 15; });
        wrap.hidden = !keys.length;
        keys.forEach(function (key) {
            var label = el('label', 'facet');
            label.appendChild(el('span', '', key));
            var sel = el('select', 'shop-select');
            var all = el('option', '', 'Todas');
            all.value = '';
            sel.appendChild(all);
            values[key].sort(function (a, b) { return a.localeCompare(b, 'es', { numeric: true }); }).forEach(function (v) {
                var o = el('option', '', v);
                o.value = v;
                sel.appendChild(o);
            });
            sel.value = state.facets[key] || '';
            sel.addEventListener('change', function () {
                withTransition(function () {
                    state.facets[key] = sel.value;
                    resetPage();
                    renderProducts();
                });
            });
            label.appendChild(sel);
            wrap.appendChild(label);
        });
        if (keys.length) {
            var clear = el('button', 'back-link', 'Limpiar filtros');
            clear.type = 'button';
            clear.addEventListener('click', function () {
                withTransition(function () {
                    state.facets = {};
                    resetPage();
                    renderFacets(inView);
                    renderProducts();
                });
            });
            wrap.appendChild(clear);
        }
    }

    function renderMegaMenu() {
        var mega = $('mega');
        mega.textContent = '';
        CATEGORY_LIST.forEach(function (cat) {
            var items = products.filter(function (p) { return p.cat === cat; });
            if (!items.length) return;
            var col = el('div', 'mega-col');
            var head = el('a', 'mega-cat', cat);
            head.href = collectionHash(cat);
            head.appendChild(el('small', '', String(items.length)));
            col.appendChild(head);
            subsOf(cat).forEach(function (sub) {
                var a = el('a', 'mega-sub', sub);
                a.href = collectionHash(cat, sub);
                a.appendChild(el('small', '', String(items.filter(function (p) { return p.sub === sub; }).length)));
                col.appendChild(a);
            });
            mega.appendChild(col);
        });
    }

    /* ===== SEGUIMIENTO DEL PEDIDO ===== */
    var ORDERS_KEY = 'catrian-orders';
    var paymentResult = '';
    var trackReturn = '';
    var trackTimer = null;
    var STATUS_TEXT = {
        nuevo: 'Recibido', confirmado: 'Confirmado', pagado: 'Pago recibido',
        enviado: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado'
    };

    // Pedidos hechos desde este dispositivo (para seguirlos y avisar cambios de estado).
    function myOrders() {
        try {
            var list = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
            return Array.isArray(list) ? list.filter(function (o) { return o && o.ref && o.phone; }) : [];
        } catch (e) {
            return [];
        }
    }

    function saveMyOrders(list) {
        try { localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(0, 10))); } catch (e) { /* sin almacenamiento */ }
    }

    function rememberOrder(ref, phone, status) {
        var list = myOrders().filter(function (o) { return o.ref !== ref; });
        list.unshift({ ref: ref, phone: phone, status: status });
        saveMyOrders(list);
    }

    function statusText(status, delivery) {
        if (delivery === 'retiro' && status === 'enviado') return 'Listo para retiro';
        if (delivery === 'retiro' && status === 'entregado') return 'Retirado';
        return STATUS_TEXT[status] || status;
    }

    // Al entrar a la tienda: si algún pedido cambió de estado, se avisa en la página.
    function checkMyOrders() {
        var list = myOrders().filter(function (o) { return o.status !== 'entregado' && o.status !== 'cancelado'; }).slice(0, 5);
        list.forEach(function (saved) {
            rpc('track_order', { p_ref: saved.ref, p_phone: saved.phone }).then(function (order) {
                if (!order) return;
                if (order.status !== saved.status) {
                    showOrderNotice(order);
                    rememberOrder(order.ref, saved.phone, order.status);
                }
            }, function () { /* sin conexión: se revisa en la próxima visita */ });
        });
    }

    function showOrderNotice(order) {
        var old = document.querySelector('.order-notice');
        if (old) old.remove();
        var box = el('div', 'order-notice');
        box.setAttribute('role', 'status');
        box.appendChild(el('span', 'order-notice-icon', order.status === 'cancelado' ? '!' : '📦'));
        var text = el('div');
        text.appendChild(el('strong', '', 'Tu pedido ' + order.ref + ': ' + statusText(order.status, order.delivery)));
        text.appendChild(el('span', '', order.status === 'enviado' && order.delivery === 'despacho'
            ? (order.courier ? 'Va en camino con ' + order.courier + '.' : 'Tu pedido va en camino.') + (order.tracking_number ? ' N° de seguimiento: ' + order.tracking_number : '')
            : 'Mira el detalle y la línea de tiempo.'));
        box.appendChild(text);
        var see = el('a', 'btn btn-primary btn-sm', 'Ver estado');
        see.href = '#seguimiento/' + order.ref;
        see.addEventListener('click', function () { box.remove(); });
        box.appendChild(see);
        var close = el('button', 'order-notice-close', '×');
        close.type = 'button';
        close.setAttribute('aria-label', 'Cerrar aviso');
        close.addEventListener('click', function () { box.remove(); });
        box.appendChild(close);
        document.body.appendChild(box);
    }

    function renderMyOrdersChips() {
        var wrap = $('track-mine');
        wrap.textContent = '';
        var list = myOrders();
        wrap.hidden = !list.length;
        if (!list.length) return;
        wrap.appendChild(el('span', '', 'Tus pedidos en este dispositivo:'));
        list.slice(0, 5).forEach(function (o) {
            var b = el('button', 'chip', o.ref);
            b.type = 'button';
            b.addEventListener('click', function () {
                $('track-ref').value = o.ref;
                $('track-phone').value = o.phone;
                searchTracking();
            });
            wrap.appendChild(b);
        });
    }

    function trackingLink(ref) {
        return location.href.split('#')[0] + '#seguimiento/' + ref;
    }

    function openTracking(ref) {
        var modal = $('track-modal');
        if (modal.hidden) {
            if (!/^#seguimiento/.test(location.hash)) trackReturn = location.hash;
            lastFocus = document.activeElement;
            modal.hidden = false;
            document.body.classList.add('locked');
        }
        var mine = myOrders();
        var known = mine.filter(function (o) { return o.ref === ref; })[0] || (!ref && mine[0]) || null;
        $('track-error').textContent = '';
        $('track-result').hidden = true;
        $('track-ref').value = ref || (known && known.ref) || '';
        $('track-phone').value = known ? known.phone : '';
        renderMyOrdersChips();
        if ($('track-ref').value && $('track-phone').value) searchTracking();
        else ($('track-ref').value ? $('track-phone') : $('track-ref')).focus();
    }

    /* ===== AGENDA DEL TALLER ===== */
    var bookReturn = '';
    var bookSlot = '';

    function isoDay(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function openBooking() {
        var modal = $('book-modal');
        if (modal.hidden) {
            bookReturn = /^#agendar/.test(location.hash) ? '' : location.hash;
            lastFocus = document.activeElement;
            modal.hidden = false;
            document.body.classList.add('locked');
        }
        $('book-form').hidden = false;
        $('book-done').hidden = true;
        $('book-error').textContent = '';
        var first = new Date();
        first.setDate(first.getDate() + 1);
        if (first.getDay() === 0) first.setDate(first.getDate() + 1);
        var last = new Date();
        last.setDate(last.getDate() + 45);
        var day = $('book-day');
        day.min = isoDay(first);
        day.max = isoDay(last);
        if (!day.value || day.value < day.min || day.value > day.max) day.value = isoDay(first);
        if (!$('book-vehicle').value && state.vehicle) $('book-vehicle').value = vehicleName(state.vehicle);
        loadSlots();
        $('book-service').focus();
    }

    function closeBooking() {
        var modal = $('book-modal');
        if (modal.hidden) return;
        modal.hidden = true;
        if (!$('cart').classList.contains('open') && $('product-modal').hidden && $('track-modal').hidden) document.body.classList.remove('locked');
        if (/^#agendar/.test(location.hash)) history.replaceState(null, '', bookReturn || location.pathname + location.search);
        bookReturn = '';
        if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    }

    function loadSlots() {
        var wrap = $('book-slots');
        var day = $('book-day').value;
        bookSlot = '';
        wrap.textContent = '';
        if (!day) return;
        if (new Date(day + 'T12:00:00').getDay() === 0) {
            wrap.appendChild(el('p', 'track-muted', 'Los domingos el taller está cerrado. Elige otro día.'));
            return;
        }
        wrap.appendChild(el('p', 'track-muted', 'Buscando horarios...'));
        rpc('workshop_availability', { p_day: day }).then(function (rows) {
            if ($('book-day').value !== day) return;
            wrap.textContent = '';
            if (!rows || !rows.length) {
                wrap.appendChild(el('p', 'track-muted', 'No hay horarios ese día. Prueba con otro.'));
                return;
            }
            rows.forEach(function (r) {
                var b = el('button', 'slot', r.slot);
                b.type = 'button';
                b.setAttribute('role', 'radio');
                b.setAttribute('aria-checked', 'false');
                if (!r.free) {
                    b.disabled = true;
                    b.classList.add('full');
                    b.setAttribute('aria-label', r.slot + ' (sin cupos)');
                }
                b.addEventListener('click', function () {
                    bookSlot = r.slot;
                    wrap.querySelectorAll('.slot').forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
                    $('book-error').textContent = '';
                });
                wrap.appendChild(b);
            });
            if (rows.every(function (r) { return !r.free; })) wrap.appendChild(el('p', 'track-muted', 'Ese día ya está completo. Prueba con otro.'));
        }, function () {
            wrap.textContent = '';
            var p = el('p', 'track-muted', 'No pudimos cargar los horarios. ');
            p.appendChild(externalLink('', 'Agenda por WhatsApp', waUrl('Hola Catrian Racing! Quiero agendar una hora en el taller.')));
            wrap.appendChild(p);
        });
    }

    function submitBooking(e) {
        e.preventDefault();
        var error = $('book-error');
        var data = {
            p_service: $('book-service').value, p_vehicle: $('book-vehicle').value.trim(), p_day: $('book-day').value,
            p_slot: bookSlot, p_name: $('book-name').value.trim(), p_phone: $('book-phone').value.trim(),
            p_email: $('book-email').value.trim(), p_notes: $('book-notes').value.trim()
        };
        if (!data.p_vehicle) { error.textContent = 'Cuéntanos qué moto traes.'; return $('book-vehicle').focus(); }
        if (!data.p_slot) { error.textContent = 'Elige una hora.'; return; }
        if (!data.p_name) { error.textContent = 'Escribe tu nombre.'; return $('book-name').focus(); }
        if (data.p_phone.replace(/\D/g, '').length < 8) { error.textContent = 'Escribe un teléfono válido.'; return $('book-phone').focus(); }
        error.textContent = '';
        var submit = $('book-form').querySelector('button[type="submit"]');
        submit.disabled = true;
        submit.textContent = 'Reservando...';
        rpc('book_workshop', data).then(function (ref) {
            var when = new Date(data.p_day + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
            var done = $('book-done');
            done.textContent = '';
            done.appendChild(el('p', 'done-ref', '¡Hora reservada!'));
            var info = el('p', '');
            info.appendChild(document.createTextNode(data.p_service + ' · ' + when + ' a las ' + data.p_slot + '. Reserva '));
            info.appendChild(el('strong', '', ref));
            done.appendChild(info);
            done.appendChild(el('p', 'track-muted', 'Te escribiremos por WhatsApp para confirmar. Si necesitas cambiarla, avísanos.'));
            done.appendChild(externalLink('btn btn-primary', 'Confirmar por WhatsApp', waUrl('Hola Catrian Racing! Reservé una hora en el taller (' + ref + '): ' +
                data.p_service + ' el ' + when + ' a las ' + data.p_slot + ' para mi ' + data.p_vehicle + '.')));
            $('book-form').hidden = true;
            done.hidden = false;
            $('book-form').reset();
            if (window.gtag) window.gtag('event', 'generate_lead', { method: 'agenda_taller' });
            if (window.fbq) window.fbq('track', 'Schedule');
        }, function (err) {
            error.textContent = err && err.message ? err.message : 'No pudimos reservar ahora. Intenta de nuevo o escríbenos por WhatsApp.';
            if (/llen/.test(error.textContent)) loadSlots();
        }).then(function () {
            submit.disabled = false;
            submit.textContent = 'Reservar hora';
        });
    }

    function closeTracking() {
        var modal = $('track-modal');
        if (modal.hidden) return;
        modal.hidden = true;
        clearInterval(trackTimer);
        if (!$('cart').classList.contains('open') && $('product-modal').hidden) document.body.classList.remove('locked');
        if (/^#seguimiento/.test(location.hash)) {
            history.replaceState(null, '', trackReturn || location.pathname + location.search);
        }
        trackReturn = '';
        if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    }

    function fmtDate(iso) {
        var d = new Date(iso);
        return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) + ', ' +
            d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    }

    function searchTracking(e, silent) {
        if (e) e.preventDefault();
        var ref = $('track-ref').value.trim().toUpperCase();
        var phone = $('track-phone').value.replace(/\D/g, '');
        var error = $('track-error');
        var result = $('track-result');
        if (!/^CR-[A-Z0-9]{4,10}$/.test(ref)) {
            error.textContent = 'Escribe tu número de pedido, por ejemplo CR-1A2B3C.';
            return;
        }
        if (phone.length < 4) {
            error.textContent = 'Escribe los últimos 4 dígitos de tu teléfono.';
            return;
        }
        error.textContent = '';
        if (!silent) {
            result.hidden = false;
            result.textContent = '';
            result.appendChild(el('p', 'track-loading', 'Buscando tu pedido...'));
        }
        rpc('track_order', { p_ref: ref, p_phone: phone }).then(function (order) {
            if ($('track-modal').hidden) return;
            if (!order) {
                result.hidden = true;
                error.textContent = 'No encontramos un pedido con esos datos. Revisa el número y los dígitos del teléfono.';
                return;
            }
            history.replaceState(null, '', '#seguimiento/' + order.ref);
            rememberOrder(order.ref, phone.slice(-4), order.status);
            renderMyOrdersChips();
            renderTracking(order);
            // Se actualiza sola mientras esté abierta.
            clearInterval(trackTimer);
            trackTimer = setInterval(function () {
                if ($('track-modal').hidden || document.hidden || $('track-result').querySelector('.review-form')) return;
                searchTracking(null, true);
            }, 45000);
        }, function (err) {
            if (silent) return;
            result.hidden = true;
            error.textContent = err && err.status === 400 && err.message ? err.message : 'No pudimos consultar el pedido ahora. Intenta en unos minutos o escríbenos por WhatsApp.';
        });
    }

    function renderTracking(o) {
        var result = $('track-result');
        result.textContent = '';
        var pickup = o.delivery === 'retiro';

        if (paymentResult) {
            var msg = {
                approved: ['ok', '¡Pago aprobado! Tu pedido quedó pagado y lo estamos preparando.'],
                in_process: ['wait', 'Tu pago está en revisión. Te avisaremos cuando se confirme.'],
                pending: ['wait', 'Tu pago está pendiente. Cuando se confirme, el pedido pasará a «Pagado».'],
                rejected: ['bad', 'El pago fue rechazado. Puedes intentarlo de nuevo con otra tarjeta.']
            }[paymentResult];
            if (msg) result.appendChild(el('p', 'pay-result ' + msg[0], msg[1]));
            paymentResult = '';
        }

        var head = el('div', 'track-head');
        var title = el('div');
        title.appendChild(el('strong', '', 'Pedido ' + o.ref));
        title.appendChild(el('span', '', 'Realizado el ' + fmtDate(o.created_at)));
        head.appendChild(title);
        var labels = {
            nuevo: 'Recibido', confirmado: 'Confirmado', pagado: 'Pagado',
            enviado: pickup ? 'Listo para retiro' : 'En camino',
            entregado: pickup ? 'Retirado' : 'Entregado', cancelado: 'Cancelado'
        };
        head.appendChild(el('span', 'track-status st-' + o.status, labels[o.status] || o.status));
        result.appendChild(head);

        if (o.status === 'cancelado') {
            result.appendChild(el('p', 'track-cancel', 'Este pedido fue cancelado' + (o.cancelled_at ? ' el ' + fmtDate(o.cancelled_at) : '') + '. Si tienes dudas, escríbenos por WhatsApp.'));
        } else {
            var steps = [
                ['Pedido recibido', o.created_at, 'Recibimos tu pedido y lo estamos revisando.'],
                ['Confirmado', o.confirmed_at, 'Confirmamos stock y te enviamos los datos de pago.'],
                ['Pago recibido', o.paid_at, 'Tu pago fue confirmado.'],
                [pickup ? 'Listo para retiro' : 'Despachado', o.shipped_at, pickup ? 'Ya puedes retirarlo en tienda.' : 'Tu pedido va en camino.'],
                [pickup ? 'Retirado' : 'Entregado', o.delivered_at, pickup ? '¡Gracias por tu compra!' : 'Tu pedido fue entregado.']
            ];
            var current = -1;
            steps.forEach(function (st, i) { if (st[1]) current = i; });
            var ol = el('ol', 'track-steps');
            steps.forEach(function (st, i) {
                var li = el('li', i < current ? 'done' : (i === current ? 'done current' : ''));
                li.appendChild(el('span', 'track-dot', i <= current ? '✓' : String(i + 1)));
                var txt = el('div');
                txt.appendChild(el('strong', '', st[0]));
                txt.appendChild(el('span', '', st[1] ? fmtDate(st[1]) : st[2]));
                li.appendChild(txt);
                ol.appendChild(li);
            });
            result.appendChild(ol);
        }

        if (!pickup) {
            var ship = el('div', 'track-ship');
            ship.appendChild(el('h3', '', 'Envío'));
            if (o.tracking_number || o.courier) {
                if (o.courier) ship.appendChild(el('p', '', 'Empresa de transporte: ' + o.courier));
                if (o.tracking_number) {
                    var row = el('p', 'track-number');
                    row.appendChild(document.createTextNode('N° de seguimiento: '));
                    row.appendChild(el('strong', '', o.tracking_number));
                    var copy = el('button', 'share-btn', 'Copiar');
                    copy.type = 'button';
                    copy.addEventListener('click', function () {
                        if (navigator.clipboard) navigator.clipboard.writeText(o.tracking_number).then(function () { toast('Número copiado'); });
                    });
                    row.appendChild(copy);
                    ship.appendChild(row);
                }
                if (o.tracking_url && /^https:\/\//.test(o.tracking_url)) {
                    var homepage = /^https:\/\/[^/]+\/?$/.test(o.tracking_url);
                    ship.appendChild(externalLink('btn btn-primary btn-sm',
                        homepage ? 'Ir al sitio de ' + (o.courier || 'la empresa') : 'Ver seguimiento' + (o.courier ? ' en ' + o.courier : ''), o.tracking_url));
                    if (homepage) ship.appendChild(el('p', 'track-muted', 'En el sitio de ' + (o.courier || 'la empresa') + ', pega tu número de seguimiento en la sección de seguimiento.'));
                }
            } else {
                ship.appendChild(el('p', '', 'Cuando despachemos tu pedido verás aquí la empresa de transporte y el número de seguimiento.'));
            }
            ship.appendChild(el('p', 'track-muted', 'Despacho a ' + [o.commune, o.region].filter(Boolean).join(', ') + (o.shipping_pending ? ' · costo de envío por cotizar' : '')));
            result.appendChild(ship);
        } else {
            result.appendChild(el('p', 'track-muted', 'Retiro en tienda · Lunes a viernes de 9:00 a 19:00 y sábados de 10:00 a 14:00.'));
        }

        var items = el('ul', 'track-items');
        (o.items || []).forEach(function (it) {
            items.appendChild(el('li', '', it.qty + ' × ' + it.name + (it.option ? ' (' + it.option + ')' : '')));
        });
        result.appendChild(items);
        var total = el('p', 'track-total');
        total.appendChild(document.createTextNode('Total: '));
        total.appendChild(el('strong', '', money(o.total) + (o.shipping_pending ? ' + envío' : '')));
        if (o.delivery === 'despacho' && !o.shipping_pending) total.appendChild(el('span', '', ' · envío ' + (o.shipping ? money(o.shipping) : 'gratis')));
        total.appendChild(el('span', '', ' · ' + o.payment));
        result.appendChild(total);

        if (o.doc_url && /^https:\/\//.test(o.doc_url)) {
            result.appendChild(externalLink('btn btn-ghost btn-sm track-doc',
                'Descargar ' + (o.doc_type === 'factura' ? 'factura' : 'boleta') + (o.doc_number ? ' N° ' + o.doc_number : ''), o.doc_url));
        }

        var updated = el('p', 'track-updated', 'Actualizado a las ' + new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + ' · se actualiza solo mientras esta ventana esté abierta');
        result.appendChild(updated);

        var phoneDigits = $('track-phone').value.replace(/\D/g, '').slice(-4);
        if ((o.status === 'enviado' || o.status === 'entregado') && phoneDigits.length === 4) renderReviewBox(o, phoneDigits, result, updated);

        var savedOrder = myOrders().filter(function (m) { return m.ref === o.ref; })[0];
        var phoneForPay = (savedOrder && savedOrder.phone) || $('track-phone').value.replace(/\D/g, '').slice(-4);
        if (MP_ENABLED && /tarjeta/i.test(o.payment || '') && (o.status === 'nuevo' || o.status === 'confirmado') && !o.shipping_pending && phoneForPay) {
            var payBtn = el('button', 'btn btn-primary btn-block pay-now', 'Pagar ahora con tarjeta');
            payBtn.type = 'button';
            payBtn.addEventListener('click', function () { startOnlinePayment(o.ref, phoneForPay, payBtn); });
            result.insertBefore(payBtn, result.querySelector('.track-steps') || null);
        }

        result.appendChild(externalLink('btn btn-ghost btn-sm track-help', '¿Dudas? Escríbenos por WhatsApp',
            waUrl('Hola Catrian Racing! Tengo una consulta sobre mi pedido ' + o.ref + '.')));
    }

    function route() {
        if (/^#agendar$/.test(location.hash)) {
            if (!$('product-modal').hidden) closeModal(true);
            openBooking();
            return;
        }
        if (!$('book-modal').hidden) closeBooking();
        var pm = /^#pago\/(.+)$/.exec(location.hash);
        if (pm) {
            var payRef = decodeURIComponent(pm[1]).toUpperCase();
            var known = myOrders().filter(function (o) { return o.ref === payRef; })[0];
            history.replaceState(null, '', '#seguimiento/' + payRef);
            openTracking(payRef);
            if (known) {
                rpc('mp_check_payment', { p_ref: payRef, p_phone: known.phone }).then(function (status) {
                    paymentResult = status;
                    searchTracking(null, true);
                }, function () { /* se verá en la próxima actualización */ });
            }
            return;
        }
        var tm = /^#seguimiento(?:\/(.+))?$/.exec(location.hash);
        if (tm) {
            if (!$('product-modal').hidden) closeModal(true);
            if ($('cart').classList.contains('open')) closeCart();
            openTracking(tm[1] ? decodeURIComponent(tm[1]).toUpperCase() : '');
            return;
        }
        if (!$('track-modal').hidden) closeTracking();
        var c = parseCollection();
        if (c) {
            if (!$('product-modal').hidden) closeModal(true);
            enterCollection(c.cat, c.sub);
            return;
        }
        if (/^#p\//.test(location.hash)) {
            openFromHash();
            return;
        }
        if (state.collection) {
            exitCollection();
            var target = location.hash && document.getElementById(location.hash.slice(1));
            if (target) target.scrollIntoView();
        }
    }

    function miniCard(p) {
        var b = el('button', 'mini-card');
        b.type = 'button';
        var thumb = el('span', 'mini-thumb');
        productImage(p, thumb);
        b.appendChild(thumb);
        var info = el('span', 'mini-info');
        info.appendChild(el('strong', '', p.name));
        info.appendChild(el('span', '', money(p.price)));
        b.appendChild(info);
        b.addEventListener('click', function () { openModal(p.id); });
        return b;
    }

    function trackRecent(id) {
        recent = [id].concat(recent.filter(function (r) { return r !== id; })).slice(0, 6);
        saveList(RECENT_KEY, recent);
        renderRecent();
    }

    function renderRecent() {
        var wrap = $('recent');
        var list = $('recent-list');
        list.textContent = '';
        recent.forEach(function (id) { list.appendChild(miniCard(byId[id])); });
        wrap.hidden = recent.length === 0;
    }

    /* ===== VISTA RÁPIDA ===== */
    /* ===== FICHA DE PRODUCTO ===== */
    var gallery = { index: 0, count: 0 };

    function svgIcon(path) {
        var ns = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '1.8');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        var pathEl = document.createElementNS(ns, 'path');
        pathEl.setAttribute('d', path);
        svg.appendChild(pathEl);
        return svg;
    }

    var ICONS = {
        truck: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19.5a1.8 1.8 0 1 0 0-.1M17 19.5a1.8 1.8 0 1 0 0-.1',
        store: 'M3 10l9-6 9 6v10H3zM9 20v-6h6v6',
        shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-5',
        gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3-5-.5S12 7 12 7zM12 7c1.5-3 5-3 5-.5S12 7 12 7z',
        chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.4-4.1-1.1L3 20l1.1-5.4A8.5 8.5 0 1 1 21 11.5z'
    };

    function renderGallery(p) {
        var stage = $('pm-stage');
        var thumbs = $('pm-thumbs');
        var images = productImages(p);
        stage.textContent = '';
        thumbs.textContent = '';
        stage.classList.toggle('studio', isStudio(p));
        gallery.index = 0;
        gallery.count = images.length;

        images.forEach(function (src, i) {
            var slide = el('div', 'pdp-slide');
            var img = productImage(p, slide, i);
            if (img) img.loading = i === 0 ? 'eager' : 'lazy';
            attachZoom(slide);
            stage.appendChild(slide);

            var t = el('button', 'pdp-thumb' + (isStudio(p) ? ' studio' : '') + (i === 0 ? ' active' : ''));
            t.type = 'button';
            t.setAttribute('aria-label', 'Ver foto ' + (i + 1));
            productImage(p, t, i);
            t.addEventListener('click', function () { goToSlide(i); });
            thumbs.appendChild(t);
        });
        if (!images.length) stage.appendChild(el('div', 'pdp-slide pdp-noimg', 'Sin foto'));

        var multi = images.length > 1;
        thumbs.hidden = !multi;
        $('pm-prev').hidden = $('pm-next').hidden = !multi;
        $('pm-counter').hidden = !multi;
        $('pm-hint').hidden = !window.matchMedia('(hover: hover)').matches || !images.length;
        updateGalleryUI();
        stage.scrollLeft = 0;

        var badges = $('pm-badges');
        badges.textContent = '';
        if (soldOut(p)) badges.appendChild(el('span', 'card-media-tag tag-out', 'Agotado'));
        else if (p.compare) badges.appendChild(el('span', 'card-media-tag tag-sale', '-' + discount(p) + '%'));
        if (p.badge) badges.appendChild(el('span', 'card-media-tag', p.badge));
        if (p.freeShip && !soldOut(p)) badges.appendChild(el('span', 'card-media-tag tag-ship', 'Despacho gratis'));
    }

    function attachZoom(slide) {
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        slide.addEventListener('pointermove', function (e) {
            var img = slide.querySelector('img');
            if (!img) return;
            var r = slide.getBoundingClientRect();
            img.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%';
            slide.classList.add('zoomed');
        });
        slide.addEventListener('pointerleave', function () { slide.classList.remove('zoomed'); });
    }

    function goToSlide(i) {
        var stage = $('pm-stage');
        if (!gallery.count) return;
        gallery.index = (i + gallery.count) % gallery.count;
        stage.scrollTo({ left: stage.clientWidth * gallery.index, behavior: 'smooth' });
        updateGalleryUI();
    }

    function updateGalleryUI() {
        $('pm-counter').textContent = (gallery.index + 1) + ' / ' + gallery.count;
        $('pm-thumbs').querySelectorAll('.pdp-thumb').forEach(function (t, i) {
            t.classList.toggle('active', i === gallery.index);
            t.setAttribute('aria-current', i === gallery.index ? 'true' : 'false');
        });
    }

    function stockInfo(p) {
        if (p.quote) return ['info', 'Disponible para cotizar · Financiamiento y entrega a coordinar'];
        if (soldOut(p)) return ['out', 'Sin stock para venta web por ahora'];
        if (p.stock === undefined) return ['ok', 'En stock para envío o retiro en tienda'];
        if (p.stock <= 3) return ['low', '¡Últimas ' + p.stock + ' unidades! En stock para envío o retiro'];
        return ['ok', 'En stock para envío o retiro (' + p.stock + ' disponibles)'];
    }

    function renderFitChecker(p) {
        var fit = $('pm-fit');
        fit.textContent = '';
        if (p.quote) return;
        var box = el('div', 'pdp-fit');
        if (!p.fits) {
            box.classList.add('ok');
            box.appendChild(el('strong', '', '✓ Universal'));
            box.appendChild(el('span', '', 'Sirve para cualquier moto.'));
            fit.appendChild(box);
            return;
        }
        box.appendChild(el('strong', '', '¿Le sirve a tu moto?'));
        var sel = el('select', 'pdp-fit-select');
        sel.setAttribute('aria-label', 'Elige tu moto para comprobar la compatibilidad');
        var first = el('option', '', 'Elige tu moto...');
        first.value = '';
        sel.appendChild(first);
        uniq(vehicles.map(function (v) { return v.type; })).forEach(function (type) {
            var group = el('optgroup');
            group.label = type;
            vehicles.filter(function (v) { return v.type === type; }).forEach(function (v) {
                var o = el('option', '', v.brand + ' ' + v.model);
                o.value = v.id;
                group.appendChild(o);
            });
            sel.appendChild(group);
        });
        var result = el('p', 'pdp-fit-result');
        result.setAttribute('aria-live', 'polite');
        function check() {
            box.classList.remove('ok', 'no');
            if (!sel.value) {
                result.textContent = 'Compatible con ' + p.fits.length + (p.fits.length === 1 ? ' modelo.' : ' modelos.');
                return;
            }
            var ok = p.fits.indexOf(sel.value) !== -1;
            box.classList.add(ok ? 'ok' : 'no');
            result.textContent = ok
                ? '✓ Sí, es compatible con tu ' + vehicleName(sel.value) + '.'
                : '✕ No figura como compatible con tu ' + vehicleName(sel.value) + '. Pregúntanos por WhatsApp.';
        }
        sel.addEventListener('change', check);
        if (state.vehicle && vehicleById[state.vehicle]) sel.value = state.vehicle;
        check();
        box.appendChild(sel);
        box.appendChild(result);
        fit.appendChild(box);
    }

    function renderTabs(p) {
        var list = $('pm-tablist');
        var panel = $('pm-panel');
        list.textContent = '';
        var tabs = [['desc', 'Descripción'], ['specs', 'Especificaciones']];
        if (!p.quote) tabs.push(['fit', 'Compatibilidad']);
        tabs.push(['ship', 'Envío y retiro']);
        if (!p.quote) tabs.push(['reviews', 'Opiniones (' + reviewsOf(p.id).length + ')']);

        function show(key) {
            list.querySelectorAll('[role="tab"]').forEach(function (t) {
                var on = t.dataset.key === key;
                t.setAttribute('aria-selected', on ? 'true' : 'false');
                t.tabIndex = on ? 0 : -1;
            });
            panel.textContent = '';
            panel.setAttribute('aria-labelledby', 'pm-tab-' + key);
            if (key === 'desc') {
                panel.appendChild(el('p', '', p.desc || 'Sin descripción.'));
                if (p.options) panel.appendChild(el('p', 'pdp-note', 'Disponible en ' + p.options.name.toLowerCase() + ': ' + p.options.values.join(', ') + '.'));
            } else if (key === 'specs') {
                var table = el('table', 'pdp-specs');
                var rows = [['Código', skuOf(p)], ['Marca', p.brand || '—'], ['Categoría', [p.cat, p.sub].filter(Boolean).join(' · ')]]
                    .concat(p.specs || []);
                if (p.options) rows.push([p.options.name, p.options.values.join(', ')]);
                rows.push(['Garantía', p.warranty || 'Garantía legal de 6 meses']);
                rows.forEach(function (r) {
                    var tr = el('tr');
                    tr.appendChild(el('th', '', r[0]));
                    tr.appendChild(el('td', '', r[1]));
                    table.appendChild(tr);
                });
                panel.appendChild(table);
            } else if (key === 'reviews') {
                renderReviewList(p, panel);
            } else if (key === 'fit') {
                if (!p.fits) {
                    panel.appendChild(el('p', '', 'Producto universal: sirve para cualquier moto.'));
                } else {
                    var groups = el('div', 'pdp-fit-groups');
                    uniq(p.fits.map(function (id) { return vehicleById[id] ? vehicleById[id].type : ''; }).filter(Boolean)).forEach(function (type) {
                        var g = el('div');
                        g.appendChild(el('strong', '', type));
                        var ul = el('ul');
                        p.fits.forEach(function (id) {
                            var v = vehicleById[id];
                            if (v && v.type === type) ul.appendChild(el('li', '', v.brand + ' ' + v.model));
                        });
                        g.appendChild(ul);
                        groups.appendChild(g);
                    });
                    panel.appendChild(groups);
                    panel.appendChild(el('p', 'pdp-note', '¿No aparece tu moto? Escríbenos y revisamos la compatibilidad por ti.'));
                }
            } else {
                var ul2 = el('ul', 'pdp-ship');
                [
                    'Despacho a todo Chile en 24–48 h hábiles desde que confirmamos tu pago.',
                    p.freeShip ? 'Este producto tiene despacho gratis.' : 'Envío gratis en compras sobre ' + money(FREE_SHIPPING_FROM) + '; bajo ese monto el costo depende de tu región y lo ves antes de pagar.',
                    'Retiro gratis en tienda de lunes a viernes de 9:00 a 19:00 y sábados de 10:00 a 14:00.',
                    'El despacho a domicilio se paga solo con tarjeta de débito o crédito (link de pago). Al retirar en tienda también puedes pagar con transferencia o efectivo.',
                    'Puedes seguir tu pedido en «Mi pedido» con tu número de pedido y los últimos 4 dígitos de tu teléfono.',
                    'Tienes 10 días para cambios con el producto sin uso y en su empaque original.'
                ].forEach(function (t) { ul2.appendChild(el('li', '', t)); });
                panel.appendChild(ul2);
            }
        }

        tabs.forEach(function (t) {
            var b = el('button', 'pdp-tab', t[1]);
            b.type = 'button';
            b.id = 'pm-tab-' + t[0];
            b.dataset.key = t[0];
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-controls', 'pm-panel');
            b.addEventListener('click', function () { show(t[0]); });
            b.addEventListener('keydown', function (e) {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                var all = Array.prototype.slice.call(list.children);
                var next = all[(all.indexOf(b) + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length];
                next.focus();
                next.click();
            });
            list.appendChild(b);
        });
        show('desc');
        list.showTab = show;
    }

    function openModal(id) {
        var p = byId[id];
        var modal = $('product-modal');

        // Ruta
        var crumbs = $('pm-crumbs');
        crumbs.textContent = '';
        var trail = [['Tienda', '#tienda'], [p.cat, collectionHash(p.cat)]];
        if (p.sub) trail.push([p.sub, collectionHash(p.cat, p.sub)]);
        trail.forEach(function (c) {
            var b = el('button', 'crumb', c[0]);
            b.type = 'button';
            b.addEventListener('click', function () {
                closeModal();
                location.hash = c[1];
            });
            crumbs.appendChild(b);
            crumbs.appendChild(el('span', 'crumb-sep', '›'));
        });
        crumbs.appendChild(el('span', 'crumb current', p.name));

        renderGallery(p);

        $('pm-brand').textContent = p.brand || p.cat;
        $('pm-sku').textContent = 'Código: ' + skuOf(p);
        $('pm-title').textContent = p.name;
        var oldRating = $('pm-rating');
        if (oldRating) oldRating.remove();
        var pr = reviewsOf(p.id);
        if (pr.length && !p.quote) {
            var rating = ratingRow(pr, 'pdp-rating');
            rating.id = 'pm-rating';
            var see = el('button', 'pdp-rating-link', 'Ver opiniones');
            see.type = 'button';
            see.addEventListener('click', function () {
                $('pm-tablist').showTab('reviews');
                $('pm-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            rating.appendChild(see);
            $('pm-title').insertAdjacentElement('afterend', rating);
        }

        var price = $('pm-price');
        price.textContent = '';
        price.appendChild(priceRow(p));
        if (p.compare) price.appendChild(el('span', 'save-tag', 'Ahorras ' + money(p.compare - p.price)));
        if (!p.quote) price.appendChild(el('p', 'pdp-tax', 'Precio con IVA incluido'));

        var stock = stockInfo(p);
        var stockEl = $('pm-stock');
        stockEl.className = 'pdp-stock ' + stock[0];
        stockEl.textContent = stock[1];

        renderFitChecker(p);

        var options = $('pm-options');
        options.textContent = '';
        var selected = '';
        if (p.options) {
            options.appendChild(el('p', 'option-label', p.options.name));
            var group = el('div', 'option-group');
            group.setAttribute('role', 'radiogroup');
            group.setAttribute('aria-label', p.options.name);
            p.options.values.forEach(function (value) {
                var left = variantStock(p, value);
                var out = !p.quote && left === 0;
                var b = el('button', 'option' + (out ? ' out' : ''), value);
                b.type = 'button';
                b.setAttribute('role', 'radio');
                b.setAttribute('aria-checked', 'false');
                if (out) {
                    b.disabled = true;
                    b.title = 'Agotado';
                    b.setAttribute('aria-label', value + ' (agotado)');
                }
                b.addEventListener('click', function () {
                    selected = value;
                    if (p.optionStock && left !== undefined) {
                        stockEl.className = 'pdp-stock ' + (left <= 3 ? 'low' : 'ok');
                        stockEl.textContent = left <= 3
                            ? '¡Últimas ' + left + ' en ' + value + '! En stock para envío o retiro'
                            : 'En stock en ' + value + ' (' + left + ' disponibles)';
                    }
                    group.querySelectorAll('.option').forEach(function (o) {
                        o.setAttribute('aria-checked', o === b ? 'true' : 'false');
                    });
                    $('pm-error').textContent = '';
                });
                group.appendChild(b);
            });
            options.appendChild(group);
        }

        var buy = $('pm-buy');
        var bar = $('pm-bar');
        buy.textContent = '';
        bar.textContent = '';
        var barPrice = el('div', 'pdp-bar-price');
        barPrice.appendChild(el('span', '', p.name));
        barPrice.appendChild(el('strong', '', money(p.price)));
        bar.appendChild(barPrice);

        var qty = 1;
        function tryAdd() {
            if (p.options && !selected) {
                $('pm-error').textContent = 'Elige una opción de ' + p.options.name.toLowerCase() + '.';
                $('pm-options').scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            addToCart(p.id, selected, qty);
            return true;
        }

        if (p.quote) {
            buy.appendChild(externalLink('btn btn-primary btn-block', 'Cotizar por WhatsApp', quoteUrl(p)));
            bar.appendChild(externalLink('btn btn-primary btn-sm', 'Cotizar', quoteUrl(p)));
        } else if (soldOut(p)) {
            buy.appendChild(externalLink('btn btn-ghost btn-block', 'Avísame cuando llegue', notifyUrl(p)));
            bar.appendChild(externalLink('btn btn-ghost btn-sm', 'Avísame', notifyUrl(p)));
        } else {
            var stepper = el('div', 'qty');
            var minus = el('button', '', '−');
            var count = el('span', '', '1');
            var plus = el('button', '', '+');
            minus.type = plus.type = 'button';
            minus.setAttribute('aria-label', 'Restar uno');
            plus.setAttribute('aria-label', 'Sumar uno');
            minus.addEventListener('click', function () {
                qty = Math.max(1, qty - 1);
                count.textContent = qty;
            });
            plus.addEventListener('click', function () {
                qty = Math.min(maxQty(p, selected), qty + 1);
                count.textContent = qty;
            });
            stepper.appendChild(minus);
            stepper.appendChild(count);
            stepper.appendChild(plus);

            var add = el('button', 'btn btn-primary', 'Agregar al carro');
            add.type = 'button';
            add.addEventListener('click', function () {
                if (tryAdd()) closeModal();
            });
            var now = el('button', 'btn btn-ghost btn-block pdp-buy-now', 'Comprar ahora');
            now.type = 'button';
            now.addEventListener('click', function () {
                if (!tryAdd()) return;
                closeModal();
                openCart();
                showView('checkout-view');
                $('co-name').focus();
            });
            buy.appendChild(stepper);
            buy.appendChild(add);
            buy.appendChild(now);
            buy.appendChild(el('p', 'form-error', ''));
            buy.lastChild.id = 'pm-error';

            var barAdd = el('button', 'btn btn-primary btn-sm', 'Agregar');
            barAdd.type = 'button';
            barAdd.addEventListener('click', function () {
                if (tryAdd()) closeModal();
            });
            bar.appendChild(barAdd);
        }

        var perks = $('pm-perks');
        perks.textContent = '';
        [
            [ICONS.truck, 'Despacho a todo Chile', '24–48 h hábiles'],
            [ICONS.gift, p.freeShip ? 'Despacho gratis' : 'Envío gratis', p.freeShip ? 'En este producto' : 'Sobre ' + money(FREE_SHIPPING_FROM)],
            [ICONS.store, 'Retiro en tienda', 'Gratis, en Santiago'],
            [ICONS.shield, 'Garantía', p.warranty || 'Legal de 6 meses']
        ].forEach(function (k) {
            var li = el('li');
            li.appendChild(svgIcon(k[0]));
            var txt = el('span');
            txt.appendChild(el('strong', '', k[1]));
            txt.appendChild(el('small', '', k[2]));
            li.appendChild(txt);
            perks.appendChild(li);
        });

        var tools = $('pm-tools');
        tools.textContent = '';
        var fav = favButton(p);
        fav.classList.add('fav-inline');
        tools.appendChild(fav);
        var share = el('button', 'share-btn', 'Compartir');
        share.type = 'button';
        share.addEventListener('click', function () { shareProduct(p); });
        tools.appendChild(share);

        renderTabs(p);

        var ask = $('pm-ask');
        ask.textContent = '';
        var askText = el('div');
        askText.appendChild(el('strong', '', '¿Tienes una duda sobre este producto?'));
        askText.appendChild(el('span', '', 'Te ayudamos a confirmar la compatibilidad, la medida o el stock.'));
        ask.appendChild(svgIcon(ICONS.chat));
        ask.appendChild(askText);
        ask.appendChild(externalLink('btn btn-sm btn-ghost', 'Preguntar por WhatsApp',
            waUrl('Hola Catrian Racing! Tengo una consulta sobre: ' + p.name + ' (código ' + skuOf(p) + ').')));

        var related = $('pm-related');
        related.textContent = '';
        var others = products.filter(function (o) {
            return o.id !== p.id && (o.sub && o.sub === p.sub || o.cat === p.cat);
        }).sort(function (a, b) { return (b.sub === p.sub) - (a.sub === p.sub); }).slice(0, 8);
        if (others.length) {
            related.appendChild(el('h3', '', 'También te puede interesar'));
            var row = el('div', 'pdp-related-row');
            others.forEach(function (o) {
                var c = el('button', 'pdp-rel');
                c.type = 'button';
                var m = el('span', 'pdp-rel-media' + (isStudio(o) ? ' studio' : ''));
                productImage(o, m);
                c.appendChild(m);
                c.appendChild(el('span', 'pdp-rel-name', o.name));
                c.appendChild(el('span', 'pdp-rel-price', money(o.price)));
                c.addEventListener('click', function () { openModal(o.id); });
                row.appendChild(c);
            });
            related.appendChild(row);
        }

        if (modal.hidden) {
            lastFocus = document.activeElement;
            modal.hidden = false;
            document.body.classList.add('locked');
        }
        modal.scrollTop = 0;
        modal.querySelector('.modal-box').scrollTop = 0;
        $('modal-close').focus();
        trackRecent(p.id);
        if (!p.quote) trackEvent('view_item', [gaItem(p)]);
        if (!/^#p\//.test(location.hash)) returnHash = location.hash;
        if (location.hash !== '#p/' + p.id) history.replaceState(null, '', '#p/' + p.id);
    }

    var returnHash = '';
    function closeModal(keepHash) {
        $('product-modal').hidden = true;
        if (!$('cart').classList.contains('open')) document.body.classList.remove('locked');
        if (!keepHash && /^#p\//.test(location.hash)) {
            history.replaceState(null, '', returnHash || location.pathname + location.search);
        }
        returnHash = '';
        if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    }

    function shareProduct(p) {
        var url = /^https:/.test(location.protocol)
            ? location.origin + '/productos/' + encodeURIComponent(p.id)
            : location.href.split('#')[0] + '#p/' + p.id;
        if (navigator.share) {
            navigator.share({ title: p.name + ' | Catrian Racing', url: url }).catch(function () {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(function () { toast('Enlace copiado'); }, function () { toast(url); });
        } else {
            toast(url);
        }
    }

    function openFromHash() {
        var m = /^#p\/(.+)$/.exec(location.hash);
        if (m && byId[m[1]]) openModal(m[1]);
    }

    /* ===== CARRO ===== */
    function addToCart(id, option, qty) {
        var p = byId[id];
        var line = cart.filter(function (l) { return l.id === id && l.option === option; })[0];
        var limit = maxQty(p, option);
        if (limit <= 0) return toast('Sin stock' + (option ? ' en ' + option : ''));
        if (line) line.qty = Math.min(limit, line.qty + qty);
        else cart.push({ id: id, option: option, qty: Math.min(limit, qty) });
        saveCart();
        renderCart();
        toast(p.name + (option ? ' (' + option + ')' : '') + ' agregado al carro');
        trackEvent('add_to_cart', [gaItem(p, option, qty)]);
        var badge = $('cart-count');
        badge.classList.remove('bump');
        void badge.offsetWidth;
        badge.classList.add('bump');
    }

    function setQty(index, qty) {
        var line = cart[index];
        if (qty <= 0) cart.splice(index, 1);
        else line.qty = Math.max(1, Math.min(maxQty(byId[line.id], line.option), qty));
        saveCart();
        renderCart();
    }

    function renderCart() {
        var count = cartCount();
        var subtotal = cartSubtotal();
        var badge = $('cart-count');
        badge.textContent = count;
        badge.classList.toggle('show', count > 0);

        var list = $('cart-items');
        list.textContent = '';
        cart.forEach(function (line, i) {
            var p = byId[line.id];
            var li = el('li', 'cart-line');
            var thumb = el('div', 'cart-thumb');
            productImage(p, thumb);
            li.appendChild(thumb);

            var info = el('div', 'cart-info');
            info.appendChild(el('strong', '', p.name));
            if (line.option) info.appendChild(el('span', 'cart-option', p.options.name + ': ' + line.option));
            info.appendChild(el('span', 'cart-price', money(p.price * line.qty)));

            var row = el('div', 'cart-row');
            var stepper = el('div', 'qty qty-sm');
            var minus = el('button', '', '−');
            var plus = el('button', '', '+');
            minus.type = plus.type = 'button';
            minus.setAttribute('aria-label', 'Restar uno');
            plus.setAttribute('aria-label', 'Sumar uno');
            minus.addEventListener('click', function () { setQty(i, line.qty - 1); });
            plus.addEventListener('click', function () { setQty(i, line.qty + 1); });
            stepper.appendChild(minus);
            stepper.appendChild(el('span', '', String(line.qty)));
            stepper.appendChild(plus);
            row.appendChild(stepper);

            var remove = el('button', 'remove', 'Quitar');
            remove.type = 'button';
            remove.addEventListener('click', function () { setQty(i, 0); });
            row.appendChild(remove);
            info.appendChild(row);
            li.appendChild(info);
            list.appendChild(li);
        });

        var empty = cart.length === 0;
        $('cart-empty').hidden = !empty;
        $('cart-foot').hidden = empty;
        $('ship-progress').hidden = empty;
        $('cart-subtotal').textContent = money(subtotal);

        var missing = FREE_SHIPPING_FROM - subtotal;
        $('ship-text').textContent = missing > 0
            ? 'Te faltan ' + money(missing) + ' para envío gratis'
            : '¡Tienes envío gratis!';
        $('ship-fill').style.width = Math.min(100, subtotal / FREE_SHIPPING_FROM * 100) + '%';

        updateTotals();
    }

    // Igual que shipping_quote() en la base de datos: null = sin tarifa para esa región.
    function quoteShipping(region) {
        var allFree = cart.length && cart.every(function (line) { return byId[line.id] && byId[line.id].freeShip; });
        if (allFree || cartSubtotal() >= FREE_SHIPPING_FROM || couponActive() && state.couponInfo.free_shipping) return 0;
        var rate = SHIPPING_RATES[region];
        return typeof rate === 'number' ? rate : null;
    }

    function shippingCost() {
        var form = $('checkout-view');
        return form.delivery.value === 'despacho' ? quoteShipping(form.region.value) : 0;
    }

    function couponActive() {
        return !!(state.coupon && state.couponInfo && cartSubtotal() >= (state.couponInfo.min_subtotal || 0));
    }

    function couponDiscount() {
        if (!couponActive()) return 0;
        var subtotal = cartSubtotal();
        var info = state.couponInfo;
        return Math.min(Math.round(subtotal * (info.percent || 0) / 100) + (info.amount || 0), subtotal);
    }

    function couponText(info) {
        var parts = [];
        if (info.percent) parts.push(info.percent + '% de descuento');
        if (info.amount) parts.push(money(info.amount) + ' de descuento');
        if (info.free_shipping) parts.push('envío gratis');
        return parts.join(' + ');
    }

    function couponMessage() {
        var msg = $('coupon-msg');
        if (!state.coupon || !state.couponInfo) return;
        var missing = (state.couponInfo.min_subtotal || 0) - cartSubtotal();
        if (missing > 0) {
            msg.className = 'coupon-msg';
            msg.textContent = 'Agrega ' + money(missing) + ' más para usar el cupón ' + state.coupon + '.';
        } else {
            msg.className = 'coupon-msg ok';
            msg.textContent = 'Cupón ' + state.coupon + ' aplicado: ' + couponText(state.couponInfo) + '.';
        }
    }

    function applyCoupon() {
        var input = $('coupon-input');
        var code = input.value.trim().toUpperCase();
        var msg = $('coupon-msg');
        if (!code) return;
        msg.className = 'coupon-msg';
        msg.textContent = 'Validando cupón...';
        rpc('check_coupon', { p_code: code, p_subtotal: cartSubtotal() }).then(function (res) {
            if (res && (res.ok || res.min_subtotal)) {
                // Si falta monto, el cupón queda guardado y se activa al llegar al mínimo.
                state.coupon = code;
                state.couponInfo = res.ok ? res : null;
                if (!res.ok) {
                    rpc('check_coupon', { p_code: code, p_subtotal: res.min_subtotal }).then(function (full) {
                        if (full && full.ok && state.coupon === code) {
                            state.couponInfo = full;
                            couponMessage();
                            updateTotals();
                        }
                    });
                    msg.textContent = res.message + '.';
                }
                else couponMessage();
            } else {
                state.coupon = null;
                state.couponInfo = null;
                msg.textContent = (res && res.message ? res.message : 'El cupón no es válido') + '.';
            }
            updateTotals();
        }, function () {
            state.coupon = null;
            state.couponInfo = null;
            msg.textContent = 'No pudimos validar el cupón ahora. Escríbelo en las notas del pedido.';
            updateTotals();
        });
    }

    function updateTotals() {
        var form = $('checkout-view');
        var subtotal = cartSubtotal();
        var discountValue = couponDiscount();
        couponMessage();
        var shipping = shippingCost();
        var shipQuote = quoteShipping(form.region.value);
        $('ship-label').textContent = shipQuote === 0 ? 'Gratis' : (shipQuote === null ? 'A cotizar' : 'Desde ' + money(Math.min.apply(null, Object.keys(SHIPPING_RATES).map(function (k) { return SHIPPING_RATES[k]; }))));
        $('ship-fields').hidden = form.delivery.value !== 'despacho';
        $('bill-fields').hidden = form.doc.value !== 'factura';
        syncPayment();
        $('co-subtotal').textContent = money(subtotal);
        $('co-discount-row').hidden = !discountValue;
        $('co-discount').textContent = '−' + money(discountValue);
        var shipText = form.delivery.value !== 'despacho' ? 'Retiro gratis'
            : (shipping === null ? 'A cotizar' : (shipping === 0 ? 'Gratis' : money(shipping) + ' · ' + form.region.value));
        $('co-shipping').textContent = shipText;
        $('co-total').textContent = money(subtotal - discountValue + (shipping || 0)) + (shipping === null ? ' + envío' : '');
    }

    // Despacho a domicilio: solo tarjeta (no transferencia ni efectivo).
    var CARD_PAYMENT = 'Tarjeta de débito o crédito (link de pago)';
    function syncPayment() {
        var form = $('checkout-view');
        var shipping = form.delivery.value === 'despacho';
        form.querySelectorAll('.pay-pickup').forEach(function (label) {
            var radio = label.querySelector('input');
            label.hidden = shipping;
            radio.disabled = shipping;
        });
        if (shipping) {
            form.querySelector('input[name="payment"][value="' + CARD_PAYMENT + '"]').checked = true;
        }
        $('pay-note').hidden = !shipping;
        $('pay-card-text').textContent = MP_ENABLED ? 'Débito, crédito o prepago' : 'Débito o crédito';
        $('pay-card-note').textContent = MP_ENABLED ? 'Pago en línea · Mercado Pago' : 'Link de pago';
        $('pay-note').textContent = MP_ENABLED
            ? 'El despacho a domicilio se paga solo con tarjeta: pagas en línea de forma segura con Mercado Pago.'
            : 'El despacho a domicilio se paga solo con tarjeta de débito o crédito: te enviamos un link de pago seguro.';
        var submit = form.querySelector('button[type="submit"]');
        if (!submit.disabled) submit.textContent = submitLabel();
    }

    function paysOnline() {
        var form = $('checkout-view');
        return MP_ENABLED && form.payment.value === CARD_PAYMENT && shippingCost() !== null;
    }

    function submitLabel() {
        return paysOnline() ? 'Pagar con Mercado Pago' : 'Enviar pedido por WhatsApp';
    }

    function showView(name) {
        ['cart-view', 'checkout-view', 'done-view'].forEach(function (id) {
            $(id).hidden = id !== name;
        });
        $('cart-title').textContent = name === 'checkout-view' ? 'Finalizar compra' : 'Tu carro';
        $('cart').scrollTop = 0;
    }

    function openCart() {
        lastFocus = document.activeElement;
        showView('cart-view');
        var drawer = $('cart');
        $('overlay').hidden = false;
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.classList.add('locked');
        $('cart-close').focus();
    }

    function closeCart() {
        var drawer = $('cart');
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        $('overlay').hidden = true;
        document.body.classList.remove('locked');
        if (lastFocus) lastFocus.focus();
    }

    // RUT chileno: dígito verificador con módulo 11.
    function validRut(value) {
        var v = String(value || '').replace(/[^0-9kK]/g, '').toUpperCase();
        if (v.length < 8 || v.length > 9 || !/^\d+$/.test(v.slice(0, -1))) return false;
        var sum = 0, mul = 2;
        for (var i = v.length - 2; i >= 0; i--) {
            sum += Number(v[i]) * mul;
            mul = mul === 7 ? 2 : mul + 1;
        }
        var r = 11 - (sum % 11);
        return v.slice(-1) === (r === 11 ? '0' : r === 10 ? 'K' : String(r));
    }

    function formatRut(value) {
        var v = String(value || '').replace(/[^0-9kK]/g, '').toUpperCase();
        if (v.length < 2) return v;
        return v.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + v.slice(-1);
    }

    function submitOrder(e) {
        e.preventDefault();
        var form = $('checkout-view');
        var error = $('checkout-error');
        var submit = form.querySelector('button[type="submit"]');
        var name = form.name.value.trim();
        var phone = form.phone.value.trim();
        var delivery = form.delivery.value;

        if (!name || !phone) {
            error.textContent = 'Completa tu nombre y teléfono.';
            (name ? form.phone : form.name).focus();
            return;
        }
        if (delivery === 'despacho' && (!form.commune.value.trim() || !form.address.value.trim())) {
            error.textContent = 'Completa la comuna y dirección de despacho.';
            (form.commune.value.trim() ? form.address : form.commune).focus();
            return;
        }
        var billing = null;
        if (form.doc.value === 'factura') {
            billing = {
                rut: form.rut.value.trim(), razon_social: form.razon.value.trim(),
                giro: form.giro.value.trim(), direccion: form.billaddress.value.trim()
            };
            if (!validRut(billing.rut)) {
                error.textContent = 'Revisa el RUT de la empresa (por ejemplo 76.123.456-7).';
                form.rut.focus();
                return;
            }
            if (!billing.razon_social || !billing.giro || !billing.direccion) {
                error.textContent = 'Completa los datos de la factura.';
                (!billing.razon_social ? form.razon : (!billing.giro ? form.giro : form.billaddress)).focus();
                return;
            }
        }
        error.textContent = '';

        var data = {
            doc: form.doc.value,
            billing: billing,
            name: name,
            phone: phone,
            email: form.email.value.trim(),
            delivery: delivery,
            region: form.region.value,
            commune: form.commune.value.trim(),
            address: form.address.value.trim(),
            payment: form.payment.value,
            notes: form.notes.value.trim()
        };

        var online = paysOnline();
        // Se abre la pestaña de WhatsApp ahora (con el clic) para que el navegador no la bloquee.
        var win = online ? null : window.open('', '_blank');
        submit.disabled = true;
        submit.textContent = online ? 'Preparando el pago...' : 'Enviando pedido...';

        rpc('place_order', {
            p_items: cart.map(function (line) { return { id: line.id, option: line.option, qty: line.qty }; }),
            p_name: data.name, p_phone: data.phone, p_email: data.email, p_delivery: data.delivery,
            p_region: data.region, p_commune: data.commune, p_address: data.address,
            p_payment: data.payment, p_notes: data.notes, p_coupon: state.coupon || '',
            p_doc_type: data.doc, p_billing: data.billing
        }).then(function (order) {
            trackEvent('purchase', cartItems(), { transaction_id: order.ref, value: order.total, shipping: order.shipping || 0, coupon: order.coupon || undefined });
            if (online) payOnline(data, order);
            else finishOrder(win, data, order);
        }, function (err) {
            if (err && err.status === 400) {
                if (win) win.close();
                error.textContent = err.message || 'No pudimos registrar el pedido. Revisa tu carro.';
                resetSubmit(submit);
                return;
            }
            // Sin conexión a la base de datos: el pedido igual se envía por WhatsApp.
            var subtotal = cartSubtotal();
            var discountValue = couponDiscount();
            finishOrder(win, data, {
                ref: 'CR-' + Date.now().toString(36).toUpperCase().slice(-6),
                items: cart.map(function (line) {
                    var p = byId[line.id];
                    return { name: p.name, option: line.option, qty: line.qty, price: p.price };
                }),
                subtotal: subtotal,
                discount: discountValue,
                coupon: state.coupon,
                shipping: shippingCost() || 0,
                shipping_pending: shippingCost() === null,
                total: subtotal - discountValue + (shippingCost() || 0)
            });
        });
    }

    // Pago en línea: el pedido ya quedó guardado; se lleva al cliente a Mercado Pago.
    function payOnline(data, order) {
        var phone4 = data.phone.replace(/\D/g, '').slice(-4);
        rememberOrder(order.ref, phone4, 'nuevo');
        rpc('mp_create_payment', { p_ref: order.ref, p_phone: phone4, p_return_url: location.href.split('#')[0] }).then(function (url) {
            if (!url || !/^https:\/\//.test(url)) throw new Error('sin enlace');
            cart = [];
            saveCart();
            location.href = url;
        }).catch(function () {
            // Si Mercado Pago no responde, el pedido sigue por WhatsApp con link de pago manual.
            finishOrder(null, data, order);
            toast('No pudimos abrir el pago en línea. Te enviaremos el link de pago por WhatsApp.');
        });
    }

    function startOnlinePayment(ref, phone4, button) {
        if (button) {
            button.disabled = true;
            button.textContent = 'Abriendo Mercado Pago...';
        }
        rpc('mp_create_payment', { p_ref: ref, p_phone: phone4, p_return_url: location.href.split('#')[0] }).then(function (url) {
            if (url && /^https:\/\//.test(url)) location.href = url;
        }, function (err) {
            toast(err && err.message ? err.message : 'No pudimos abrir el pago. Intenta en unos minutos.');
            if (button) {
                button.disabled = false;
                button.textContent = 'Pagar ahora con tarjeta';
            }
        });
    }

    function resetSubmit(submit) {
        submit.disabled = false;
        submit.textContent = submitLabel();
    }

    function finishOrder(win, data, order) {
        var lines = ['Hola Catrian Racing! Quiero hacer este pedido (' + order.ref + '):', ''];
        order.items.forEach(function (item) {
            lines.push('• ' + item.qty + ' x ' + item.name + (item.option ? ' (' + item.option + ')' : '') + ' — ' + money(item.price * item.qty));
        });
        lines.push('');
        lines.push('Subtotal: ' + money(order.subtotal));
        if (order.discount) lines.push('Cupón ' + order.coupon + ': −' + money(order.discount));
        else if (order.coupon) lines.push('Cupón ' + order.coupon + ' aplicado');
        lines.push('Envío: ' + (data.delivery === 'retiro' ? 'Retiro en tienda' : (order.shipping_pending ? 'A cotizar' : (order.shipping ? money(order.shipping) : 'Gratis'))));
        lines.push('Total: ' + money(order.total) + (order.shipping_pending ? ' + envío' : ''));
        lines.push('');
        lines.push('Nombre: ' + data.name);
        lines.push('Teléfono: ' + data.phone);
        if (data.email) lines.push('Email: ' + data.email);
        if (data.delivery === 'despacho') {
            lines.push('Dirección: ' + data.address + ', ' + data.commune + ', ' + data.region);
        }
        lines.push('Pago: ' + data.payment);
        if (data.billing) {
            lines.push('Factura: ' + data.billing.razon_social + ' · RUT ' + formatRut(data.billing.rut) +
                ' · Giro ' + data.billing.giro + ' · ' + data.billing.direccion);
        }
        if (data.notes) lines.push('Notas: ' + data.notes);
        lines.push('');
        lines.push('Seguimiento del pedido: ' + trackingLink(order.ref));

        var url = waUrl(lines.join('\n'));
        if (win && !win.closed) win.location.href = url;
        else window.open(url, '_blank');

        var form = $('checkout-view');
        cart = [];
        saveCart();
        renderCart();
        form.reset();
        state.coupon = null;
        state.couponInfo = null;
        $('coupon-msg').textContent = '';
        resetSubmit(form.querySelector('button[type="submit"]'));
        updateTotals();
        $('done-ref').textContent = order.ref;
        $('done-track').href = '#seguimiento/' + order.ref;
        rememberOrder(order.ref, data.phone.replace(/\D/g, '').slice(-4), 'nuevo');
        showView('done-view');
    }

    /* ===== BASE DE DATOS (SUPABASE) ===== */
    function dbFetch(path, options) {
        if (!DB) return Promise.reject({ status: 0 });
        options = options || {};
        var headers = { apikey: DB.key, 'Content-Type': 'application/json' };
        return fetch(DB.url + path, { method: options.method || 'GET', headers: headers, body: options.body }).then(function (res) {
            return res.text().then(function (text) {
                var body = null;
                try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
                if (!res.ok) {
                    var message = body && (body.message || body.error_description || body.error);
                    return Promise.reject({ status: res.status, message: message });
                }
                return body;
            });
        }, function () {
            return Promise.reject({ status: 0 });
        });
    }

    function rpc(name, args) {
        return dbFetch('/rest/v1/rpc/' + name, { method: 'POST', body: JSON.stringify(args) });
    }

    function fromDbProduct(row) {
        var p = {
            id: row.id, name: row.name, cat: row.cat, price: row.price, desc: row.desc || '',
            img: row.img || ''
        };
        if (row.sub) p.sub = row.sub;
        if (row.brand) p.brand = row.brand;
        if (row.compare) p.compare = row.compare;
        if (row.stock !== null && row.stock !== undefined) p.stock = row.stock;
        if (row.specs && row.specs.length) p.specs = row.specs;
        if (row.options && row.options.values && row.options.values.length) p.options = row.options;
        if (p.options && row.option_stock) p.optionStock = row.option_stock;
        if (row.fits && row.fits.length) p.fits = row.fits;
        if (row.badge) p.badge = row.badge;
        if (row.quote) p.quote = true;
        if (row.cc) p.cc = row.cc;
        if (row.free_ship) p.freeShip = true;
        if (row.images && row.images.length) p.images = row.images;
        if (row.sku) p.sku = row.sku;
        if (row.warranty) p.warranty = row.warranty;
        return p;
    }

    /* ===== ANALÍTICA (Google Analytics 4 y Meta Pixel, configurables desde el admin) ===== */
    var analyticsLoaded = false;
    function loadAnalytics(cfg) {
        if (analyticsLoaded) return;
        var ga4 = /^G-[A-Z0-9]{4,15}$/.test(cfg.ga4 || '') ? cfg.ga4 : '';
        var pixel = /^\d{6,20}$/.test(cfg.pixel || '') ? cfg.pixel : '';
        if (!ga4 && !pixel) return;
        analyticsLoaded = true;
        if (ga4) {
            window.dataLayer = window.dataLayer || [];
            window.gtag = function () { window.dataLayer.push(arguments); };
            window.gtag('js', new Date());
            window.gtag('config', ga4);
            addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4));
        }
        if (pixel) {
            var fbq = window.fbq = function () {
                if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
                else fbq.queue.push(arguments);
            };
            fbq.push = fbq;
            fbq.loaded = true;
            fbq.version = '2.0';
            fbq.queue = [];
            window._fbq = fbq;
            fbq('init', pixel);
            fbq('track', 'PageView');
            addScript('https://connect.facebook.net/en_US/fbevents.js');
        }
    }

    function addScript(src) {
        var sc = document.createElement('script');
        sc.async = true;
        sc.src = src;
        document.head.appendChild(sc);
    }

    var META_EVENTS = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase' };
    function trackEvent(name, items, extra) {
        if (!window.gtag && !window.fbq) return;
        var value = items.reduce(function (sum, it) { return sum + it.price * (it.quantity || 1); }, 0);
        if (window.gtag) {
            window.gtag('event', name, Object.assign({ currency: 'CLP', value: value, items: items }, extra || {}));
        }
        if (window.fbq && META_EVENTS[name]) {
            window.fbq('track', META_EVENTS[name], {
                currency: 'CLP', value: extra && extra.value !== undefined ? extra.value : value,
                content_ids: items.map(function (it) { return it.item_id; }), content_type: 'product'
            });
        }
    }

    function gaItem(p, option, qty) {
        var it = { item_id: p.id, item_name: p.name, price: p.price, quantity: qty || 1, item_category: p.cat };
        if (p.brand) it.item_brand = p.brand;
        if (option) it.item_variant = option;
        return it;
    }

    function cartItems() {
        return cart.filter(function (l) { return byId[l.id]; }).map(function (l) { return gaItem(byId[l.id], l.option, l.qty); });
    }

    /* ===== OPINIONES ===== */
    var reviewsByProduct = {};

    function reviewsOf(id) {
        return reviewsByProduct[id] || [];
    }

    function loadReviews() {
        dbFetch('/rest/v1/reviews?select=id,product_id,name,rating,title,body,reply,created_at&status=eq.publicada&order=created_at.desc&limit=1000')
            .then(function (rows) {
                reviewsByProduct = {};
                (rows || []).forEach(function (r) {
                    (reviewsByProduct[r.product_id] = reviewsByProduct[r.product_id] || []).push(r);
                });
                if (rows && rows.length) renderProducts();
            }, function () { /* sin opiniones */ });
    }

    function stars(value, label) {
        var wrap = el('span', 'stars');
        wrap.setAttribute('role', 'img');
        wrap.setAttribute('aria-label', label || (String(value).replace('.', ',') + ' de 5 estrellas'));
        var fill = el('span', 'stars-fill');
        fill.style.width = (value / 5 * 100) + '%';
        wrap.appendChild(fill);
        return wrap;
    }

    function ratingRow(list, className) {
        var avg = list.reduce(function (s, r) { return s + r.rating; }, 0) / list.length;
        var avgText = (Math.round(avg * 10) / 10).toString().replace('.', ',');
        var row = el('div', 'rating ' + className);
        row.appendChild(stars(avg, avgText + ' de 5 estrellas, ' + list.length + (list.length === 1 ? ' opinión' : ' opiniones')));
        row.appendChild(el('span', 'rating-text', avgText + ' (' + list.length + ')'));
        return row;
    }

    function renderReviewList(p, panel) {
        var list = reviewsOf(p.id);
        if (!list.length) {
            panel.appendChild(el('p', '', 'Aún no hay opiniones de este producto.'));
            panel.appendChild(el('p', 'pdp-note', 'Si lo compraste, puedes opinar desde «Mi pedido» cuando lo recibas.'));
            return;
        }
        var head = el('div', 'reviews-head');
        head.appendChild(ratingRow(list, 'reviews-avg'));
        var bars = el('div', 'reviews-bars');
        [5, 4, 3, 2, 1].forEach(function (n) {
            var count = list.filter(function (r) { return r.rating === n; }).length;
            var line = el('div', 'reviews-bar');
            line.appendChild(el('span', '', n + '★'));
            var track = el('span', 'bar-track');
            var fillBar = el('span', 'bar-fill');
            fillBar.style.width = (count / list.length * 100) + '%';
            track.appendChild(fillBar);
            line.appendChild(track);
            line.appendChild(el('span', '', String(count)));
            bars.appendChild(line);
        });
        head.appendChild(bars);
        panel.appendChild(head);
        var ul = el('ul', 'reviews-list');
        list.slice(0, 30).forEach(function (r) {
            var li = el('li', 'review');
            var top = el('div', 'review-top');
            top.appendChild(stars(r.rating));
            if (r.title) top.appendChild(el('strong', '', r.title));
            li.appendChild(top);
            if (r.body) li.appendChild(el('p', '', r.body));
            var meta = el('p', 'review-meta', r.name + ' · ' + new Date(r.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }));
            meta.appendChild(el('span', 'review-verified', '✓ Compra verificada'));
            li.appendChild(meta);
            if (r.reply) {
                var reply = el('div', 'review-reply');
                reply.appendChild(el('strong', '', 'Respuesta de Catrian Racing'));
                reply.appendChild(el('p', '', r.reply));
                li.appendChild(reply);
            }
            ul.appendChild(li);
        });
        panel.appendChild(ul);
    }

    function renderReviewBox(o, phone, result, before) {
        var items = (o.items || []).filter(function (it) { return it.id && byId[it.id] && !byId[it.id].quote; });
        if (!items.length) return;
        var box = el('div', 'track-reviews');
        box.appendChild(el('h3', '', '¿Qué te pareció tu compra?'));
        box.appendChild(el('p', 'track-muted', 'Tu opinión ayuda a otros motoqueros. Se publica con tu nombre y la inicial de tu apellido.'));
        var ul = el('ul', 'review-items');
        box.appendChild(ul);
        result.insertBefore(box, before);
        rpc('my_reviews', { p_ref: o.ref, p_phone: phone }).then(function (mine) { draw(mine || []); }, function () { draw([]); });

        function draw(mine) {
            ul.textContent = '';
            var seen = {};
            items.forEach(function (it) {
                if (seen[it.id]) return;
                seen[it.id] = true;
                var done = mine.filter(function (m) { return m.product_id === it.id; })[0];
                var li = el('li', 'review-item');
                li.appendChild(el('span', 'review-item-name', it.name));
                if (done) {
                    li.appendChild(el('span', 'review-state', done.status === 'publicada' ? '✓ Opinión publicada' : (done.status === 'rechazada' ? 'Opinión no publicada' : '✓ Gracias, la revisaremos pronto')));
                } else {
                    var open = el('button', 'btn btn-ghost btn-sm', 'Opinar');
                    open.type = 'button';
                    open.addEventListener('click', function () { openForm(li, it, open); });
                    li.appendChild(open);
                }
                ul.appendChild(li);
            });
        }

        function openForm(li, it, opener) {
            opener.remove();
            var form = el('form', 'review-form');
            form.noValidate = true;
            var picked = 0;
            var starRow = el('div', 'star-pick');
            starRow.setAttribute('role', 'radiogroup');
            starRow.setAttribute('aria-label', 'Calificación');
            for (var n = 1; n <= 5; n++) {
                (function (n) {
                    var b = el('button', 'star-btn', '★');
                    b.type = 'button';
                    b.setAttribute('role', 'radio');
                    b.setAttribute('aria-checked', 'false');
                    b.setAttribute('aria-label', n + (n === 1 ? ' estrella' : ' estrellas'));
                    b.addEventListener('click', function () {
                        picked = n;
                        starRow.querySelectorAll('.star-btn').forEach(function (x, i) {
                            x.classList.toggle('on', i < n);
                            x.setAttribute('aria-checked', i === n - 1 ? 'true' : 'false');
                        });
                    });
                    starRow.appendChild(b);
                })(n);
            }
            form.appendChild(starRow);
            var title = el('input');
            title.maxLength = 80;
            title.placeholder = 'Título (opcional)';
            title.setAttribute('aria-label', 'Título');
            var body = el('textarea');
            body.maxLength = 1000;
            body.rows = 3;
            body.placeholder = '¿Cómo te fue con el producto?';
            body.setAttribute('aria-label', 'Tu opinión');
            form.appendChild(title);
            form.appendChild(body);
            var msg = el('p', 'form-error');
            msg.setAttribute('role', 'alert');
            form.appendChild(msg);
            var send = el('button', 'btn btn-primary btn-sm', 'Publicar opinión');
            send.type = 'submit';
            form.appendChild(send);
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                if (!picked) { msg.textContent = 'Elige de 1 a 5 estrellas.'; return; }
                send.disabled = true;
                rpc('submit_review', { p_ref: o.ref, p_phone: phone, p_product: it.id, p_rating: picked, p_title: title.value.trim(), p_body: body.value.trim() })
                    .then(function () {
                        form.remove();
                        li.appendChild(el('span', 'review-state', '✓ Gracias, la revisaremos pronto'));
                    }, function (err) {
                        send.disabled = false;
                        msg.textContent = err && err.message ? err.message : 'No pudimos enviar tu opinión. Intenta de nuevo.';
                    });
            });
            li.appendChild(form);
            starRow.querySelector('.star-btn').focus();
        }
    }

    function applySettings(rows) {
        rows.forEach(function (row) {
            if (row.key === 'whatsapp' && row.value) WHATSAPP = String(row.value).replace(/\D/g, '');
            if (row.key === 'free_shipping_from' && row.value >= 0) FREE_SHIPPING_FROM = Number(row.value);
            if (row.key === 'shipping_rates' && row.value && typeof row.value === 'object') SHIPPING_RATES = row.value;
            if (row.key === 'payments' && row.value) MP_ENABLED = !!row.value.mp_enabled;
            if (row.key === 'analytics' && row.value) loadAnalytics(row.value);
            if (row.key === 'announce' && Array.isArray(row.value)) {
                var bar = document.querySelector('.announce');
                if (bar) {
                    bar.textContent = '';
                    row.value.filter(Boolean).forEach(function (text) { bar.appendChild(el('span', '', text)); });
                    bar.hidden = !bar.childElementCount;
                }
            }
        });
    }

    function loadRemoteCatalog() {
        Promise.all([
            dbFetch('/rest/v1/products?select=*&order=sort.asc,name.asc'),
            dbFetch('/rest/v1/vehicles?select=*&order=sort.asc,brand.asc'),
            dbFetch('/rest/v1/settings?select=*')
        ]).then(function (res) {
            if (!res[0] || !res[0].length) return;
            products = res[0].map(fromDbProduct);
            loadReviews();
            if (res[1] && res[1].length) vehicles = res[1];
            indexCatalog();
            applySettings(res[2] || []);
            cart = loadCart();
            favs = loadList(FAVS_KEY);
            recent = loadList(RECENT_KEY);
            if (state.vehicle && !vehicleById[state.vehicle]) setVehicle('');
            setupFinder();
            renderProducts();
            renderKit();
            renderCart();
            renderFavCount();
            renderRecent();
            renderMegaMenu();
            if (state.collection) renderCollectionHead();
            if (parseCollection()) route();
            else if ($('product-modal').hidden) openFromHash();
        }, function () { /* sin conexión: se mantiene el catálogo de respaldo */ });
    }

    var toastTimer = null;
    function toast(message) {
        var t = $('toast');
        t.textContent = message;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
    }

    /* ===== EVENTOS ===== */
    $('shop-search').addEventListener('input', function (e) {
        state.query = e.target.value;
        resetPage();
        renderProducts();
    });
    $('shop-sort').addEventListener('change', function (e) {
        withTransition(function () {
            state.sort = e.target.value;
            renderProducts();
        });
    });
    $('shop-brand').addEventListener('change', function (e) {
        withTransition(function () {
            state.brand = e.target.value;
            resetPage();
            renderProducts();
        });
    });
    $('shop-more').addEventListener('click', function () {
        state.limit += PAGE_SIZE;
        renderProducts();
    });
    $('fit-type').addEventListener('change', updateFitBrands);
    $('fit-brand').addEventListener('change', updateFitModels);
    $('fit-model').addEventListener('change', function (e) { $('fit-go').disabled = !e.target.value; });
    $('fit-form').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!$('fit-model').value) return;
        setVehicle($('fit-model').value);
        $('tienda').scrollIntoView();
    });
    $('fit-clear').addEventListener('click', function () {
        withTransition(function () { setVehicle(''); });
    });
    $('shop-chips').addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (chip) withTransition(function () { setCat(chip.dataset.cat); });
    });
    $('only-sale').addEventListener('change', function (e) {
        withTransition(function () {
            state.onlySale = e.target.checked;
            resetPage();
            renderProducts();
        });
    });
    $('only-stock').addEventListener('change', function (e) {
        withTransition(function () {
            state.onlyStock = e.target.checked;
            resetPage();
            renderProducts();
        });
    });
    $('fav-open').addEventListener('click', function () { goToShop('fav'); });
    $('coupon-apply').addEventListener('click', applyCoupon);
    $('coupon-input').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyCoupon();
        }
    });
    window.addEventListener('hashchange', route);

    var navCats = $('nav-cats');
    $('nav-cats-btn').addEventListener('click', function () {
        var open = navCats.classList.toggle('open');
        this.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
        if (!navCats.contains(e.target) || e.target.closest('.mega a')) {
            navCats.classList.remove('open');
            $('nav-cats-btn').setAttribute('aria-expanded', 'false');
        }
    });

    $('cart-open').addEventListener('click', openCart);
    $('cart-close').addEventListener('click', closeCart);
    $('overlay').addEventListener('click', closeCart);
    document.querySelectorAll('[data-close-cart]').forEach(function (b) {
        b.addEventListener('click', closeCart);
    });
    $('checkout-start').addEventListener('click', function () {
        trackEvent('begin_checkout', cartItems());
        showView('checkout-view');
        $('co-name').focus();
    });
    $('checkout-back').addEventListener('click', function () { showView('cart-view'); });
    $('checkout-view').addEventListener('change', updateTotals);
    $('checkout-view').addEventListener('submit', submitOrder);

    $('modal-close').addEventListener('click', closeModal);
    $('product-modal').addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });

    document.addEventListener('keydown', function (e) {
        var modalOpen = !$('product-modal').hidden;
        if (modalOpen && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.getAttribute('role') !== 'tab') {
            goToSlide(gallery.index + (e.key === 'ArrowRight' ? 1 : -1));
            return;
        }
        if (e.key !== 'Escape') return;
        if (!$('book-modal').hidden) closeBooking();
        else if (!$('track-modal').hidden) closeTracking();
        else if (modalOpen) closeModal();
        else if ($('cart').classList.contains('open')) closeCart();
    });

    $('track-form').addEventListener('submit', searchTracking);
    $('book-form').addEventListener('submit', submitBooking);
    $('book-day').addEventListener('change', loadSlots);
    $('book-close').addEventListener('click', closeBooking);
    $('book-modal').addEventListener('click', function (e) {
        if (e.target === this) closeBooking();
    });
    $('track-close').addEventListener('click', closeTracking);
    $('track-modal').addEventListener('click', function (e) {
        if (e.target === this) closeTracking();
    });
    $('done-track').addEventListener('click', function () { closeCart(); });

    $('pm-prev').addEventListener('click', function () { goToSlide(gallery.index - 1); });
    $('pm-next').addEventListener('click', function () { goToSlide(gallery.index + 1); });
    var stageTimer = null;
    $('pm-stage').addEventListener('scroll', function () {
        clearTimeout(stageTimer);
        stageTimer = setTimeout(function () {
            var stage = $('pm-stage');
            var i = Math.round(stage.scrollLeft / Math.max(stage.clientWidth, 1));
            if (i !== gallery.index) {
                gallery.index = i;
                updateGalleryUI();
            }
        }, 80);
    }, { passive: true });

    window.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEY) {
            cart = loadCart();
            renderCart();
        } else if (e.key === FAVS_KEY) {
            favs = loadList(FAVS_KEY);
            renderFavCount();
            renderProducts();
        }
    });

    function setupFinder() {
        fillBrandSelect();
        fillSelect($('fit-type'), 'Tipo', uniq(vehicles.map(function (v) { return v.type; })).map(function (t) { return [t, t]; }));
        updateFitBrands();
    }

    /* ===== APP INSTALABLE ===== */
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function () { /* el sitio funciona igual */ });
        });
    }
    var installEvent = null;
    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        installEvent = e;
        $('install-app').hidden = false;
    });
    $('install-app').addEventListener('click', function () {
        if (!installEvent) return;
        installEvent.prompt();
        installEvent.userChoice.then(function () {
            installEvent = null;
            $('install-app').hidden = true;
        });
    });
    window.addEventListener('appinstalled', function () { $('install-app').hidden = true; });

    setupFinder();
    var savedMoto = '';
    try { savedMoto = localStorage.getItem(MOTO_KEY) || ''; } catch (e) { /* sin almacenamiento */ }
    if (vehicleById[savedMoto]) {
        state.vehicle = savedMoto;
        $('fit-current').hidden = false;
        $('fit-current-name').textContent = vehicleName(savedMoto);
    }
    renderKit();

    renderProducts();
    renderCart();
    renderFavCount();
    renderRecent();
    renderMegaMenu();
    // Direcciones indexables (/productos/<id>, /categoria/<cat>/<sub>): la tienda sigue
    // funcionando con su navegación interna, así que se traducen al formato con #.
    (function pathToHash() {
        var m = /^\/(productos|categoria)\/(.+?)\/?$/.exec(location.pathname);
        if (!m) return;
        var parts = m[2].split('/');
        var hash = m[1] === 'productos' ? '#p/' + parts[0] : '#c/' + parts.slice(0, 2).join('/');
        history.replaceState(null, '', '/' + location.search + (location.hash || hash));
    })();
    route();
    loadRemoteCatalog();
    setTimeout(checkMyOrders, 1500);
})();

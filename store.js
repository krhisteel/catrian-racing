(function () {
    var WHATSAPP = '56936621284';
    var FREE_SHIPPING_FROM = 100000;
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
            id: 'neumatico', name: 'Neumático', cat: 'Repuestos', sub: 'Neumáticos', brand: 'Dunlop', price: 69990, stock: 9, freeShip: true,
            img: 'img/productos/neumatico.svg', images: ['img/productos/neumatico.svg', 'img/productos/neumatico-2.svg'],
            desc: 'Calle, pista y off-road. Todas las marcas.',
            options: { name: 'Medida', values: ['110/70-17', '140/70-17', '90/90-21', '120/80-18'] }
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
            id: 'casco', name: 'Casco integral', cat: 'Equipamiento', brand: 'LS2', price: 129990, compare: 159990, stock: 5, freeShip: true,
            img: 'img/productos/casco.svg', images: ['img/productos/casco.svg', 'img/productos/casco-2.svg'],
            desc: 'Certificación DOT/ECE, visor antiempañante.',
            options: { name: 'Talla', values: ['S', 'M', 'L', 'XL'] }
        },
        {
            id: 'chaqueta', name: 'Chaqueta con protecciones', cat: 'Equipamiento', brand: 'Alpinestars', price: 149990, stock: 4, badge: 'Nuevo', freeShip: true,
            img: 'img/productos/chaqueta.svg', images: ['img/productos/chaqueta.svg', 'img/productos/chaqueta-2.svg'],
            desc: 'Textil ventilada con protecciones en codos y hombros.',
            options: { name: 'Talla', values: ['S', 'M', 'L', 'XL'] }
        },
        {
            id: 'guantes', name: 'Guantes racing', cat: 'Equipamiento', brand: 'Alpinestars', price: 29990, stock: 12,
            img: 'img/productos/guantes.svg', images: ['img/productos/guantes.svg', 'img/productos/guantes-2.svg'],
            desc: 'Cuero con refuerzos en nudillos y palma.',
            options: { name: 'Talla', values: ['S', 'M', 'L', 'XL'] }
        },
        {
            id: 'candado', name: 'Candado de disco', cat: 'Accesorios', brand: 'Kovix', price: 24990, stock: 2,
            img: 'img/productos/candado.svg', images: ['img/productos/candado.svg', 'img/productos/candado-2.svg'],
            desc: 'Acero reforzado con alarma de 110 dB.'
        },
        {
            id: 'escape', name: 'Escape deportivo', cat: 'Accesorios', brand: 'Akrapovič', price: 189990, stock: 0,
            img: 'img/productos/escape.svg', images: ['img/productos/escape.svg', 'img/productos/escape-2.svg'],
            desc: 'Silenciador de acero inoxidable, sonido racing.',
            fits: ['kawasaki-ninja400', 'ktm-duke390', 'yamaha-fz25']
        },
        {
            id: 'soporte-celular', name: 'Soporte de celular', cat: 'Accesorios', brand: 'Quad Lock', price: 14990, compare: 18990, stock: 20,
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

    var state = { cat: 'all', sub: '', brand: '', vehicle: '', query: '', sort: 'featured', onlySale: false, onlyStock: false, coupon: null, couponPercent: 0, limit: PAGE_SIZE };
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
        body.appendChild(el('span', 'product-cat', [p.sub || p.cat, p.brand].filter(Boolean).join(' · ')));
        body.appendChild(el('h3', '', p.name));
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

    function renderSubChips() {
        var wrap = $('shop-subs');
        var subs = [];
        products.forEach(function (p) {
            if (p.sub && p.cat === 'Repuestos' && subs.indexOf(p.sub) === -1) subs.push(p.sub);
        });
        wrap.hidden = state.cat !== 'Repuestos';
        if (wrap.hidden || wrap.childElementCount) {
            wrap.querySelectorAll('.chip').forEach(function (c) {
                var on = c.dataset.sub === state.sub;
                c.classList.toggle('active', on);
                c.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            return;
        }
        [''].concat(subs).forEach(function (sub) {
            var c = el('button', 'chip chip-sub', sub || 'Todos los repuestos');
            c.type = 'button';
            c.dataset.sub = sub;
            c.classList.toggle('active', sub === state.sub);
            c.addEventListener('click', function () {
                withTransition(function () {
                    state.sub = sub;
                    resetPage();
                    renderProducts();
                });
            });
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
        setCat(cat);
        $('tienda').scrollIntoView();
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
                    p.freeShip ? 'Este producto tiene despacho gratis.' : 'Envío gratis en compras sobre ' + money(FREE_SHIPPING_FROM) + '; bajo ese monto se cotiza según tu comuna.',
                    'Retiro gratis en tienda de lunes a viernes de 9:00 a 19:00 y sábados de 10:00 a 14:00.',
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
    }

    function openModal(id) {
        var p = byId[id];
        var modal = $('product-modal');

        // Ruta
        var crumbs = $('pm-crumbs');
        crumbs.textContent = '';
        [['Tienda', 'all'], [p.cat, p.cat]].forEach(function (c) {
            var b = el('button', 'crumb', c[0]);
            b.type = 'button';
            b.addEventListener('click', function () {
                closeModal();
                goToShop(c[1]);
            });
            crumbs.appendChild(b);
            crumbs.appendChild(el('span', 'crumb-sep', '›'));
        });
        if (p.sub) {
            crumbs.appendChild(el('span', 'crumb', p.sub));
            crumbs.appendChild(el('span', 'crumb-sep', '›'));
        }
        crumbs.appendChild(el('span', 'crumb current', p.name));

        renderGallery(p);

        $('pm-brand').textContent = p.brand || p.cat;
        $('pm-sku').textContent = 'Código: ' + skuOf(p);
        $('pm-title').textContent = p.name;

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
                var b = el('button', 'option', value);
                b.type = 'button';
                b.setAttribute('role', 'radio');
                b.setAttribute('aria-checked', 'false');
                b.addEventListener('click', function () {
                    selected = value;
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
                qty = Math.min(p.stock || 99, qty + 1);
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
        if (location.hash !== '#p/' + p.id) history.replaceState(null, '', '#p/' + p.id);
    }

    function closeModal() {
        $('product-modal').hidden = true;
        if (!$('cart').classList.contains('open')) document.body.classList.remove('locked');
        if (/^#p\//.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
        if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    }

    function shareProduct(p) {
        var url = location.href.split('#')[0] + '#p/' + p.id;
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
        if (line) line.qty = Math.min(p.stock || 99, line.qty + qty);
        else cart.push({ id: id, option: option, qty: Math.min(p.stock || 99, qty) });
        saveCart();
        renderCart();
        toast(p.name + (option ? ' (' + option + ')' : '') + ' agregado al carro');
        var badge = $('cart-count');
        badge.classList.remove('bump');
        void badge.offsetWidth;
        badge.classList.add('bump');
    }

    function setQty(index, qty) {
        var line = cart[index];
        if (qty <= 0) cart.splice(index, 1);
        else line.qty = Math.min(byId[line.id].stock || 99, qty);
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

    function shippingCost() {
        var form = $('checkout-view');
        if (form.delivery.value !== 'despacho') return 0;
        return cartSubtotal() >= FREE_SHIPPING_FROM ? 0 : null;
    }

    function couponDiscount() {
        return state.coupon ? Math.round(cartSubtotal() * state.couponPercent / 100) : 0;
    }

    function applyCoupon() {
        var input = $('coupon-input');
        var code = input.value.trim().toUpperCase();
        var msg = $('coupon-msg');
        if (!code) return;
        msg.className = 'coupon-msg';
        msg.textContent = 'Validando cupón...';
        rpc('validate_coupon', { p_code: code }).then(function (percent) {
            if (percent) {
                state.coupon = code;
                state.couponPercent = percent;
                msg.textContent = 'Cupón ' + code + ' aplicado: ' + percent + '% de descuento.';
                msg.className = 'coupon-msg ok';
            } else {
                state.coupon = null;
                state.couponPercent = 0;
                msg.textContent = 'El cupón no es válido.';
            }
            updateTotals();
        }, function () {
            state.coupon = null;
            state.couponPercent = 0;
            msg.textContent = 'No pudimos validar el cupón ahora. Escríbelo en las notas del pedido.';
            updateTotals();
        });
    }

    function updateTotals() {
        var form = $('checkout-view');
        var subtotal = cartSubtotal();
        var discountValue = couponDiscount();
        var shipping = shippingCost();
        var free = subtotal >= FREE_SHIPPING_FROM;
        $('ship-label').textContent = free ? 'Gratis' : 'A cotizar';
        $('ship-fields').hidden = form.delivery.value !== 'despacho';
        $('co-subtotal').textContent = money(subtotal);
        $('co-discount-row').hidden = !discountValue;
        $('co-discount').textContent = '−' + money(discountValue);
        $('co-shipping').textContent = shipping === null ? 'A cotizar' : 'Gratis';
        $('co-total').textContent = money(subtotal - discountValue) + (shipping === null ? ' + envío' : '');
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
        error.textContent = '';

        var data = {
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

        // Se abre la pestaña ahora (con el clic) para que el navegador no la bloquee.
        var win = window.open('', '_blank');
        submit.disabled = true;
        submit.textContent = 'Enviando pedido...';

        rpc('place_order', {
            p_items: cart.map(function (line) { return { id: line.id, option: line.option, qty: line.qty }; }),
            p_name: data.name, p_phone: data.phone, p_email: data.email, p_delivery: data.delivery,
            p_region: data.region, p_commune: data.commune, p_address: data.address,
            p_payment: data.payment, p_notes: data.notes, p_coupon: state.coupon || ''
        }).then(function (order) {
            finishOrder(win, data, order);
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
                shipping_pending: shippingCost() === null,
                total: subtotal - discountValue
            });
        });
    }

    function resetSubmit(submit) {
        submit.disabled = false;
        submit.textContent = 'Enviar pedido por WhatsApp';
    }

    function finishOrder(win, data, order) {
        var lines = ['Hola Catrian Racing! Quiero hacer este pedido (' + order.ref + '):', ''];
        order.items.forEach(function (item) {
            lines.push('• ' + item.qty + ' x ' + item.name + (item.option ? ' (' + item.option + ')' : '') + ' — ' + money(item.price * item.qty));
        });
        lines.push('');
        lines.push('Subtotal: ' + money(order.subtotal));
        if (order.discount) lines.push('Cupón ' + order.coupon + ': −' + money(order.discount));
        lines.push('Envío: ' + (data.delivery === 'retiro' ? 'Retiro en tienda' : (order.shipping_pending ? 'A cotizar' : 'Gratis')));
        lines.push('Total: ' + money(order.total) + (order.shipping_pending ? ' + envío' : ''));
        lines.push('');
        lines.push('Nombre: ' + data.name);
        lines.push('Teléfono: ' + data.phone);
        if (data.email) lines.push('Email: ' + data.email);
        if (data.delivery === 'despacho') {
            lines.push('Dirección: ' + data.address + ', ' + data.commune + ', ' + data.region);
        }
        lines.push('Pago: ' + data.payment);
        if (data.notes) lines.push('Notas: ' + data.notes);

        var url = waUrl(lines.join('\n'));
        if (win && !win.closed) win.location.href = url;
        else window.open(url, '_blank');

        var form = $('checkout-view');
        cart = [];
        saveCart();
        renderCart();
        form.reset();
        state.coupon = null;
        state.couponPercent = 0;
        $('coupon-msg').textContent = '';
        resetSubmit(form.querySelector('button[type="submit"]'));
        updateTotals();
        $('done-ref').textContent = order.ref;
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

    function applySettings(rows) {
        rows.forEach(function (row) {
            if (row.key === 'whatsapp' && row.value) WHATSAPP = String(row.value).replace(/\D/g, '');
            if (row.key === 'free_shipping_from' && row.value >= 0) FREE_SHIPPING_FROM = Number(row.value);
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
            if (res[1] && res[1].length) vehicles = res[1];
            indexCatalog();
            applySettings(res[2] || []);
            cart = loadCart();
            favs = loadList(FAVS_KEY);
            recent = loadList(RECENT_KEY);
            if (state.vehicle && !vehicleById[state.vehicle]) setVehicle('');
            setupFinder();
            renderProducts();
            renderCart();
            renderFavCount();
            renderRecent();
            if ($('product-modal').hidden) openFromHash();
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
    document.querySelectorAll('[data-collection]').forEach(function (b) {
        b.addEventListener('click', function () { goToShop(b.dataset.collection); });
    });
    $('fav-open').addEventListener('click', function () { goToShop('fav'); });
    $('coupon-apply').addEventListener('click', applyCoupon);
    $('coupon-input').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyCoupon();
        }
    });
    window.addEventListener('hashchange', openFromHash);

    $('cart-open').addEventListener('click', openCart);
    $('cart-close').addEventListener('click', closeCart);
    $('overlay').addEventListener('click', closeCart);
    document.querySelectorAll('[data-close-cart]').forEach(function (b) {
        b.addEventListener('click', closeCart);
    });
    $('checkout-start').addEventListener('click', function () {
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
        if (modalOpen) closeModal();
        else if ($('cart').classList.contains('open')) closeCart();
    });

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

    setupFinder();
    var savedMoto = '';
    try { savedMoto = localStorage.getItem(MOTO_KEY) || ''; } catch (e) { /* sin almacenamiento */ }
    if (vehicleById[savedMoto]) {
        state.vehicle = savedMoto;
        $('fit-current').hidden = false;
        $('fit-current-name').textContent = vehicleName(savedMoto);
    }

    renderProducts();
    renderCart();
    renderFavCount();
    renderRecent();
    openFromHash();
    loadRemoteCatalog();
})();

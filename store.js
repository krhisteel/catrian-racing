(function () {
    var WHATSAPP = '56936621284';
    var FREE_SHIPPING_FROM = 100000;
    var STORAGE_KEY = 'catrian-cart';
    var FAVS_KEY = 'catrian-favs';
    var RECENT_KEY = 'catrian-recent';

    // Cupones de descuento: código → % de descuento sobre el subtotal.
    var COUPONS = { BIENVENIDA10: 10, RACING15: 15 };

    // Catálogo: edita aquí precios, stock, fotos y variantes.
    // quote: true → el producto se cotiza por WhatsApp en vez de ir al carro.
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
            id: 'kit-arrastre', name: 'Kit de arrastre', cat: 'Repuestos', price: 24990, stock: 14,
            img: 'https://live.staticflickr.com/4044/4381533356_0afbaa8402_b.jpg',
            desc: 'Cadena, piñón y catalina de acero templado.',
            options: { name: 'Paso de cadena', values: ['428', '520', '525'] }
        },
        {
            id: 'neumatico', name: 'Neumático', cat: 'Repuestos', price: 69990, stock: 9,
            img: 'https://live.staticflickr.com/8203/8191327093_438c1d7f25_b.jpg',
            desc: 'Calle, pista y off-road. Todas las marcas.',
            options: { name: 'Medida', values: ['110/70-17', '140/70-17', '90/90-21', '120/80-18'] }
        },
        {
            id: 'bateria', name: 'Batería 12V', cat: 'Repuestos', price: 34990, stock: 6,
            img: 'https://live.staticflickr.com/1478/24128240646_13f2c61d80_b.jpg',
            desc: 'Batería sellada libre de mantención.',
            specs: [['Voltaje', '12 V'], ['Capacidad', '7 Ah']]
        },
        {
            id: 'filtro-aceite', name: 'Filtro de aceite', cat: 'Repuestos', price: 8990, compare: 11990, stock: 30,
            img: 'https://loremflickr.com/600/450/motorcycle,engine?lock=21',
            desc: 'Filtro de alto flujo para mantención periódica.'
        },
        {
            id: 'pastillas', name: 'Pastillas de freno', cat: 'Repuestos', price: 19990, stock: 3,
            img: 'https://loremflickr.com/600/450/motorcycle,brake?lock=22',
            desc: 'Compuesto sinterizado para calle y pista.',
            options: { name: 'Posición', values: ['Delantera', 'Trasera'] }
        },
        {
            id: 'aceite', name: 'Aceite 10W-40 4L', cat: 'Repuestos', price: 39990, stock: 18, badge: 'Más vendido',
            img: 'https://loremflickr.com/600/450/motor,oil?lock=23',
            desc: 'Aceite semisintético para motores 4T.'
        },
        {
            id: 'casco', name: 'Casco integral', cat: 'Equipamiento', price: 129990, compare: 159990, stock: 5,
            img: 'https://loremflickr.com/600/450/motorcycle,helmet?lock=24',
            desc: 'Certificación DOT/ECE, visor antiempañante.',
            options: { name: 'Talla', values: ['S', 'M', 'L', 'XL'] }
        },
        {
            id: 'chaqueta', name: 'Chaqueta con protecciones', cat: 'Equipamiento', price: 149990, stock: 4, badge: 'Nuevo',
            img: 'https://loremflickr.com/600/450/motorcycle,jacket?lock=25',
            desc: 'Textil ventilada con protecciones en codos y hombros.',
            options: { name: 'Talla', values: ['S', 'M', 'L', 'XL'] }
        },
        {
            id: 'guantes', name: 'Guantes racing', cat: 'Equipamiento', price: 29990, stock: 12,
            img: 'https://loremflickr.com/600/450/motorcycle,gloves?lock=26',
            desc: 'Cuero con refuerzos en nudillos y palma.',
            options: { name: 'Talla', values: ['S', 'M', 'L', 'XL'] }
        },
        {
            id: 'candado', name: 'Candado de disco', cat: 'Accesorios', price: 24990, stock: 2,
            img: 'https://loremflickr.com/600/450/motorcycle,lock?lock=27',
            desc: 'Acero reforzado con alarma de 110 dB.'
        },
        {
            id: 'escape', name: 'Escape deportivo', cat: 'Accesorios', price: 189990, stock: 0,
            img: 'https://loremflickr.com/600/450/motorcycle,exhaust?lock=29',
            desc: 'Silenciador de acero inoxidable, sonido racing.'
        },
        {
            id: 'soporte-celular', name: 'Soporte de celular', cat: 'Accesorios', price: 14990, compare: 18990, stock: 20,
            img: 'https://loremflickr.com/600/450/motorcycle,handlebar?lock=28',
            desc: 'Montaje a manubrio con amortiguación de vibraciones.'
        }
    ];

    var byId = {};
    products.forEach(function (p, i) {
        p.order = i;
        byId[p.id] = p;
    });

    var state = { cat: 'all', query: '', sort: 'featured', onlySale: false, onlyStock: false, coupon: null };
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

    function productImage(p, parent) {
        var img = document.createElement('img');
        img.src = p.img;
        img.alt = p.name;
        img.loading = 'lazy';
        img.onerror = function () { img.remove(); };
        parent.appendChild(img);
    }

    /* ===== CATÁLOGO ===== */
    function visibleProducts() {
        var q = normalize(state.query.trim());
        var list = products.filter(function (p) {
            if (state.cat === 'fav' && !isFav(p.id)) return false;
            if (state.cat !== 'all' && state.cat !== 'fav' && p.cat !== state.cat) return false;
            if (state.onlySale && !p.compare) return false;
            if (state.onlyStock && soldOut(p)) return false;
            return !q || normalize(p.name + ' ' + p.desc + ' ' + p.cat).indexOf(q) !== -1;
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
        var card = el('article', 'card product' + (soldOut(p) ? ' sold-out' : ''));

        var media = el('button', 'card-media product-media');
        media.type = 'button';
        media.setAttribute('aria-label', 'Ver ' + p.name);
        media.addEventListener('click', function () { openModal(p.id); });
        productImage(p, media);
        if (soldOut(p)) media.appendChild(el('span', 'card-media-tag tag-out', 'Agotado'));
        else if (p.compare) media.appendChild(el('span', 'card-media-tag tag-sale', '-' + discount(p) + '%'));
        else if (p.badge) media.appendChild(el('span', 'card-media-tag', p.badge));
        else if (p.quote) media.appendChild(el('span', 'card-media-tag', 'Disponible'));
        if (p.cc) media.appendChild(el('span', 'card-media-number', String(p.cc)));
        media.appendChild(el('span', 'quick-view', 'Vista rápida'));
        card.appendChild(media);
        card.appendChild(favButton(p));

        var body = el('div', 'card-body');
        body.appendChild(el('span', 'product-cat', p.cat));
        body.appendChild(el('h3', '', p.name));
        body.appendChild(el('p', 'card-desc', p.desc));
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
        list.forEach(function (p) { grid.appendChild(productCard(p)); });
        $('shop-count').textContent = list.length + (list.length === 1 ? ' producto' : ' productos');
        var empty = $('shop-empty');
        empty.hidden = list.length > 0;
        empty.textContent = state.cat === 'fav' && !favs.length
            ? 'Aún no guardas favoritos. Toca el corazón de un producto para guardarlo.'
            : 'No encontramos productos con esos filtros.';
    }

    function setCat(cat) {
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
    function openModal(id) {
        var p = byId[id];
        var modal = $('product-modal');

        var media = $('pm-media');
        media.textContent = '';
        productImage(p, media);

        $('pm-cat').textContent = p.cat;
        $('pm-title').textContent = p.name;
        var price = $('pm-price');
        price.textContent = '';
        price.appendChild(priceRow(p));
        if (p.compare) price.appendChild(el('span', 'save-tag', 'Ahorras ' + money(p.compare - p.price)));
        $('pm-desc').textContent = p.desc;

        var specs = $('pm-specs');
        specs.textContent = '';
        (p.specs || []).forEach(function (s) {
            var li = el('li', '', s[0] + ' ');
            li.appendChild(el('span', '', s[1]));
            specs.appendChild(li);
        });
        specs.hidden = !p.specs;

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
        buy.textContent = '';
        if (p.quote) {
            buy.appendChild(externalLink('btn btn-primary btn-block', 'Cotizar por WhatsApp', quoteUrl(p)));
        } else if (soldOut(p)) {
            buy.appendChild(externalLink('btn btn-ghost btn-block', 'Avísame cuando llegue', notifyUrl(p)));
        } else {
            var qty = 1;
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
                if (p.options && !selected) {
                    $('pm-error').textContent = 'Elige una opción de ' + p.options.name.toLowerCase() + '.';
                    return;
                }
                addToCart(p.id, selected, qty);
                closeModal();
            });
            buy.appendChild(stepper);
            buy.appendChild(add);
            buy.appendChild(el('p', 'form-error', ''));
            buy.lastChild.id = 'pm-error';
        }

        $('pm-stock').textContent = p.quote ? 'Financiamiento y entrega a coordinar.' : (p.stock > 0 ? 'En stock · Despacho en 24–48 h hábiles' : 'Agotado por ahora');

        var tools = $('pm-tools');
        tools.textContent = '';
        var fav = favButton(p);
        fav.classList.add('fav-inline');
        tools.appendChild(fav);
        var share = el('button', 'share-btn', 'Compartir');
        share.type = 'button';
        share.addEventListener('click', function () { shareProduct(p); });
        tools.appendChild(share);

        var related = $('pm-related');
        related.textContent = '';
        var others = products.filter(function (o) { return o.cat === p.cat && o.id !== p.id; }).slice(0, 3);
        if (others.length) {
            related.appendChild(el('p', 'option-label', 'También te puede interesar'));
            others.forEach(function (o) { related.appendChild(miniCard(o)); });
        }

        if (modal.hidden) {
            lastFocus = document.activeElement;
            modal.hidden = false;
            document.body.classList.add('locked');
        }
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
        return state.coupon ? Math.round(cartSubtotal() * COUPONS[state.coupon] / 100) : 0;
    }

    function applyCoupon() {
        var input = $('coupon-input');
        var code = input.value.trim().toUpperCase();
        var msg = $('coupon-msg');
        if (!code) return;
        if (COUPONS[code]) {
            state.coupon = code;
            msg.textContent = 'Cupón ' + code + ' aplicado: ' + COUPONS[code] + '% de descuento.';
            msg.className = 'coupon-msg ok';
        } else {
            state.coupon = null;
            msg.textContent = 'El cupón no es válido.';
            msg.className = 'coupon-msg';
        }
        updateTotals();
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

        var ref = 'CR-' + Date.now().toString(36).toUpperCase().slice(-6);
        var subtotal = cartSubtotal();
        var discountValue = couponDiscount();
        var shipping = shippingCost();
        var lines = ['Hola Catrian Racing! Quiero hacer este pedido (' + ref + '):', ''];
        cart.forEach(function (line) {
            var p = byId[line.id];
            lines.push('• ' + line.qty + ' x ' + p.name + (line.option ? ' (' + line.option + ')' : '') + ' — ' + money(p.price * line.qty));
        });
        lines.push('');
        lines.push('Subtotal: ' + money(subtotal));
        if (discountValue) lines.push('Cupón ' + state.coupon + ': −' + money(discountValue));
        lines.push('Envío: ' + (delivery === 'retiro' ? 'Retiro en tienda' : (shipping === null ? 'A cotizar' : 'Gratis')));
        lines.push('Total: ' + money(subtotal - discountValue) + (shipping === null ? ' + envío' : ''));
        lines.push('');
        lines.push('Nombre: ' + name);
        lines.push('Teléfono: ' + phone);
        if (form.email.value.trim()) lines.push('Email: ' + form.email.value.trim());
        if (delivery === 'despacho') {
            lines.push('Dirección: ' + form.address.value.trim() + ', ' + form.commune.value.trim() + ', ' + form.region.value);
        }
        lines.push('Pago: ' + form.payment.value);
        if (form.notes.value.trim()) lines.push('Notas: ' + form.notes.value.trim());

        window.open(waUrl(lines.join('\n')), '_blank');

        cart = [];
        saveCart();
        renderCart();
        form.reset();
        state.coupon = null;
        $('coupon-msg').textContent = '';
        updateTotals();
        $('done-ref').textContent = ref;
        showView('done-view');
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
        renderProducts();
    });
    $('shop-sort').addEventListener('change', function (e) {
        state.sort = e.target.value;
        renderProducts();
    });
    $('shop-chips').addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (chip) setCat(chip.dataset.cat);
    });
    $('only-sale').addEventListener('change', function (e) {
        state.onlySale = e.target.checked;
        renderProducts();
    });
    $('only-stock').addEventListener('change', function (e) {
        state.onlyStock = e.target.checked;
        renderProducts();
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
        if (e.key !== 'Escape') return;
        if (!$('product-modal').hidden) closeModal();
        else if ($('cart').classList.contains('open')) closeCart();
    });

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

    renderProducts();
    renderCart();
    renderFavCount();
    renderRecent();
    openFromHash();
})();

(function () {
    var DB = window.CATRIAN_SUPABASE;
    var SESSION_KEY = 'catrian-admin-session';
    // Cada usuario del panel es una cuenta interna <usuario>@admin.catrianracing.cl (no recibe correos).
    var USER_DOMAIN = '@admin.catrianracing.cl';
    var USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;
    var BUCKET = 'productos';
    var CATS = ['Motos', 'Repuestos', 'Accesorios', 'Equipamiento'];
    var STATUSES = [
        ['nuevo', 'Nuevo'],
        ['confirmado', 'Confirmado'],
        ['pagado', 'Pagado'],
        ['enviado', 'Enviado'],
        ['entregado', 'Entregado'],
        ['cancelado', 'Cancelado']
    ];
    var SOLD = ['confirmado', 'pagado', 'enviado', 'entregado'];

    var session = null;
    var data = { products: [], vehicles: [], coupons: [], settings: {}, orders: [], admins: [] };
    var view = { tab: 'resumen', orderStatus: '', orderQuery: '', productQuery: '', productCat: '', productLow: false };
    var pollTimer = null;
    var lastFocus = null;

    /* ===== UTILIDADES ===== */
    function $(id) {
        return document.getElementById(id);
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    }

    function money(n) {
        return '$' + Math.round(n || 0).toLocaleString('es-CL');
    }

    function fmtDate(iso) {
        var d = new Date(iso);
        return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) + ' ' +
            d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    }

    function statusLabel(status) {
        var found = STATUSES.filter(function (s) { return s[0] === status; })[0];
        return found ? found[1] : status;
    }

    function slugify(text) {
        return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'item';
    }

    function normalize(text) {
        return (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    var toastTimer = null;
    function toast(message, isError) {
        var t = $('toast');
        t.textContent = message;
        t.classList.toggle('toast-error', !!isError);
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3000);
    }

    function button(text, className, onClick) {
        var b = el('button', className, text);
        b.type = 'button';
        if (onClick) b.addEventListener('click', onClick);
        return b;
    }

    function field(labelText, input) {
        var wrap = el('div', 'form-field');
        var label = el('label', '', labelText);
        if (!input.id) input.id = 'f-' + Math.random().toString(36).slice(2, 9);
        label.htmlFor = input.id;
        wrap.appendChild(label);
        wrap.appendChild(input);
        return wrap;
    }

    function input(type, value, attrs) {
        var i = el(type === 'textarea' ? 'textarea' : 'input', 'admin-input');
        if (type !== 'textarea') i.type = type;
        if (value !== undefined && value !== null) i.value = value;
        Object.keys(attrs || {}).forEach(function (k) { i.setAttribute(k, attrs[k]); });
        return i;
    }

    function select(options, value) {
        var s = el('select', 'admin-input');
        options.forEach(function (o) {
            var opt = el('option', '', Array.isArray(o) ? o[1] : o);
            opt.value = Array.isArray(o) ? o[0] : o;
            s.appendChild(opt);
        });
        if (value !== undefined && value !== null) s.value = value;
        return s;
    }

    function waPhone(phone) {
        var digits = (phone || '').replace(/\D/g, '');
        if (digits.length === 9 && digits.charAt(0) === '9') digits = '56' + digits;
        return digits;
    }

    /* ===== SESIÓN Y API ===== */
    function saveSession(s) {
        session = s;
        try {
            if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
            else localStorage.removeItem(SESSION_KEY);
        } catch (e) { /* sin almacenamiento: la sesión dura mientras la página esté abierta */ }
    }

    function loadSession() {
        try {
            var s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
            if (s && s.access_token && s.refresh_token) session = s;
        } catch (e) { session = null; }
    }

    function withExpiry(s) {
        if (!s.expires_at) s.expires_at = Math.floor(Date.now() / 1000) + (s.expires_in || 3600);
        return s;
    }

    async function raw(path, options) {
        options = options || {};
        var headers = Object.assign({ apikey: DB.key }, options.headers || {});
        var body = options.body;
        if (body !== undefined && !(body instanceof Blob) && typeof body !== 'string') {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(body);
        }
        if (options.auth !== false && session) headers.Authorization = 'Bearer ' + session.access_token;
        var res;
        try {
            res = await fetch(DB.url + path, { method: options.method || 'GET', headers: headers, body: body });
        } catch (e) {
            throw Object.assign(new Error('No hay conexión con la base de datos.'), { status: 0 });
        }
        var text = await res.text();
        var parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }
        if (!res.ok) {
            var msg = parsed && (parsed.msg || parsed.message || parsed.error_description || parsed.error) || ('Error ' + res.status);
            throw Object.assign(new Error(translateError(msg)), { status: res.status });
        }
        return parsed;
    }

    function translateError(msg) {
        var map = {
            'Invalid login credentials': 'Usuario o contraseña incorrectos.',
            'User is banned': 'Este usuario fue desactivado. Pide a otro administrador que lo reactive.',
            'Password should be at least 6 characters.': 'La contraseña debe tener al menos 8 caracteres.'
        };
        return map[msg] || msg;
    }

    function cleanUsername(value) {
        return (value || '').trim().toLowerCase();
    }

    function usernameOf(email) {
        return (email || '').replace(USER_DOMAIN, '');
    }

    async function ensureFresh() {
        if (!session || session.expires_at * 1000 - 60000 > Date.now()) return;
        try {
            var s = await raw('/auth/v1/token?grant_type=refresh_token', {
                method: 'POST', auth: false, body: { refresh_token: session.refresh_token }
            });
            saveSession(withExpiry(s));
        } catch (e) {
            saveSession(null);
            showAuth('login-form', 'Tu sesión expiró. Ingresa nuevamente.');
            throw e;
        }
    }

    async function api(path, options) {
        await ensureFresh();
        try {
            return await raw(path, options);
        } catch (e) {
            if (e.status === 401) {
                saveSession(null);
                showAuth('login-form', 'Tu sesión expiró. Ingresa nuevamente.');
            }
            throw e;
        }
    }

    /* ===== ACCESO ===== */
    function showAuth(formId, message, isOk) {
        clearInterval(pollTimer);
        $('app').hidden = true;
        $('auth-view').hidden = false;
        ['login-form', 'activate-form', 'denied'].forEach(function (id) {
            $(id).hidden = id !== formId;
        });
        var msg = $('auth-msg');
        msg.textContent = message || '';
        msg.classList.toggle('ok', !!isOk);
        var first = $(formId).querySelector('input');
        if (first) first.focus();
    }

    function busy(form, on) {
        var b = form.querySelector('button[type="submit"]');
        if (!b) return;
        if (on) {
            b.dataset.label = b.textContent;
            b.textContent = 'Un momento...';
        } else if (b.dataset.label) {
            b.textContent = b.dataset.label;
        }
        b.disabled = on;
    }

    async function signIn(username, password) {
        var s = await raw('/auth/v1/token?grant_type=password', {
            method: 'POST', auth: false, body: { email: username + USER_DOMAIN, password: password }
        });
        saveSession(withExpiry(s));
        await enterApp();
    }

    async function onLogin(e) {
        e.preventDefault();
        var form = e.target;
        var username = cleanUsername(form.username.value);
        var password = form.password.value;
        if (!username || !password) return showAuth('login-form', 'Escribe tu usuario y contraseña.');
        if (!USERNAME_RE.test(username)) return showAuth('login-form', 'Usuario o contraseña incorrectos.');
        busy(form, true);
        try {
            await signIn(username, password);
            form.reset();
        } catch (err) {
            showAuth('login-form', err.message);
        }
        busy(form, false);
    }

    async function onActivate(e) {
        e.preventDefault();
        var form = e.target;
        var code = form.code.value.trim().toUpperCase();
        var username = cleanUsername(form.username.value);
        var password = form.password.value;
        if (!code) return showAuth('activate-form', 'Escribe tu código de activación.');
        if (!USERNAME_RE.test(username)) return showAuth('activate-form', 'El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo, sin espacios.');
        if (password.length < 8) return showAuth('activate-form', 'La contraseña debe tener al menos 8 caracteres.');
        if (password !== form.password2.value) return showAuth('activate-form', 'Las contraseñas no coinciden.');
        busy(form, true);
        try {
            await raw('/rest/v1/rpc/activate_admin', {
                method: 'POST', auth: false, body: { p_code: code, p_username: username, p_password: password }
            });
            await signIn(username, password);
            form.reset();
            toast('¡Listo! Desde ahora entras con tu usuario «' + username + '».');
        } catch (err) {
            showAuth('activate-form', err.message);
        }
        busy(form, false);
    }

    async function logout() {
        try { await raw('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* la sesión igual se cierra */ }
        saveSession(null);
        closeSide();
        showAuth('login-form', 'Sesión cerrada.', true);
    }

    async function enterApp() {
        var isAdmin = false;
        try {
            isAdmin = await api('/rest/v1/rpc/is_admin', { method: 'POST', body: {} });
        } catch (e) {
            if (e.status !== 401) showAuth('login-form', e.message);
            return;
        }
        var me = null;
        try { me = await api('/auth/v1/user'); } catch (e) { /* sin email visible */ }
        session.email = me && me.email || session.email || '';
        saveSession(session);
        if (!isAdmin) {
            $('denied-email').textContent = usernameOf(session.email);
            showAuth('denied');
            return;
        }
        $('auth-view').hidden = true;
        $('app').hidden = false;
        $('admin-email').textContent = usernameOf(session.email);
        await loadAll();
        clearInterval(pollTimer);
        pollTimer = setInterval(pollOrders, 60000);
    }

    /* ===== DATOS ===== */
    async function loadAll() {
        try {
            var res = await Promise.all([
                api('/rest/v1/products?select=*&order=sort.asc,name.asc'),
                api('/rest/v1/vehicles?select=*&order=sort.asc,brand.asc,model.asc'),
                api('/rest/v1/coupons?select=*&order=created_at.desc'),
                api('/rest/v1/settings?select=*'),
                api('/rest/v1/orders?select=*&order=created_at.desc&limit=500'),
                api('/rest/v1/admins?select=*&order=created_at.asc')
            ]);
            data.products = res[0];
            data.vehicles = res[1];
            data.coupons = res[2];
            data.settings = {};
            res[3].forEach(function (row) { data.settings[row.key] = row.value; });
            data.orders = res[4];
            data.admins = res[5];
            renderAll();
        } catch (e) {
            toast(e.message, true);
        }
    }

    async function pollOrders() {
        if ($('app').hidden) return;
        try {
            var orders = await api('/rest/v1/orders?select=*&order=created_at.desc&limit=500');
            var known = {};
            data.orders.forEach(function (o) { known[o.id] = true; });
            var fresh = orders.filter(function (o) { return !known[o.id]; });
            data.orders = orders;
            if (fresh.length) {
                toast(fresh.length === 1 ? 'Nuevo pedido ' + fresh[0].ref : fresh.length + ' pedidos nuevos');
                renderAll();
            }
        } catch (e) { /* se reintenta en el próximo ciclo */ }
    }

    function renderAll() {
        renderSummary();
        renderOrders();
        renderProducts();
        renderCoupons();
        renderVehicles();
        renderSettings();
        var nuevos = data.orders.filter(function (o) { return o.status === 'nuevo'; }).length;
        var badge = $('badge-orders');
        badge.hidden = !nuevos;
        badge.textContent = nuevos;
    }

    function setTab(tab) {
        view.tab = tab;
        document.querySelectorAll('.admin-tab').forEach(function (b) {
            var on = b.dataset.tab === tab;
            b.classList.toggle('active', on);
            b.setAttribute('aria-current', on ? 'page' : 'false');
        });
        document.querySelectorAll('.admin-panel').forEach(function (p) {
            p.hidden = p.id !== 'tab-' + tab;
        });
        window.scrollTo(0, 0);
    }

    /* ===== RESUMEN ===== */
    function renderSummary() {
        var now = new Date();
        var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        var monthOrders = data.orders.filter(function (o) { return new Date(o.created_at) >= monthStart; });
        var sales = monthOrders.filter(function (o) { return SOLD.indexOf(o.status) !== -1; })
            .reduce(function (sum, o) { return sum + o.total; }, 0);
        var nuevos = data.orders.filter(function (o) { return o.status === 'nuevo'; }).length;
        var low = lowStockProducts();

        var kpis = $('kpis');
        kpis.textContent = '';
        [
            ['Ventas del mes', money(sales), 'Pedidos confirmados, pagados, enviados o entregados'],
            ['Pedidos nuevos', String(nuevos), 'Esperan confirmación', function () { view.orderStatus = 'nuevo'; renderOrders(); setTab('pedidos'); }],
            ['Pedidos del mes', String(monthOrders.length), 'Todos los estados'],
            ['Productos activos', String(data.products.filter(function (p) { return p.active; }).length), data.products.length + ' en total', function () { setTab('productos'); }],
            ['Stock bajo', String(low.length), '3 unidades o menos', function () { view.productLow = true; $('products-low').checked = true; renderProducts(); setTab('productos'); }]
        ].forEach(function (k) {
            var card = el(k[3] ? 'button' : 'div', 'kpi');
            if (k[3]) {
                card.type = 'button';
                card.addEventListener('click', k[3]);
            }
            card.appendChild(el('span', 'kpi-label', k[0]));
            card.appendChild(el('strong', 'kpi-value', k[1]));
            card.appendChild(el('span', 'kpi-note', k[2]));
            kpis.appendChild(card);
        });

        var recent = $('recent-orders');
        recent.textContent = '';
        if (!data.orders.length) recent.appendChild(el('p', 'admin-empty', 'Aún no hay pedidos. Aparecerán aquí cuando los clientes compren en la tienda.'));
        data.orders.slice(0, 6).forEach(function (o) { recent.appendChild(orderRow(o, true)); });

        var lowWrap = $('low-stock');
        lowWrap.textContent = '';
        if (!low.length) lowWrap.appendChild(el('p', 'admin-empty', 'Todo con stock suficiente.'));
        low.slice(0, 8).forEach(function (p) {
            var row = button('', 'mini-row', function () { openProduct(p); });
            row.appendChild(el('span', 'mini-row-main', p.name));
            row.appendChild(el('span', 'stock-pill' + (p.stock === 0 ? ' out' : ''), p.stock === 0 ? 'Agotado' : p.stock + ' u.'));
            lowWrap.appendChild(row);
        });
    }

    function lowStockProducts() {
        return data.products.filter(function (p) { return !p.quote && p.stock !== null && p.stock <= 3; })
            .sort(function (a, b) { return a.stock - b.stock; });
    }

    /* ===== PEDIDOS ===== */
    function renderOrders() {
        var filter = $('orders-filter');
        filter.textContent = '';
        [['', 'Todos']].concat(STATUSES).forEach(function (s) {
            var count = s[0] ? data.orders.filter(function (o) { return o.status === s[0]; }).length : data.orders.length;
            var chip = button(s[1] + ' (' + count + ')', 'chip' + (view.orderStatus === s[0] ? ' active' : ''), function () {
                view.orderStatus = s[0];
                renderOrders();
            });
            chip.setAttribute('aria-pressed', view.orderStatus === s[0] ? 'true' : 'false');
            filter.appendChild(chip);
        });

        var q = normalize(view.orderQuery.trim());
        var list = data.orders.filter(function (o) {
            if (view.orderStatus && o.status !== view.orderStatus) return false;
            return !q || normalize(o.ref + ' ' + o.name + ' ' + o.phone + ' ' + (o.email || '')).indexOf(q) !== -1;
        });
        var wrap = $('orders-list');
        wrap.textContent = '';
        if (!list.length) wrap.appendChild(el('p', 'admin-empty', data.orders.length ? 'No hay pedidos con ese filtro.' : 'Aún no hay pedidos.'));
        list.forEach(function (o) { wrap.appendChild(orderRow(o)); });
    }

    function orderRow(o, compact) {
        var row = el('div', 'admin-row order-row');
        var main = button('', 'row-main', function () { openOrder(o); });
        var title = el('span', 'row-title');
        title.appendChild(el('strong', '', o.ref));
        title.appendChild(el('span', 'row-sub', fmtDate(o.created_at)));
        main.appendChild(title);
        var who = el('span', 'row-col');
        who.appendChild(el('span', '', o.name));
        who.appendChild(el('span', 'row-sub', o.delivery === 'despacho' ? 'Despacho · ' + (o.commune || '') : 'Retiro en tienda'));
        main.appendChild(who);
        var total = el('span', 'row-col row-money', money(o.total) + (o.shipping_pending ? ' + envío' : ''));
        main.appendChild(total);
        row.appendChild(main);
        if (compact) {
            row.appendChild(el('span', 'status-pill status-' + o.status, statusLabel(o.status)));
        } else {
            var s = select(STATUSES, o.status);
            s.className = 'admin-input status-select status-' + o.status;
            s.setAttribute('aria-label', 'Estado del pedido ' + o.ref);
            s.addEventListener('change', function () { updateOrder(o, { status: s.value }); });
            row.appendChild(s);
        }
        return row;
    }

    async function updateOrder(o, patch) {
        try {
            var rows = await api('/rest/v1/orders?id=eq.' + encodeURIComponent(o.id), {
                method: 'PATCH', body: patch, headers: { Prefer: 'return=representation' }
            });
            Object.assign(o, rows[0]);
            if (patch.status) {
                toast('Pedido ' + o.ref + ': ' + statusLabel(o.status));
                // El stock cambia al confirmar o cancelar: se recargan los productos.
                data.products = await api('/rest/v1/products?select=*&order=sort.asc,name.asc');
            } else {
                toast('Pedido guardado');
            }
            renderAll();
            return true;
        } catch (e) {
            toast(e.message, true);
            renderOrders();
            return false;
        }
    }

    function openOrder(o) {
        var body = openSide('Pedido ' + o.ref);

        var head = el('div', 'order-head');
        head.appendChild(el('span', 'row-sub', 'Recibido el ' + fmtDate(o.created_at)));
        var status = select(STATUSES, o.status);
        status.className = 'admin-input status-select status-' + o.status;
        status.setAttribute('aria-label', 'Estado');
        head.appendChild(field('Estado', status));
        body.appendChild(head);
        body.appendChild(el('p', 'admin-help', 'Al pasar a Confirmado, Pagado, Enviado o Entregado se descuenta el stock (una sola vez). Si lo cancelas, el stock se repone.'));

        var client = el('div', 'detail-block');
        client.appendChild(el('h3', '', 'Cliente'));
        detail(client, 'Nombre', o.name);
        detail(client, 'Teléfono', o.phone);
        if (o.email) detail(client, 'Email', o.email);
        detail(client, 'Entrega', o.delivery === 'despacho' ? 'Despacho a domicilio' : 'Retiro en tienda');
        if (o.delivery === 'despacho') detail(client, 'Dirección', [o.address, o.commune, o.region].filter(Boolean).join(', '));
        detail(client, 'Pago', o.payment);
        if (o.notes) detail(client, 'Notas del cliente', o.notes);
        body.appendChild(client);

        var items = el('div', 'detail-block');
        items.appendChild(el('h3', '', 'Productos'));
        var ul = el('ul', 'order-items');
        (o.items || []).forEach(function (item) {
            var li = el('li');
            li.appendChild(el('span', '', item.qty + ' × ' + item.name + (item.option ? ' (' + item.option + ')' : '')));
            li.appendChild(el('strong', '', money(item.price * item.qty)));
            ul.appendChild(li);
        });
        items.appendChild(ul);
        totalRow(items, 'Subtotal', money(o.subtotal));
        if (o.discount) totalRow(items, 'Cupón ' + (o.coupon || ''), '−' + money(o.discount));
        totalRow(items, 'Envío', o.delivery === 'retiro' ? 'Retiro' : (o.shipping_pending ? 'A cotizar' : 'Gratis'));
        totalRow(items, 'Total', money(o.total) + (o.shipping_pending ? ' + envío' : ''), true);
        body.appendChild(items);

        var notes = input('textarea', o.admin_notes || '', { rows: 3, placeholder: 'Ej: pagó por transferencia, enviado por Starken N° 123...' });
        body.appendChild(field('Notas internas (solo las ves tú)', notes));

        var actions = el('div', 'side-actions');
        actions.appendChild(button('Guardar cambios', 'btn btn-sm btn-primary', async function () {
            var patch = { admin_notes: notes.value.trim() || null };
            if (status.value !== o.status) patch.status = status.value;
            if (await updateOrder(o, patch)) closeSide();
        }));
        var wa = el('a', 'btn btn-sm btn-ghost', 'WhatsApp al cliente');
        wa.href = 'https://wa.me/' + waPhone(o.phone) + '?text=' + encodeURIComponent('Hola ' + o.name + ', te escribimos de Catrian Racing por tu pedido ' + o.ref + '.');
        wa.target = '_blank';
        wa.rel = 'noopener';
        actions.appendChild(wa);
        actions.appendChild(button('Eliminar', 'btn btn-sm btn-danger', async function () {
            if (!confirm('¿Eliminar el pedido ' + o.ref + '? Esta acción no se puede deshacer.')) return;
            try {
                await api('/rest/v1/orders?id=eq.' + encodeURIComponent(o.id), { method: 'DELETE' });
                data.orders = data.orders.filter(function (x) { return x.id !== o.id; });
                toast('Pedido eliminado');
                closeSide();
                renderAll();
            } catch (e) { toast(e.message, true); }
        }));
        body.appendChild(actions);
    }

    function detail(parent, label, value) {
        var row = el('div', 'detail-row');
        row.appendChild(el('span', '', label));
        row.appendChild(el('strong', '', value));
        parent.appendChild(row);
    }

    function totalRow(parent, label, value, strong) {
        var row = el('div', 'totals-row' + (strong ? ' total' : ''));
        row.appendChild(el('span', '', label));
        row.appendChild(el(strong ? 'strong' : 'span', '', value));
        parent.appendChild(row);
    }

    /* ===== PRODUCTOS ===== */
    function renderProducts() {
        var q = normalize(view.productQuery.trim());
        var list = data.products.filter(function (p) {
            if (view.productCat && p.cat !== view.productCat) return false;
            if (view.productLow && !(p.stock !== null && p.stock <= 3 && !p.quote)) return false;
            return !q || normalize(p.name + ' ' + (p.brand || '') + ' ' + (p.sub || '') + ' ' + p.cat).indexOf(q) !== -1;
        });
        $('products-count').textContent = list.length + (list.length === 1 ? ' producto' : ' productos');
        var wrap = $('products-list');
        wrap.textContent = '';
        if (!list.length) wrap.appendChild(el('p', 'admin-empty', 'No hay productos con ese filtro.'));
        list.forEach(function (p) {
            var row = el('div', 'admin-row product-row' + (p.active ? '' : ' inactive'));
            var main = button('', 'row-main', function () { openProduct(p); });
            var thumb = el('span', 'mini-thumb');
            if (p.img) {
                var img = el('img');
                img.src = p.img;
                img.alt = '';
                img.loading = 'lazy';
                img.onerror = function () { img.remove(); };
                thumb.appendChild(img);
            }
            main.appendChild(thumb);
            var title = el('span', 'row-title');
            title.appendChild(el('strong', '', p.name));
            title.appendChild(el('span', 'row-sub', [p.cat, p.sub, p.brand].filter(Boolean).join(' · ')));
            main.appendChild(title);
            var price = el('span', 'row-col row-money', money(p.price));
            if (p.compare) price.appendChild(el('s', 'row-sub', ' ' + money(p.compare)));
            main.appendChild(price);
            row.appendChild(main);

            var controls = el('div', 'row-controls');
            if (p.quote) {
                controls.appendChild(el('span', 'stock-pill', 'Cotización'));
            } else {
                var stock = input('number', p.stock === null ? '' : p.stock, { min: 0, placeholder: '∞', 'aria-label': 'Stock de ' + p.name });
                stock.className = 'admin-input stock-input';
                stock.addEventListener('change', function () {
                    var value = stock.value === '' ? null : Math.max(0, parseInt(stock.value, 10) || 0);
                    saveProductPatch(p, { stock: value }, 'Stock actualizado');
                });
                var stockWrap = el('label', 'stock-field');
                stockWrap.appendChild(el('span', '', 'Stock'));
                stockWrap.appendChild(stock);
                controls.appendChild(stockWrap);
            }
            var toggle = el('label', 'switch');
            var check = el('input');
            check.type = 'checkbox';
            check.checked = p.active;
            check.setAttribute('aria-label', 'Visible en la tienda: ' + p.name);
            check.addEventListener('change', function () {
                saveProductPatch(p, { active: check.checked }, check.checked ? 'Producto visible en la tienda' : 'Producto oculto de la tienda');
            });
            toggle.appendChild(check);
            toggle.appendChild(el('span', '', 'Visible'));
            controls.appendChild(toggle);
            row.appendChild(controls);
            wrap.appendChild(row);
        });
    }

    async function saveProductPatch(p, patch, message) {
        try {
            var rows = await api('/rest/v1/products?id=eq.' + encodeURIComponent(p.id), {
                method: 'PATCH', body: patch, headers: { Prefer: 'return=representation' }
            });
            Object.assign(p, rows[0]);
            toast(message);
            renderSummary();
            renderProducts();
        } catch (e) {
            toast(e.message, true);
            renderProducts();
        }
    }

    function openProduct(p) {
        var isNew = !p;
        p = p || { name: '', cat: 'Repuestos', price: 0, active: true, specs: [], sort: data.products.length };
        var body = openSide(isNew ? 'Nuevo producto' : 'Editar producto');
        var form = el('form', 'admin-form product-form');
        form.noValidate = true;

        var f = {};
        f.name = input('text', p.name, { required: '', maxlength: 120 });
        f.cat = select(CATS, p.cat);
        f.sub = input('text', p.sub || '', { list: 'dl-subs', placeholder: 'Ej: Frenos' });
        f.brand = input('text', p.brand || '', { list: 'dl-brands', placeholder: 'Ej: NGK' });
        f.price = input('number', p.price, { min: 0, step: 10, required: '' });
        f.compare = input('number', p.compare || '', { min: 0, step: 10, placeholder: 'Opcional' });
        f.stock = input('number', p.stock === null || p.stock === undefined ? '' : p.stock, { min: 0, placeholder: 'Vacío = sin control de stock' });
        f.desc = input('textarea', p.desc || '', { rows: 3 });
        f.badge = input('text', p.badge || '', { list: 'dl-badges', placeholder: 'Ej: Nuevo, Más vendido' });
        f.cc = input('number', p.cc || '', { min: 0, placeholder: 'Solo motos' });
        f.sort = input('number', p.sort || 0, { step: 1 });
        f.specs = input('textarea', (p.specs || []).map(function (s) { return s[0] + ': ' + s[1]; }).join('\n'), { rows: 3, placeholder: 'Una por línea. Ej:\nVoltaje: 12 V\nCapacidad: 7 Ah' });
        f.optName = input('text', p.options ? p.options.name : '', { placeholder: 'Ej: Talla' });
        f.optValues = input('text', p.options ? p.options.values.join(', ') : '', { placeholder: 'Ej: S, M, L, XL' });
        f.img = input('url', p.img || '', { placeholder: 'https://...' });

        form.appendChild(datalist('dl-subs', uniqValues('sub')));
        form.appendChild(datalist('dl-brands', uniqValues('brand')));
        form.appendChild(datalist('dl-badges', ['Nuevo', 'Más vendido', 'Oferta', 'Últimas unidades']));

        // Imagen
        var imgBlock = el('div', 'img-block');
        var preview = el('div', 'img-preview');
        function updatePreview() {
            preview.textContent = '';
            if (f.img.value) {
                var img = el('img');
                img.src = f.img.value;
                img.alt = 'Vista previa';
                img.onerror = function () { img.remove(); };
                preview.appendChild(img);
            } else {
                preview.appendChild(el('span', '', 'Sin imagen'));
            }
        }
        updatePreview();
        f.img.addEventListener('change', updatePreview);
        imgBlock.appendChild(preview);
        var imgFields = el('div', 'img-fields');
        var file = el('input');
        file.type = 'file';
        file.accept = 'image/jpeg,image/png,image/webp';
        file.className = 'sr-only';
        file.id = 'f-file';
        var upload = el('label', 'btn btn-sm btn-ghost', 'Subir foto');
        upload.htmlFor = 'f-file';
        file.addEventListener('change', async function () {
            if (!file.files[0]) return;
            var picked = file.files[0];
            if (picked.size > 5 * 1024 * 1024) return toast('La foto pesa más de 5 MB.', true);
            upload.textContent = 'Subiendo...';
            try {
                f.img.value = await uploadImage(picked, p.id || slugify(f.name.value));
                updatePreview();
                toast('Foto subida');
            } catch (e) { toast(e.message, true); }
            upload.textContent = 'Subir foto';
            file.value = '';
        });
        imgFields.appendChild(upload);
        imgFields.appendChild(file);
        imgFields.appendChild(field('o pega el enlace de una imagen', f.img));
        imgBlock.appendChild(imgFields);
        form.appendChild(imgBlock);

        form.appendChild(field('Nombre', f.name));
        var grid = el('div', 'form-grid');
        grid.appendChild(field('Categoría', f.cat));
        grid.appendChild(field('Subcategoría', f.sub));
        grid.appendChild(field('Marca', f.brand));
        grid.appendChild(field('Etiqueta', f.badge));
        grid.appendChild(field('Precio ($)', f.price));
        grid.appendChild(field('Precio anterior ($)', f.compare));
        grid.appendChild(field('Stock', f.stock));
        grid.appendChild(field('Cilindrada (cc)', f.cc));
        form.appendChild(grid);
        form.appendChild(field('Descripción', f.desc));

        var flags = el('div', 'flags');
        f.active = checkbox('Visible en la tienda', p.active);
        f.freeShip = checkbox('Despacho gratis', p.free_ship);
        f.quote = checkbox('Se cotiza (no va al carro)', p.quote);
        [f.active, f.freeShip, f.quote].forEach(function (c) { flags.appendChild(c.wrap); });
        form.appendChild(flags);

        var optGrid = el('div', 'form-grid');
        optGrid.appendChild(field('Variante (opcional)', f.optName));
        optGrid.appendChild(field('Opciones, separadas por coma', f.optValues));
        form.appendChild(optGrid);
        form.appendChild(field('Características', f.specs));

        // Compatibilidad
        var fits = el('fieldset', 'fits-box');
        fits.appendChild(el('legend', '', 'Motos compatibles'));
        f.universal = checkbox('Universal (sirve para cualquier moto)', !p.fits || !p.fits.length);
        fits.appendChild(f.universal.wrap);
        var fitList = el('div', 'fit-groups');
        var fitChecks = [];
        uniqVehicleTypes().forEach(function (type) {
            var group = el('div', 'fit-group');
            var groupHead = el('div', 'fit-group-head');
            groupHead.appendChild(el('strong', '', type));
            var typeChecks = [];
            groupHead.appendChild(button('Todas', 'link-btn', function () {
                var all = typeChecks.every(function (c) { return c.input.checked; });
                typeChecks.forEach(function (c) { c.input.checked = !all; });
            }));
            group.appendChild(groupHead);
            data.vehicles.filter(function (v) { return v.type === type; }).forEach(function (v) {
                var c = checkbox(v.brand + ' ' + v.model, p.fits && p.fits.indexOf(v.id) !== -1);
                c.input.value = v.id;
                fitChecks.push(c);
                typeChecks.push(c);
                group.appendChild(c.wrap);
            });
            fitList.appendChild(group);
        });
        if (!data.vehicles.length) fitList.appendChild(el('p', 'admin-help', 'Agrega motos en la pestaña «Motos».'));
        function syncFits() { fitList.hidden = f.universal.input.checked; }
        f.universal.input.addEventListener('change', syncFits);
        syncFits();
        fits.appendChild(fitList);
        form.appendChild(fits);

        form.appendChild(field('Orden en el catálogo (menor = primero)', f.sort));

        var error = el('p', 'form-error');
        error.setAttribute('role', 'alert');
        form.appendChild(error);

        var actions = el('div', 'side-actions');
        var save = el('button', 'btn btn-sm btn-primary', isNew ? 'Crear producto' : 'Guardar cambios');
        save.type = 'submit';
        actions.appendChild(save);
        if (!isNew) {
            var storeLink = el('a', 'btn btn-sm btn-ghost', 'Ver en la tienda');
            storeLink.href = 'index.html#p/' + encodeURIComponent(p.id);
            storeLink.target = '_blank';
            storeLink.rel = 'noopener';
            actions.appendChild(storeLink);
            actions.appendChild(button('Eliminar', 'btn btn-sm btn-danger', async function () {
                if (!confirm('¿Eliminar «' + p.name + '»? Si solo quieres ocultarlo, desmarca «Visible en la tienda».')) return;
                try {
                    await api('/rest/v1/products?id=eq.' + encodeURIComponent(p.id), { method: 'DELETE' });
                    data.products = data.products.filter(function (x) { return x.id !== p.id; });
                    toast('Producto eliminado');
                    closeSide();
                    renderAll();
                } catch (e) { toast(e.message, true); }
            }));
        }
        form.appendChild(actions);

        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            var name = f.name.value.trim();
            var price = parseInt(f.price.value, 10);
            if (!name) { error.textContent = 'Escribe el nombre del producto.'; return f.name.focus(); }
            if (isNaN(price) || price < 0) { error.textContent = 'Escribe un precio válido.'; return f.price.focus(); }
            var optValues = f.optValues.value.split(',').map(function (v) { return v.trim(); }).filter(Boolean);
            if (optValues.length && !f.optName.value.trim()) { error.textContent = 'Escribe el nombre de la variante (ej: Talla).'; return f.optName.focus(); }
            var specs = f.specs.value.split('\n').map(function (line) {
                var i = line.indexOf(':');
                return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : null;
            }).filter(function (s) { return s && s[0] && s[1]; });
            var fitIds = f.universal.input.checked ? null : fitChecks.filter(function (c) { return c.input.checked; }).map(function (c) { return c.input.value; });
            if (fitIds && !fitIds.length) fitIds = null;
            var num = function (v) { return v === '' ? null : Math.max(0, parseInt(v, 10) || 0); };

            var row = {
                name: name,
                cat: f.cat.value,
                sub: f.sub.value.trim() || null,
                brand: f.brand.value.trim() || null,
                price: price,
                compare: num(f.compare.value),
                stock: num(f.stock.value),
                img: f.img.value.trim() || null,
                desc: f.desc.value.trim(),
                specs: specs,
                options: optValues.length ? { name: f.optName.value.trim(), values: optValues } : null,
                fits: fitIds,
                badge: f.badge.value.trim() || null,
                quote: f.quote.input.checked,
                cc: num(f.cc.value),
                free_ship: f.freeShip.input.checked,
                active: f.active.input.checked,
                sort: parseInt(f.sort.value, 10) || 0
            };
            if (row.compare !== null && row.compare <= row.price) row.compare = null;

            save.disabled = true;
            try {
                if (isNew) {
                    row.id = uniqueProductId(name);
                    var created = await api('/rest/v1/products', { method: 'POST', body: row, headers: { Prefer: 'return=representation' } });
                    data.products.push(created[0]);
                    toast('Producto creado');
                } else {
                    var updated = await api('/rest/v1/products?id=eq.' + encodeURIComponent(p.id), {
                        method: 'PATCH', body: row, headers: { Prefer: 'return=representation' }
                    });
                    Object.assign(p, updated[0]);
                    toast('Producto guardado');
                }
                data.products.sort(function (a, b) { return a.sort - b.sort || a.name.localeCompare(b.name, 'es'); });
                closeSide();
                renderAll();
            } catch (err) {
                error.textContent = err.message;
            }
            save.disabled = false;
        });

        body.appendChild(form);
        f.name.focus();
    }

    function checkbox(label, checked) {
        var wrap = el('label', 'check');
        var i = el('input');
        i.type = 'checkbox';
        i.checked = !!checked;
        wrap.appendChild(i);
        wrap.appendChild(document.createTextNode(' ' + label));
        return { wrap: wrap, input: i };
    }

    function datalist(id, values) {
        var dl = el('datalist');
        dl.id = id;
        values.forEach(function (v) {
            var o = el('option');
            o.value = v;
            dl.appendChild(o);
        });
        return dl;
    }

    function uniqValues(key) {
        var seen = {};
        return data.products.map(function (p) { return p[key]; }).filter(function (v) {
            if (!v || seen[v]) return false;
            seen[v] = true;
            return true;
        }).sort(function (a, b) { return a.localeCompare(b, 'es'); });
    }

    function uniqVehicleTypes() {
        var seen = {};
        return data.vehicles.map(function (v) { return v.type; }).filter(function (t) {
            if (seen[t]) return false;
            seen[t] = true;
            return true;
        });
    }

    function uniqueProductId(name) {
        var base = slugify(name);
        var id = base;
        var n = 2;
        var taken = {};
        data.products.forEach(function (p) { taken[p.id] = true; });
        while (taken[id]) id = base + '-' + n++;
        return id;
    }

    async function uploadImage(fileObj, baseName) {
        var ext = (fileObj.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        var path = slugify(baseName || 'producto') + '-' + Date.now().toString(36) + '.' + ext;
        await api('/storage/v1/object/' + BUCKET + '/' + path, {
            method: 'POST', body: fileObj, headers: { 'Content-Type': fileObj.type, 'x-upsert': 'true' }
        });
        return DB.url + '/storage/v1/object/public/' + BUCKET + '/' + path;
    }

    /* ===== CUPONES ===== */
    function renderCoupons() {
        var wrap = $('coupons-list');
        wrap.textContent = '';
        if (!data.coupons.length) wrap.appendChild(el('p', 'admin-empty', 'No hay cupones. Crea el primero arriba.'));
        data.coupons.forEach(function (c) {
            var row = el('div', 'admin-row' + (c.active ? '' : ' inactive'));
            var main = el('div', 'row-main static');
            var title = el('span', 'row-title');
            title.appendChild(el('strong', 'coupon-code', c.code));
            title.appendChild(el('span', 'row-sub', 'Creado el ' + fmtDate(c.created_at)));
            main.appendChild(title);
            main.appendChild(el('span', 'row-col row-money', c.percent + '% de descuento'));
            row.appendChild(main);
            var controls = el('div', 'row-controls');
            var toggle = el('label', 'switch');
            var check = el('input');
            check.type = 'checkbox';
            check.checked = c.active;
            check.setAttribute('aria-label', 'Cupón activo: ' + c.code);
            check.addEventListener('change', async function () {
                try {
                    await api('/rest/v1/coupons?code=eq.' + encodeURIComponent(c.code), { method: 'PATCH', body: { active: check.checked } });
                    c.active = check.checked;
                    toast(c.active ? 'Cupón activado' : 'Cupón desactivado');
                    renderCoupons();
                } catch (e) { toast(e.message, true); check.checked = !check.checked; }
            });
            toggle.appendChild(check);
            toggle.appendChild(el('span', '', 'Activo'));
            controls.appendChild(toggle);
            controls.appendChild(button('Eliminar', 'btn btn-sm btn-danger', async function () {
                if (!confirm('¿Eliminar el cupón ' + c.code + '?')) return;
                try {
                    await api('/rest/v1/coupons?code=eq.' + encodeURIComponent(c.code), { method: 'DELETE' });
                    data.coupons = data.coupons.filter(function (x) { return x.code !== c.code; });
                    toast('Cupón eliminado');
                    renderCoupons();
                } catch (e) { toast(e.message, true); }
            }));
            row.appendChild(controls);
            wrap.appendChild(row);
        });
    }

    async function onCouponCreate(e) {
        e.preventDefault();
        var code = $('coupon-code').value.trim().toUpperCase().replace(/\s+/g, '');
        var percent = parseInt($('coupon-percent').value, 10);
        if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return toast('El código debe tener de 3 a 30 letras o números, sin espacios.', true);
        if (!(percent >= 1 && percent <= 90)) return toast('El descuento debe estar entre 1% y 90%.', true);
        try {
            var rows = await api('/rest/v1/coupons', { method: 'POST', body: { code: code, percent: percent }, headers: { Prefer: 'return=representation' } });
            data.coupons.unshift(rows[0]);
            e.target.reset();
            toast('Cupón ' + code + ' creado');
            renderCoupons();
        } catch (err) {
            toast(err.status === 409 ? 'Ya existe un cupón con ese código.' : err.message, true);
        }
    }

    /* ===== MOTOS ===== */
    function renderVehicles() {
        var types = uniqVehicleTypes();
        var dl = $('vehicle-types');
        dl.textContent = '';
        types.forEach(function (t) {
            var o = el('option');
            o.value = t;
            dl.appendChild(o);
        });

        var wrap = $('vehicles-list');
        wrap.textContent = '';
        if (!data.vehicles.length) wrap.appendChild(el('p', 'admin-empty', 'No hay motos en el buscador.'));
        types.forEach(function (type) {
            var group = el('div', 'admin-card vehicle-group');
            group.appendChild(el('h2', '', type));
            data.vehicles.filter(function (v) { return v.type === type; }).forEach(function (v) {
                var row = el('div', 'mini-row static');
                row.appendChild(el('span', 'mini-row-main', v.brand + ' ' + v.model));
                var uses = data.products.filter(function (p) { return p.fits && p.fits.indexOf(v.id) !== -1; }).length;
                row.appendChild(el('span', 'row-sub', uses + (uses === 1 ? ' producto' : ' productos')));
                row.appendChild(button('Quitar', 'link-btn danger', function () { deleteVehicle(v, uses); }));
                group.appendChild(row);
            });
            wrap.appendChild(group);
        });
    }

    async function deleteVehicle(v, uses) {
        var msg = '¿Quitar ' + v.brand + ' ' + v.model + ' del buscador?';
        if (uses) msg += ' También se quitará de la compatibilidad de ' + uses + (uses === 1 ? ' producto.' : ' productos.');
        if (!confirm(msg)) return;
        try {
            var affected = data.products.filter(function (p) { return p.fits && p.fits.indexOf(v.id) !== -1; });
            for (var i = 0; i < affected.length; i++) {
                var p = affected[i];
                var fits = p.fits.filter(function (id) { return id !== v.id; });
                await api('/rest/v1/products?id=eq.' + encodeURIComponent(p.id), { method: 'PATCH', body: { fits: fits.length ? fits : null } });
                p.fits = fits.length ? fits : null;
            }
            await api('/rest/v1/vehicles?id=eq.' + encodeURIComponent(v.id), { method: 'DELETE' });
            data.vehicles = data.vehicles.filter(function (x) { return x.id !== v.id; });
            toast('Moto quitada del buscador');
            renderVehicles();
        } catch (e) { toast(e.message, true); }
    }

    async function onVehicleCreate(e) {
        e.preventDefault();
        var type = $('vehicle-type').value.trim();
        var brand = $('vehicle-brand').value.trim();
        var model = $('vehicle-model').value.trim();
        if (!type || !brand || !model) return toast('Completa tipo, marca y modelo.', true);
        var id = slugify(brand + '-' + model);
        if (data.vehicles.some(function (v) { return v.id === id; })) return toast('Esa moto ya está en el buscador.', true);
        try {
            var rows = await api('/rest/v1/vehicles', {
                method: 'POST', headers: { Prefer: 'return=representation' },
                body: { id: id, type: type, brand: brand, model: model, sort: data.vehicles.length }
            });
            data.vehicles.push(rows[0]);
            $('vehicle-brand').value = '';
            $('vehicle-model').value = '';
            toast(brand + ' ' + model + ' agregada');
            renderVehicles();
        } catch (err) { toast(err.message, true); }
    }

    /* ===== AJUSTES ===== */
    function renderSettings() {
        $('set-whatsapp').value = data.settings.whatsapp || '';
        $('set-free').value = data.settings.free_shipping_from === undefined ? '' : data.settings.free_shipping_from;
        $('set-announce').value = (data.settings.announce || []).join('\n');

        var wrap = $('admins-list');
        wrap.textContent = '';
        data.admins.filter(function (a) { return a.email.slice(-USER_DOMAIN.length) === USER_DOMAIN; }).forEach(function (a) {
            var name = usernameOf(a.email);
            var row = el('div', 'mini-row static' + (a.disabled_at ? ' inactive' : ''));
            row.appendChild(el('span', 'mini-row-main', name));
            var isMe = session && session.email && a.email.toLowerCase() === session.email.toLowerCase();
            if (isMe) {
                row.appendChild(el('span', 'row-sub', 'Tú'));
            } else if (a.disabled_at) {
                row.appendChild(el('span', 'row-sub', 'Desactivado · para reactivarlo, guárdalo con una contraseña nueva'));
            } else {
                row.appendChild(button('Quitar acceso', 'link-btn danger', async function () {
                    if (!confirm('¿Quitar el acceso de «' + name + '»? No podrá entrar al panel.')) return;
                    try {
                        await api('/rest/v1/rpc/admin_disable_user', { method: 'POST', body: { p_username: name } });
                        a.disabled_at = new Date().toISOString();
                        toast('Acceso quitado a ' + name);
                        renderSettings();
                    } catch (e) { toast(e.message, true); }
                }));
            }
            wrap.appendChild(row);
        });
    }

    async function onSettingsSave(e) {
        e.preventDefault();
        var whatsapp = $('set-whatsapp').value.replace(/\D/g, '');
        var free = parseInt($('set-free').value, 10);
        var announce = $('set-announce').value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 3);
        if (whatsapp.length < 8) return toast('Escribe un número de WhatsApp válido, con código de país (ej: 56912345678).', true);
        if (isNaN(free) || free < 0) return toast('Escribe un monto válido para el envío gratis.', true);
        try {
            await api('/rest/v1/settings?on_conflict=key', {
                method: 'POST',
                headers: { Prefer: 'resolution=merge-duplicates' },
                body: [
                    { key: 'whatsapp', value: whatsapp },
                    { key: 'free_shipping_from', value: free },
                    { key: 'announce', value: announce }
                ]
            });
            data.settings.whatsapp = whatsapp;
            data.settings.free_shipping_from = free;
            data.settings.announce = announce;
            toast('Ajustes guardados. La tienda ya los muestra.');
            renderSettings();
        } catch (err) { toast(err.message, true); }
    }

    async function onAdminAdd(e) {
        e.preventDefault();
        var username = cleanUsername($('admin-new-user').value);
        var password = $('admin-new-password').value;
        if (!USERNAME_RE.test(username)) return toast('El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo, sin espacios.', true);
        if (password.length < 8) return toast('La contraseña debe tener al menos 8 caracteres.', true);
        var exists = data.admins.some(function (a) { return a.email === username + USER_DOMAIN; });
        try {
            await api('/rest/v1/rpc/admin_save_user', { method: 'POST', body: { p_username: username, p_password: password } });
            data.admins = await api('/rest/v1/admins?select=*&order=created_at.asc');
            e.target.reset();
            toast(exists ? 'Contraseña de «' + username + '» actualizada' : 'Usuario «' + username + '» creado');
            renderSettings();
        } catch (err) { toast(err.message, true); }
    }

    async function onPasswordChange(e) {
        e.preventDefault();
        var password = $('new-password').value;
        if (password.length < 8) return toast('La contraseña debe tener al menos 8 caracteres.', true);
        try {
            await api('/auth/v1/user', { method: 'PUT', body: { password: password } });
            e.target.reset();
            toast('Contraseña actualizada');
        } catch (err) { toast(err.message, true); }
    }

    /* ===== PANEL LATERAL ===== */
    function openSide(title) {
        lastFocus = document.activeElement;
        $('side-title').textContent = title;
        var body = $('side-body');
        body.textContent = '';
        var side = $('side');
        $('overlay').hidden = false;
        side.classList.add('open');
        side.setAttribute('aria-hidden', 'false');
        side.scrollTop = 0;
        document.body.classList.add('locked');
        $('side-close').focus();
        return body;
    }

    function closeSide() {
        var side = $('side');
        if (!side.classList.contains('open')) return;
        side.classList.remove('open');
        side.setAttribute('aria-hidden', 'true');
        $('overlay').hidden = true;
        document.body.classList.remove('locked');
        if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    }

    /* ===== EVENTOS ===== */
    $('login-form').addEventListener('submit', onLogin);
    $('activate-form').addEventListener('submit', onActivate);
    $('denied-logout').addEventListener('click', logout);
    $('logout').addEventListener('click', logout);
    document.querySelectorAll('[data-auth]').forEach(function (b) {
        b.addEventListener('click', function () { showAuth(b.dataset.auth); });
    });

    $('admin-tabs').addEventListener('click', function (e) {
        var tab = e.target.closest('.admin-tab');
        if (tab) setTab(tab.dataset.tab);
    });
    $('refresh').addEventListener('click', async function () {
        await loadAll();
        toast('Datos actualizados');
    });
    $('orders-search').addEventListener('input', function (e) {
        view.orderQuery = e.target.value;
        renderOrders();
    });
    $('products-search').addEventListener('input', function (e) {
        view.productQuery = e.target.value;
        renderProducts();
    });
    $('products-cat').addEventListener('change', function (e) {
        view.productCat = e.target.value;
        renderProducts();
    });
    $('products-low').addEventListener('change', function (e) {
        view.productLow = e.target.checked;
        renderProducts();
    });
    $('product-new').addEventListener('click', function () { openProduct(null); });
    $('coupon-form').addEventListener('submit', onCouponCreate);
    $('vehicle-form').addEventListener('submit', onVehicleCreate);
    $('settings-form').addEventListener('submit', onSettingsSave);
    $('admin-form').addEventListener('submit', onAdminAdd);
    $('password-form').addEventListener('submit', onPasswordChange);

    $('side-close').addEventListener('click', closeSide);
    $('overlay').addEventListener('click', closeSide);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeSide();
    });

    /* ===== INICIO ===== */
    (async function boot() {
        if (!DB) {
            showAuth('login-form', 'Falta la configuración de la base de datos (supabase-config.js).');
            return;
        }
        loadSession();
        if (session) await enterApp();
        else showAuth('login-form');
    })();
})();

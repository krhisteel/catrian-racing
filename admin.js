(function () {
    var DB = window.CATRIAN_SUPABASE;
    var SESSION_KEY = 'catrian-admin-session';
    var ACTIVITY_KEY = 'catrian-admin-activity';
    // Por seguridad la sesión no queda guardada: dura mientras el navegador esté abierto
    // y se cierra sola tras 20 minutos sin actividad.
    var IDLE_LIMIT = 20 * 60 * 1000;
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
            if (s) {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
                markActivity();
            } else {
                sessionStorage.removeItem(SESSION_KEY);
                sessionStorage.removeItem(ACTIVITY_KEY);
            }
        } catch (e) { /* sin almacenamiento: la sesión dura mientras la página esté abierta */ }
    }

    function loadSession() {
        // Versiones anteriores guardaban la sesión de forma permanente: se elimina.
        try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* sin almacenamiento */ }
        try {
            var s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
            var last = Number(sessionStorage.getItem(ACTIVITY_KEY) || 0);
            if (s && s.access_token && s.refresh_token && Date.now() - last < IDLE_LIMIT) session = s;
            else saveSession(null);
        } catch (e) { session = null; }
    }

    var lastActivity = Date.now();
    function markActivity() {
        lastActivity = Date.now();
        try { sessionStorage.setItem(ACTIVITY_KEY, String(lastActivity)); } catch (e) { /* sin almacenamiento */ }
    }

    var activityThrottle = 0;
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (type) {
        document.addEventListener(type, function () {
            if (!session || Date.now() - activityThrottle < 15000) return;
            activityThrottle = Date.now();
            markActivity();
        }, { passive: true, capture: true });
    });

    setInterval(function () {
        if (session && Date.now() - lastActivity > IDLE_LIMIT) {
            logout('Por seguridad cerramos tu sesión después de 20 minutos sin actividad. Ingresa nuevamente.');
        }
    }, 30000);

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

    async function logout(message) {
        try { await raw('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* la sesión igual se cierra */ }
        saveSession(null);
        closeSide();
        showAuth('login-form', typeof message === 'string' ? message : 'Sesión cerrada.', true);
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
            loadPaymentConfig();
            loadEmailConfig();
            loadAutomations();
            loadReviews();
            loadBookings();
            loadLeads();
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

        renderStats();

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

    /* ===== ESTADÍSTICAS ===== */
    var statsDays = 30;

    function dayKey(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function renderStats() {
        var range = $('stats-range');
        range.textContent = '';
        [[7, '7 días'], [30, '30 días'], [90, '90 días']].forEach(function (r) {
            range.appendChild(button(r[1], 'chip' + (statsDays === r[0] ? ' active' : ''), function () { statsDays = r[0]; renderStats(); }));
        });

        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var start = new Date(today);
        start.setDate(start.getDate() - statsDays + 1);
        var sold = data.orders.filter(function (o) { return SOLD.indexOf(o.status) !== -1 && new Date(o.created_at) >= start; });

        // Con 90 días se agrupa por semana para que las barras se lean.
        var step = statsDays > 30 ? 7 : 1;
        var buckets = [];
        for (var d = new Date(start); d <= today; d.setDate(d.getDate() + step)) {
            var end = new Date(d);
            end.setDate(end.getDate() + step);
            buckets.push({ from: new Date(d), to: end, total: 0, count: 0 });
        }
        sold.forEach(function (o) {
            var t = new Date(o.created_at);
            for (var i = 0; i < buckets.length; i++) {
                if (t >= buckets[i].from && t < buckets[i].to) { buckets[i].total += o.total; buckets[i].count++; break; }
            }
        });
        var total = sold.reduce(function (sum, o) { return sum + o.total; }, 0);

        var hero = $('stats-hero');
        hero.textContent = '';
        [[money(total), 'vendido'], [String(sold.length), sold.length === 1 ? 'pedido' : 'pedidos'],
            [sold.length ? money(Math.round(total / sold.length)) : '—', 'ticket promedio']].forEach(function (h) {
            var item = el('div', 'stats-num');
            item.appendChild(el('strong', '', h[0]));
            item.appendChild(el('span', '', h[1]));
            hero.appendChild(item);
        });

        var label = function (b) {
            var opts = { day: 'numeric', month: 'short' };
            if (step === 1) return b.from.toLocaleDateString('es-CL', opts);
            var last = new Date(b.to);
            last.setDate(last.getDate() - 1);
            return b.from.toLocaleDateString('es-CL', opts) + ' – ' + last.toLocaleDateString('es-CL', opts);
        };
        drawSalesChart(buckets, label);

        var table = el('table', 'admin-table');
        var head = el('tr');
        [step === 1 ? 'Día' : 'Semana', 'Pedidos', 'Ventas'].forEach(function (h) { head.appendChild(el('th', '', h)); });
        table.appendChild(head);
        buckets.slice().reverse().forEach(function (b) {
            var tr = el('tr');
            tr.appendChild(el('td', '', label(b)));
            tr.appendChild(el('td', '', String(b.count)));
            tr.appendChild(el('td', '', money(b.total)));
            table.appendChild(tr);
        });
        var tableWrap = $('sales-table');
        tableWrap.textContent = '';
        tableWrap.appendChild(table);

        // Más vendidos por monto en el mismo periodo.
        var byProduct = {};
        sold.forEach(function (o) {
            (o.items || []).forEach(function (it) {
                var row = byProduct[it.id] = byProduct[it.id] || { name: it.name, qty: 0, total: 0 };
                row.qty += it.qty;
                row.total += it.price * it.qty;
            });
        });
        var top = Object.keys(byProduct).map(function (k) { return byProduct[k]; })
            .sort(function (a, b) { return b.total - a.total; }).slice(0, 6);
        $('top-note').textContent = 'Por monto vendido en los últimos ' + statsDays + ' días.';
        var wrap = $('top-products');
        wrap.textContent = '';
        if (!top.length) wrap.appendChild(el('p', 'admin-empty', 'Aún no hay ventas en este periodo.'));
        top.forEach(function (t) {
            var row = el('div', 'top-row');
            var name = el('div', 'top-name');
            name.appendChild(el('span', '', t.name));
            name.appendChild(el('strong', '', money(t.total)));
            row.appendChild(name);
            var track = el('div', 'top-track');
            var bar = el('span', 'top-bar');
            bar.style.width = Math.max(2, t.total / top[0].total * 100) + '%';
            track.appendChild(bar);
            row.appendChild(track);
            row.appendChild(el('span', 'top-qty', t.qty + (t.qty === 1 ? ' unidad' : ' unidades')));
            wrap.appendChild(row);
        });
    }

    function drawSalesChart(buckets, label) {
        var box = $('sales-chart');
        box.textContent = '';
        var NS = 'http://www.w3.org/2000/svg';
        var W = Math.max(280, Math.round(box.clientWidth) || 640), H = 220, padL = 56, padB = 26, padT = 10, padR = 8;
        var max = Math.max.apply(null, buckets.map(function (b) { return b.total; }));
        var niceMax = max > 0 ? niceCeil(max) : 100000;
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Ventas por ' + (buckets.length && buckets[0].to - buckets[0].from > 86400000 * 2 ? 'semana' : 'día') + '. Detalle en «Ver como tabla».');
        function node(tag, attrs, text) {
            var n = document.createElementNS(NS, tag);
            Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
            if (text !== undefined) n.textContent = text;
            svg.appendChild(n);
            return n;
        }
        var plotH = H - padT - padB, plotW = W - padL - padR;
        [0, 0.5, 1].forEach(function (f) {
            var y = padT + plotH * (1 - f);
            node('line', { x1: padL, x2: W - padR, y1: y, y2: y, class: f === 0 ? 'chart-base' : 'chart-grid' });
            node('text', { x: padL - 8, y: y + 4, 'text-anchor': 'end', class: 'chart-axis' }, shortMoney(niceMax * f));
        });
        var slot = plotW / buckets.length;
        var barW = Math.max(3, Math.min(28, slot - 2));
        var labelEvery = Math.ceil(buckets.length / Math.max(3, Math.floor(plotW / 70)));
        var tip = el('div', 'chart-tip');
        tip.hidden = true;
        buckets.forEach(function (b, i) {
            var h = b.total / niceMax * plotH;
            var x = padL + slot * i + (slot - barW) / 2;
            var y = padT + plotH - h;
            if (h > 0) {
                var r = Math.min(4, barW / 2, h);
                // Barra con esquinas superiores redondeadas y base recta sobre el eje.
                node('path', {
                    class: 'chart-bar',
                    d: 'M' + x + ',' + (padT + plotH) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
                        'H' + (x + barW - r) + 'Q' + (x + barW) + ',' + y + ' ' + (x + barW) + ',' + (y + r) + 'V' + (padT + plotH) + 'Z'
                });
            }
            if (i % labelEvery === 0) {
                node('text', { x: padL + slot * i + slot / 2, y: H - 8, 'text-anchor': 'middle', class: 'chart-axis' },
                    axisLabel(b));
            }
            var hit = node('rect', { x: padL + slot * i, y: padT, width: slot, height: plotH, class: 'chart-hit', tabindex: '0' });
            function showTip() {
                tip.hidden = false;
                tip.textContent = '';
                tip.appendChild(el('strong', '', label(b)));
                tip.appendChild(el('span', '', money(b.total) + ' · ' + b.count + (b.count === 1 ? ' pedido' : ' pedidos')));
                var rect = box.getBoundingClientRect();
                var px = (padL + slot * i + slot / 2) / W * rect.width;
                tip.style.left = Math.min(Math.max(px, 70), rect.width - 70) + 'px';
                hit.classList.add('on');
            }
            function hideTip() { tip.hidden = true; hit.classList.remove('on'); }
            hit.addEventListener('mouseenter', showTip);
            hit.addEventListener('focus', showTip);
            hit.addEventListener('mouseleave', hideTip);
            hit.addEventListener('blur', hideTip);
        });
        box.appendChild(svg);
        box.appendChild(tip);
    }

    function axisLabel(b) {
        return b.from.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '');
    }

    function niceCeil(v) {
        var p = Math.pow(10, Math.floor(Math.log10(v)));
        var n = v / p;
        return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
    }

    function shortMoney(v) {
        if (v >= 1000000) return '$' + (v / 1000000).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' M';
        if (v >= 1000) return '$' + Math.round(v / 1000) + ' mil';
        return '$' + Math.round(v);
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
        who.appendChild(el('span', 'row-sub', o.delivery === 'despacho'
            ? 'Despacho · ' + (o.commune || '') + (o.tracking_number ? ' · 🚚 ' + (o.courier || '') + ' ' + o.tracking_number : '')
            : 'Retiro en tienda'));
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
            if (o.delivery === 'despacho' && ['nuevo', 'confirmado', 'pagado'].indexOf(o.status) !== -1) {
                row.appendChild(quickShip(o));
            }
        }
        return row;
    }

    async function updateOrder(o, patch) {
        try {
            var rows = await api('/rest/v1/orders?id=eq.' + encodeURIComponent(o.id), {
                method: 'PATCH', body: patch, headers: { Prefer: 'return=representation' }
            });
            var before = o.status;
            Object.assign(o, rows[0]);
            if (o.status !== before) {
                toast(patch.tracking_number && o.status === 'enviado'
                    ? 'Pedido ' + o.ref + ' despachado. El cliente ya lo ve en «Mi pedido».'
                    : 'Pedido ' + o.ref + ': ' + statusLabel(o.status));
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
        if (o.mp_status || o.mp_preference_id) {
            var mpText = { approved: 'Aprobado', pending: 'Pendiente', in_process: 'En revisión', rejected: 'Rechazado', cancelled: 'Cancelado', refunded: 'Devuelto' }[o.mp_status] || 'Iniciado, sin pago aún';
            detail(client, 'Mercado Pago', mpText + (o.mp_payment_id ? ' · ID ' + o.mp_payment_id : ''));
        }
        if (o.notes) detail(client, 'Notas del cliente', o.notes);
        body.appendChild(client);

        // Boleta o factura
        var docBox = el('div', 'detail-block');
        docBox.appendChild(el('h3', '', o.doc_type === 'factura' ? 'Factura' : 'Boleta'));
        if (o.doc_type === 'factura' && o.billing) {
            detail(docBox, 'RUT', formatRut(o.billing.rut));
            detail(docBox, 'Razón social', o.billing.razon_social);
            detail(docBox, 'Giro', o.billing.giro);
            detail(docBox, 'Dirección', o.billing.direccion);
        }
        var docNumber = input('text', o.doc_number || '', { placeholder: 'Ej: 1234', maxlength: 40 });
        var docUrl = input('url', o.doc_url || '', { placeholder: 'https://... (o sube el PDF)' });
        var dgrid = el('div', 'form-grid');
        dgrid.appendChild(field('N° de ' + (o.doc_type === 'factura' ? 'factura' : 'boleta'), docNumber));
        dgrid.appendChild(field('Enlace al PDF', docUrl));
        docBox.appendChild(dgrid);
        var docFile = input('file', '', { accept: 'application/pdf' });
        docFile.hidden = true;
        docFile.addEventListener('change', async function () {
            var f = docFile.files[0];
            if (!f) return;
            if (f.type !== 'application/pdf') return toast('Sube el documento en PDF.', true);
            if (f.size > 5 * 1024 * 1024) return toast('El PDF debe pesar menos de 5 MB.', true);
            try {
                var path = o.ref + '-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)) + '.pdf';
                await api('/storage/v1/object/documentos/' + path, { method: 'POST', body: f, headers: { 'Content-Type': 'application/pdf' } });
                docUrl.value = DB.url + '/storage/v1/object/public/documentos/' + path;
                toast('PDF subido. Guarda para que el cliente lo vea.');
            } catch (e) { toast(e.message, true); }
            docFile.value = '';
        });
        docBox.appendChild(docFile);
        docBox.appendChild(button('Subir PDF', 'btn btn-sm btn-ghost', function () { docFile.click(); }));
        docBox.appendChild(el('p', 'admin-help', 'Al guardar con el enlace, el cliente puede descargar el documento desde «Mi pedido» y le llega por correo si dejó su email.'));
        body.appendChild(docBox);

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
        totalRow(items, 'Envío', o.delivery === 'retiro' ? 'Retiro' : (o.shipping_pending ? 'A cotizar' : (o.shipping ? money(o.shipping) + ' · ' + (o.region || '') : 'Gratis')));
        totalRow(items, 'Total', money(o.total) + (o.shipping_pending ? ' + envío' : ''), true);
        body.appendChild(items);

        // Envío y seguimiento
        var track = el('div', 'detail-block');
        track.appendChild(el('h3', '', o.delivery === 'despacho' ? 'Envío y seguimiento' : 'Seguimiento'));
        var courier = null;
        var trackNumber = null;
        var trackUrl = null;
        if (o.delivery === 'despacho') {
            courier = courierSelect(o.courier);
            trackNumber = input('text', o.tracking_number || '', { placeholder: 'N° de seguimiento u orden de flete', maxlength: 80 });
            trackUrl = input('url', o.tracking_url || '', { placeholder: 'https://... (se completa solo)' });
            track.appendChild(el('p', 'admin-help', 'Solo elige la empresa y escribe el número: al guardar, el pedido pasa solo a «Enviado» y el cliente lo ve en «Mi pedido».'));
            var tgrid = el('div', 'form-grid');
            tgrid.appendChild(field('Empresa de transporte', courier));
            tgrid.appendChild(field('N° de seguimiento', trackNumber));
            track.appendChild(tgrid);
            var more = el('details', 'track-more');
            more.appendChild(el('summary', '', 'Enlace exacto de seguimiento (opcional)'));
            more.appendChild(field('Enlace', trackUrl));
            track.appendChild(more);
            var shipNow = button(o.tracking_number ? 'Guardar seguimiento' : 'Guardar y despachar', 'btn btn-sm btn-primary', async function () {
                if (!courier.value) return toast('Elige la empresa de transporte.', true);
                if (!trackNumber.value.trim()) return toast('Escribe el número de seguimiento.', true);
                var url = trackUrl.value.trim();
                if (url && !/^https:\/\//.test(url)) return toast('El enlace debe empezar con https://', true);
                if (await updateOrder(o, { courier: courier.value, tracking_number: trackNumber.value.trim(), tracking_url: url || null })) closeSide();
            });
            track.appendChild(shipNow);
        }
        var link = trackingPageUrl(o.ref);
        var linkRow = el('p', 'admin-help');
        linkRow.appendChild(document.createTextNode('El cliente ve su pedido en '));
        var linkA = el('a', '', 'Mi pedido');
        linkA.href = link;
        linkA.target = '_blank';
        linkA.rel = 'noopener';
        linkRow.appendChild(linkA);
        linkRow.appendChild(document.createTextNode(' con el N° ' + o.ref + ' y los últimos 4 dígitos de su teléfono.'));
        track.appendChild(linkRow);
        var sendTrack = button('Avisar también por WhatsApp (opcional)', 'btn btn-sm btn-ghost', function () {
            var lines = ['Hola ' + o.name + '! Te escribimos de Catrian Racing.', ''];
            lines.push('Tu pedido ' + o.ref + ' está: ' + trackingStatusLabel(status.value, o.delivery) + '.');
            if (courier && courier.value.trim()) lines.push('Empresa de transporte: ' + courier.value.trim());
            if (trackNumber && trackNumber.value.trim()) lines.push('N° de seguimiento: ' + trackNumber.value.trim());
            if (trackUrl && /^https:\/\//.test(trackUrl.value.trim())) lines.push('Rastrea el envío aquí: ' + trackUrl.value.trim());
            lines.push('');
            lines.push('Puedes ver el estado de tu pedido en: ' + link);
            lines.push('(Usa los últimos 4 dígitos de tu teléfono.)');
            window.open('https://wa.me/' + waPhone(o.phone) + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
        });
        track.appendChild(sendTrack);
        body.appendChild(track);

        var notes = input('textarea', o.admin_notes || '', { rows: 3, placeholder: 'Ej: pagó con link de pago, cliente pidió llamar antes de entregar...' });
        body.appendChild(field('Notas internas (solo las ves tú)', notes));

        var actions = el('div', 'side-actions');
        actions.appendChild(button('Guardar cambios', 'btn btn-sm btn-primary', async function () {
            var patch = { admin_notes: notes.value.trim() || null };
            var dUrl = docUrl.value.trim();
            if (dUrl && !/^https:\/\//.test(dUrl)) return toast('El enlace del documento debe empezar con https://', true);
            if ((o.doc_url || '') !== dUrl) patch.doc_url = dUrl || null;
            if ((o.doc_number || '') !== docNumber.value.trim()) patch.doc_number = docNumber.value.trim() || null;
            if (status.value !== o.status) patch.status = status.value;
            if (courier) {
                var url = trackUrl.value.trim();
                if (url && !/^https:\/\//.test(url)) return toast('El enlace de seguimiento debe empezar con https://', true);
                patch.courier = courier.value.trim() || null;
                patch.tracking_number = trackNumber.value.trim() || null;
                patch.tracking_url = url || null;
                if (patch.status === 'enviado' && !patch.tracking_number && !confirm('Vas a marcar el pedido como enviado sin número de seguimiento. ¿Continuar?')) return;
                if (patch.tracking_number && !patch.courier) return toast('Elige la empresa de transporte.', true);
            }
            if (await updateOrder(o, patch)) closeSide();
        }));
        if (/tarjeta/i.test(o.payment || '') && data.payment && data.payment.mp_enabled) {
            actions.appendChild(button('Verificar pago', 'btn btn-sm btn-ghost', async function () {
                try {
                    var st = await api('/rest/v1/rpc/admin_mp_check', { method: 'POST', body: { p_order_id: o.id } });
                    var rows = await api('/rest/v1/orders?id=eq.' + encodeURIComponent(o.id));
                    if (rows[0]) Object.assign(o, rows[0]);
                    toast(st === 'approved' ? 'Pago aprobado en Mercado Pago' : (st === 'none' ? 'Aún no hay pagos para este pedido' : 'Estado en Mercado Pago: ' + st));
                    renderAll();
                    openOrder(o);
                } catch (e) { toast(e.message, true); }
            }));
        }
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
        if (o.email) renderOrderEmails(o, body);
    }

    var EMAIL_KINDS = { recibido: 'Pedido recibido', confirmado: 'Pedido confirmado', pagado: 'Pago recibido', entregado: 'Pedido entregado', cancelado: 'Pedido cancelado' };

    async function renderOrderEmails(o, body) {
        var rows;
        try {
            rows = await api('/rest/v1/rpc/admin_order_emails', { method: 'POST', body: { p_order: o.id } });
        } catch (e) { return; }
        if (!rows || !rows.length || !document.contains(body)) return;
        var box = el('div', 'detail-block');
        box.appendChild(el('h3', '', 'Correos al cliente'));
        rows.forEach(function (r) {
            var name = /^enviado/.test(r.kind) ? 'Pedido despachado' + (r.kind.length > 8 ? ' (N° ' + r.kind.slice(8) + ')' : '') : (EMAIL_KINDS[r.kind] || r.kind);
            var state = r.status == null ? 'en cola' : (r.status < 300 ? 'enviado' : 'error ' + r.status);
            detail(box, fmtDate(r.created_at), name + ' · ' + state);
        });
        body.appendChild(box);
    }

    var COURIERS = ['Starken', 'Chilexpress', 'Blue Express', 'Correos de Chile', '99minutos', 'Despacho propio'];

    function courierSelect(value) {
        var sel = select([['', 'Empresa...']].concat(COURIERS.map(function (c) { return [c, c]; })), value || '');
        if (value && COURIERS.indexOf(value) === -1) {
            var o = el('option', '', value);
            o.value = value;
            sel.appendChild(o);
            sel.value = value;
        }
        return sel;
    }

    // Despacho rápido desde la lista: empresa + N° → el pedido pasa solo a «Enviado».
    function quickShip(o) {
        var form = el('form', 'quick-ship');
        form.noValidate = true;
        form.appendChild(el('span', 'quick-ship-label', 'Despachar:'));
        var c = courierSelect(o.courier);
        c.setAttribute('aria-label', 'Empresa de transporte del pedido ' + o.ref);
        var n = input('text', '', { placeholder: 'N° de seguimiento', maxlength: 80, 'aria-label': 'N° de seguimiento del pedido ' + o.ref });
        var b = el('button', 'btn btn-sm btn-primary', 'Guardar');
        b.type = 'submit';
        form.appendChild(c);
        form.appendChild(n);
        form.appendChild(b);
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!c.value) return toast('Elige la empresa de transporte.', true);
            if (!n.value.trim()) return toast('Escribe el número de seguimiento.', true);
            b.disabled = true;
            updateOrder(o, { courier: c.value, tracking_number: n.value.trim() }).then(function () { b.disabled = false; });
        });
        return form;
    }

    function trackingPageUrl(ref) {
        return new URL('index.html', location.href).href.split('#')[0] + '#seguimiento/' + ref;
    }

    function trackingStatusLabel(status, delivery) {
        var pickup = delivery === 'retiro';
        return {
            nuevo: 'recibido',
            confirmado: 'confirmado',
            pagado: 'pagado',
            enviado: pickup ? 'listo para retiro en tienda' : 'en camino',
            entregado: pickup ? 'retirado' : 'entregado',
            cancelado: 'cancelado'
        }[status] || status;
    }

    function formatRut(value) {
        var v = String(value || '').replace(/[^0-9kK]/g, '').toUpperCase();
        if (v.length < 2) return v;
        return v.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + v.slice(-1);
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
            var waiting = data.auto && data.auto.waiting ? data.auto.waiting[p.id] : 0;
            if (waiting) controls.appendChild(el('span', 'stock-pill waiting', waiting + (waiting === 1 ? ' espera aviso' : ' esperan aviso')));
            if (p.quote) {
                controls.appendChild(el('span', 'stock-pill', 'Cotización'));
            } else if (p.option_stock) {
                var pill = el('button', 'stock-pill', 'Stock ' + (p.stock || 0) + ' · por opción');
                pill.type = 'button';
                pill.title = Object.keys(p.option_stock).map(function (k) { return k + ': ' + p.option_stock[k]; }).join(' · ');
                pill.addEventListener('click', function () { openProduct(p); });
                controls.appendChild(pill);
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
        f.sku = input('text', p.sku || '', { placeholder: 'Ej: NGK-CR8E (opcional)', maxlength: 40 });
        f.warranty = input('text', p.warranty || '', { placeholder: 'Vacío = Garantía legal de 6 meses', maxlength: 80 });

        form.appendChild(datalist('dl-subs', uniqValues('sub')));
        form.appendChild(datalist('dl-brands', uniqValues('brand')));
        form.appendChild(datalist('dl-badges', ['Nuevo', 'Más vendido', 'Oferta', 'Últimas unidades']));

        // Fotos: la primera es la principal (se ve en el catálogo); la segunda aparece al pasar el mouse.
        var imgs = (p.images && p.images.length) ? p.images.slice() : (p.img ? [p.img] : []);
        var photos = el('fieldset', 'photos-box');
        photos.appendChild(el('legend', '', 'Fotos del producto'));
        photos.appendChild(el('p', 'admin-help', 'Recomendado: foto cuadrada del producto sobre fondo blanco, de al menos 800 × 800 px. La primera foto es la principal.'));
        var photoGrid = el('div', 'photo-grid');
        photos.appendChild(photoGrid);

        function renderPhotos() {
            photoGrid.textContent = '';
            imgs.forEach(function (src, i) {
                var item = el('div', 'photo-item' + (i === 0 ? ' main' : ''));
                var img = el('img');
                img.src = src;
                img.alt = 'Foto ' + (i + 1);
                img.onerror = function () { img.classList.add('broken'); };
                item.appendChild(img);
                if (i === 0) item.appendChild(el('span', 'photo-main-tag', 'Principal'));
                var actions = el('div', 'photo-actions');
                if (i > 0) {
                    actions.appendChild(button('★', 'photo-btn', function () {
                        imgs.unshift(imgs.splice(i, 1)[0]);
                        renderPhotos();
                    }));
                    actions.lastChild.setAttribute('aria-label', 'Usar como foto principal');
                    actions.lastChild.title = 'Usar como principal';
                    actions.appendChild(button('←', 'photo-btn', function () {
                        var tmp = imgs[i - 1];
                        imgs[i - 1] = imgs[i];
                        imgs[i] = tmp;
                        renderPhotos();
                    }));
                    actions.lastChild.setAttribute('aria-label', 'Mover a la izquierda');
                }
                actions.appendChild(button('✕', 'photo-btn danger', function () {
                    imgs.splice(i, 1);
                    renderPhotos();
                }));
                actions.lastChild.setAttribute('aria-label', 'Quitar foto');
                item.appendChild(actions);
                photoGrid.appendChild(item);
            });

            var file = el('input');
            file.type = 'file';
            file.accept = 'image/jpeg,image/png,image/webp';
            file.multiple = true;
            file.className = 'sr-only';
            file.id = 'f-file';
            var add = el('label', 'photo-add');
            add.htmlFor = 'f-file';
            add.appendChild(el('strong', '', '+'));
            add.appendChild(el('span', '', 'Subir fotos'));
            file.addEventListener('change', async function () {
                var picked = Array.prototype.slice.call(file.files);
                file.value = '';
                for (var k = 0; k < picked.length; k++) {
                    if (picked[k].size > 5 * 1024 * 1024) {
                        toast(picked[k].name + ' pesa más de 5 MB.', true);
                        continue;
                    }
                    add.lastChild.textContent = 'Subiendo ' + (k + 1) + '/' + picked.length + '...';
                    try {
                        imgs.push(await uploadImage(picked[k], p.id || slugify(f.name.value)));
                    } catch (e) { toast(e.message, true); }
                }
                renderPhotos();
                if (picked.length) toast(picked.length === 1 ? 'Foto subida' : 'Fotos subidas');
            });
            photoGrid.appendChild(add);
            photoGrid.appendChild(file);
        }
        renderPhotos();

        var urlRow = el('div', 'photo-url');
        var urlInput = input('url', '', { placeholder: 'o pega el enlace de una imagen (https://...)' });
        urlInput.setAttribute('aria-label', 'Enlace de una imagen');
        urlRow.appendChild(urlInput);
        urlRow.appendChild(button('Agregar', 'btn btn-sm btn-ghost', function () {
            var url = urlInput.value.trim();
            if (!/^https?:\/\//.test(url)) return toast('Pega un enlace que empiece con https://', true);
            imgs.push(url);
            urlInput.value = '';
            renderPhotos();
        }));
        photos.appendChild(urlRow);
        form.appendChild(photos);

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
        grid.appendChild(field('Código (SKU)', f.sku));
        grid.appendChild(field('Garantía', f.warranty));
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

        // Stock por opción: cada talla/medida con su propio stock; el total se calcula solo.
        var optStock = Object.assign({}, p.option_stock || {});
        var varBox = el('fieldset', 'variant-stock');
        varBox.appendChild(el('legend', '', 'Stock por opción'));
        f.byOption = checkbox('Controlar el stock de cada opción por separado', !!p.option_stock);
        varBox.appendChild(f.byOption.wrap);
        var varGrid = el('div', 'variant-grid');
        varBox.appendChild(varGrid);
        form.appendChild(varBox);
        function currentOptions() {
            return f.optValues.value.split(',').map(function (v) { return v.trim(); }).filter(Boolean);
        }
        function renderVariantStock() {
            varGrid.querySelectorAll('input').forEach(function (i) { optStock[i.dataset.option] = i.value; });
            varGrid.textContent = '';
            var values = currentOptions();
            varBox.hidden = !values.length;
            var on = f.byOption.input.checked && values.length > 0;
            f.stock.disabled = on;
            if (on) f.stock.placeholder = 'Se suma desde cada opción';
            else f.stock.placeholder = 'Vacío = sin control de stock';
            if (!on) return;
            var total = 0;
            values.forEach(function (v) {
                var i = input('number', optStock[v] === undefined ? '' : optStock[v], { min: 0, step: 1, placeholder: '0' });
                i.dataset.option = v;
                i.addEventListener('input', function () {
                    var sum = 0;
                    varGrid.querySelectorAll('input').forEach(function (x) { sum += Math.max(0, parseInt(x.value, 10) || 0); });
                    f.stock.value = sum;
                });
                total += Math.max(0, parseInt(i.value, 10) || 0);
                varGrid.appendChild(field(v, i));
            });
            f.stock.value = total;
        }
        f.optValues.addEventListener('change', renderVariantStock);
        f.byOption.input.addEventListener('change', renderVariantStock);
        renderVariantStock();
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
                img: imgs[0] || null,
                images: imgs,
                sku: f.sku.value.trim() || null,
                warranty: f.warranty.value.trim() || null,
                desc: f.desc.value.trim(),
                specs: specs,
                options: optValues.length ? { name: f.optName.value.trim(), values: optValues } : null,
                option_stock: null,
                fits: fitIds,
                badge: f.badge.value.trim() || null,
                quote: f.quote.input.checked,
                cc: num(f.cc.value),
                free_ship: f.freeShip.input.checked,
                active: f.active.input.checked,
                sort: parseInt(f.sort.value, 10) || 0
            };
            if (row.compare !== null && row.compare <= row.price) row.compare = null;
            if (optValues.length && f.byOption.input.checked) {
                row.option_stock = {};
                varGrid.querySelectorAll('input').forEach(function (i) {
                    row.option_stock[i.dataset.option] = Math.max(0, parseInt(i.value, 10) || 0);
                });
            }

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
            var used = data.orders.filter(function (o) { return o.coupon === c.code && o.status !== 'cancelado'; }).length;
            var expired = c.expires_at && new Date(c.expires_at) < new Date();
            var rules = ['Usado ' + used + (c.max_uses ? ' de ' + c.max_uses : '') + (used === 1 ? ' vez' : ' veces')];
            if (c.min_subtotal) rules.push('desde ' + money(c.min_subtotal));
            if (c.expires_at) rules.push((expired ? 'venció el ' : 'vence el ') + new Date(c.expires_at).toLocaleDateString('es-CL'));
            title.appendChild(el('span', 'row-sub', rules.join(' · ')));
            main.appendChild(title);
            main.appendChild(el('span', 'row-col row-money', couponBenefit(c)));
            if (expired || (c.max_uses && used >= c.max_uses)) row.classList.add('inactive');
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

    function couponBenefit(c) {
        var parts = [];
        if (c.percent) parts.push(c.percent + '% de descuento');
        if (c.amount) parts.push(money(c.amount) + ' de descuento');
        if (c.free_shipping) parts.push('Envío gratis');
        return parts.join(' + ');
    }

    function syncCouponKind() {
        var kind = $('coupon-kind').value;
        $('coupon-value-wrap').hidden = kind === 'free_shipping';
        $('coupon-value-label').textContent = kind === 'amount' ? 'Monto de descuento ($)' : '% de descuento';
        $('coupon-value').placeholder = kind === 'amount' ? '5000' : '10';
    }

    async function onCouponCreate(e) {
        e.preventDefault();
        var code = $('coupon-code').value.trim().toUpperCase().replace(/\s+/g, '');
        var kind = $('coupon-kind').value;
        var value = parseInt($('coupon-value').value, 10);
        var row = { code: code, percent: 0, amount: 0, free_shipping: kind === 'free_shipping' };
        if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return toast('El código debe tener de 3 a 30 letras o números, sin espacios.', true);
        if (kind === 'percent') {
            if (!(value >= 1 && value <= 90)) return toast('El descuento debe estar entre 1% y 90%.', true);
            row.percent = value;
        } else if (kind === 'amount') {
            if (!(value >= 100)) return toast('Escribe el monto de descuento en pesos.', true);
            row.amount = value;
        }
        var min = parseInt($('coupon-min').value, 10);
        var max = parseInt($('coupon-max').value, 10);
        if (min > 0) row.min_subtotal = min;
        if (max > 0) row.max_uses = max;
        if ($('coupon-expires').value) {
            // Vence al final del día elegido, en hora de Chile (del navegador).
            row.expires_at = new Date($('coupon-expires').value + 'T23:59:59').toISOString();
            if (new Date(row.expires_at) < new Date()) return toast('La fecha de vencimiento ya pasó.', true);
        }
        try {
            var rows = await api('/rest/v1/coupons', { method: 'POST', body: row, headers: { Prefer: 'return=representation' } });
            data.coupons.unshift(rows[0]);
            e.target.reset();
            syncCouponKind();
            toast('Cupón ' + code + ' creado');
            renderCoupons();
        } catch (err) {
            toast(err.status === 409 ? 'Ya existe un cupón con ese código.' : err.message, true);
        }
    }

    /* ===== COTIZACIONES ===== */
    var leadFilter = 'nuevo';
    var LEAD_STATES = [['nuevo', 'Nueva'], ['contactado', 'Contactado'], ['cerrado', 'Cerrada'], ['descartado', 'Descartada']];
    var LEAD_LABELS = { pie: 'Pie', plazo: 'Plazo', cuota: 'Cuota aprox.', precio: 'Precio', marca: 'Marca', modelo: 'Modelo', anio: 'Año',
        km: 'Km', estado: 'Estado', valor_esperado: 'Espera recibir', comentario: 'Comentario', rut: 'RUT', renta: 'Renta' };

    async function loadLeads() {
        try {
            data.leads = await api('/rest/v1/leads?select=*&order=created_at.desc&limit=500');
        } catch (e) {
            data.leads = [];
        }
        renderLeads();
    }

    function renderLeads() {
        var list = data.leads || [];
        var fresh = list.filter(function (l) { return l.status === 'nuevo'; }).length;
        $('badge-leads').hidden = !fresh;
        $('badge-leads').textContent = fresh;
        var chips = $('leads-filter');
        chips.textContent = '';
        [['nuevo', 'Nuevas'], ['contactado', 'Contactadas'], ['cerrado', 'Cerradas'], ['descartado', 'Descartadas'], ['todas', 'Todas']].forEach(function (st) {
            var n = st[0] === 'todas' ? list.length : list.filter(function (l) { return l.status === st[0]; }).length;
            chips.appendChild(button(st[1] + ' (' + n + ')',
                'chip' + (leadFilter === st[0] ? ' active' : ''), function () { leadFilter = st[0]; renderLeads(); }));
        });
        var wrap = $('leads-list');
        wrap.textContent = '';
        var shown = list.filter(function (l) { return leadFilter === 'todas' || l.status === leadFilter; });
        if (!shown.length) wrap.appendChild(el('p', 'admin-empty', 'No hay solicitudes aquí.'));
        shown.forEach(function (l) {
            var prod = data.products.filter(function (p) { return p.id === l.product_id; })[0];
            var row = el('div', 'admin-row review-row');
            var main = el('div', 'row-main static');
            var title = el('span', 'row-title');
            title.appendChild(el('strong', '', (l.kind === 'financiamiento' ? 'Financiamiento' : 'Parte de pago') + (prod ? ' · ' + prod.name : '') + ' · ' + l.ref));
            title.appendChild(el('span', 'row-sub', l.name + ' · ' + l.phone + (l.email ? ' · ' + l.email : '') + ' · ' + fmtDate(l.created_at)));
            var d = l.details || {};
            var info = Object.keys(LEAD_LABELS).filter(function (k) { return d[k]; }).map(function (k) { return LEAD_LABELS[k] + ': ' + d[k]; }).join(' · ');
            if (info) title.appendChild(el('span', 'review-body', info));
            main.appendChild(title);
            row.appendChild(main);
            var controls = el('div', 'row-controls');
            var status = select(LEAD_STATES, l.status);
            status.className = 'admin-input status-select';
            status.setAttribute('aria-label', 'Estado de ' + l.ref);
            status.addEventListener('change', async function () {
                try {
                    await api('/rest/v1/leads?id=eq.' + encodeURIComponent(l.id), { method: 'PATCH', body: { status: status.value } });
                    l.status = status.value;
                    toast('Solicitud ' + l.ref + ' actualizada');
                    renderLeads();
                } catch (e) { toast(e.message, true); status.value = l.status; }
            });
            controls.appendChild(status);
            var wa = el('a', 'btn btn-sm btn-ghost', 'WhatsApp');
            wa.href = 'https://wa.me/' + waPhone(l.phone) + '?text=' + encodeURIComponent('Hola ' + l.name + ', te escribimos de Catrian Racing por tu solicitud ' + l.ref +
                (l.kind === 'financiamiento' ? ' de financiamiento' + (prod ? ' para la ' + prod.name : '') : ' de parte de pago de tu ' + (d.marca || '') + ' ' + (d.modelo || '')) + '.');
            wa.target = '_blank';
            wa.rel = 'noopener';
            controls.appendChild(wa);
            controls.appendChild(button('Eliminar', 'btn btn-sm btn-danger', async function () {
                if (!confirm('¿Eliminar la solicitud ' + l.ref + '?')) return;
                try {
                    await api('/rest/v1/leads?id=eq.' + encodeURIComponent(l.id), { method: 'DELETE' });
                    data.leads = data.leads.filter(function (x) { return x.id !== l.id; });
                    renderLeads();
                } catch (e) { toast(e.message, true); }
            }));
            row.appendChild(controls);
            wrap.appendChild(row);
        });
    }

    function renderFinance() {
        var f = data.settings.financing || { enabled: true, rate: 1.89, min_down: 20, terms: [12, 24, 36, 48] };
        $('fin-enabled').checked = !!f.enabled;
        $('fin-rate').value = f.rate;
        $('fin-down').value = f.min_down;
        $('fin-terms').value = (f.terms || []).join(', ');
    }

    async function onFinanceSave(e) {
        e.preventDefault();
        var rate = parseFloat(String($('fin-rate').value).replace(',', '.'));
        var down = parseInt($('fin-down').value, 10);
        var terms = $('fin-terms').value.split(',').map(function (t) { return parseInt(t, 10); })
            .filter(function (t) { return t >= 3 && t <= 84; });
        if (isNaN(rate) || rate < 0 || rate > 10) return toast('La tasa mensual debe estar entre 0 y 10%.', true);
        if (isNaN(down) || down < 0 || down > 80) return toast('El pie mínimo debe estar entre 0 y 80%.', true);
        if (!terms.length) return toast('Escribe al menos un plazo entre 3 y 84 meses.', true);
        var value = { enabled: $('fin-enabled').checked, rate: rate, min_down: down, terms: terms.slice(0, 6) };
        try {
            await api('/rest/v1/settings?on_conflict=key', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: [{ key: 'financing', value: value }] });
            data.settings.financing = value;
            renderFinance();
            toast('Simulador guardado');
        } catch (err) { toast(err.message, true); }
    }

    /* ===== TALLER ===== */
    var bookingFilter = 'proximas';
    var BOOKING_STATES = [['pendiente', 'Pendiente'], ['confirmada', 'Confirmada'], ['completada', 'Completada'], ['cancelada', 'Cancelada']];

    async function loadBookings() {
        try {
            data.bookings = await api('/rest/v1/bookings?select=*&order=day.desc,slot.asc&limit=500');
        } catch (e) {
            data.bookings = [];
        }
        renderBookings();
    }

    function todayIso() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function renderBookings() {
        var list = data.bookings || [];
        var today = todayIso();
        var pending = list.filter(function (b) { return b.status === 'pendiente' && b.day >= today; }).length;
        var badge = $('badge-bookings');
        badge.hidden = !pending;
        badge.textContent = pending;

        var filters = [
            ['proximas', 'Próximas', function (b) { return b.day >= today && b.status !== 'cancelada'; }],
            ['pendiente', 'Por confirmar', function (b) { return b.status === 'pendiente' && b.day >= today; }],
            ['pasadas', 'Pasadas', function (b) { return b.day < today; }],
            ['cancelada', 'Canceladas', function (b) { return b.status === 'cancelada'; }]
        ];
        var chips = $('bookings-filter');
        chips.textContent = '';
        filters.forEach(function (f) {
            chips.appendChild(button(f[1] + ' (' + list.filter(f[2]).length + ')', 'chip' + (bookingFilter === f[0] ? ' active' : ''), function () {
                bookingFilter = f[0];
                renderBookings();
            }));
        });
        var active = filters.filter(function (f) { return f[0] === bookingFilter; })[0];
        var shown = list.filter(active[2]);
        if (bookingFilter !== 'pasadas') shown.sort(function (a, b) { return (a.day + a.slot).localeCompare(b.day + b.slot); });

        var wrap = $('bookings-list');
        wrap.textContent = '';
        if (!shown.length) wrap.appendChild(el('p', 'admin-empty', 'No hay reservas aquí.'));
        var lastDay = '';
        shown.forEach(function (b) {
            if (b.day !== lastDay) {
                lastDay = b.day;
                var dayName = new Date(b.day + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
                wrap.appendChild(el('h3', 'booking-day', (b.day === today ? 'Hoy · ' : '') + dayName));
            }
            var row = el('div', 'admin-row' + (b.status === 'cancelada' ? ' inactive' : ''));
            var main = el('div', 'row-main static');
            var title = el('span', 'row-title');
            title.appendChild(el('strong', '', b.slot + ' · ' + b.service));
            title.appendChild(el('span', 'row-sub', b.name + ' · ' + b.phone + ' · ' + b.vehicle + ' · ' + b.ref));
            if (b.notes) title.appendChild(el('span', 'review-body', b.notes));
            main.appendChild(title);
            row.appendChild(main);
            var controls = el('div', 'row-controls');
            var status = select(BOOKING_STATES, b.status);
            status.className = 'admin-input status-select';
            status.setAttribute('aria-label', 'Estado de la reserva ' + b.ref);
            status.addEventListener('change', async function () {
                try {
                    await api('/rest/v1/bookings?id=eq.' + encodeURIComponent(b.id), { method: 'PATCH', body: { status: status.value } });
                    b.status = status.value;
                    toast('Reserva ' + b.ref + ': ' + status.options[status.selectedIndex].text.toLowerCase());
                    renderBookings();
                } catch (e) { toast(e.message, true); status.value = b.status; }
            });
            controls.appendChild(status);
            var when = new Date(b.day + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
            var wa = el('a', 'btn btn-sm btn-ghost', 'WhatsApp');
            wa.href = 'https://wa.me/' + waPhone(b.phone) + '?text=' + encodeURIComponent('Hola ' + b.name + ', te escribimos de Catrian Racing. Confirmamos tu hora en el taller (' + b.ref + '): ' + b.service + ' el ' + when + ' a las ' + b.slot + '. ¡Te esperamos!');
            wa.target = '_blank';
            wa.rel = 'noopener';
            controls.appendChild(wa);
            row.appendChild(controls);
            wrap.appendChild(row);
        });
    }

    /* ===== OPINIONES ===== */
    var reviewFilter = 'pendiente';
    var REVIEW_STATES = [['pendiente', 'Por revisar'], ['publicada', 'Publicadas'], ['rechazada', 'Rechazadas']];

    async function loadReviews() {
        try {
            data.reviews = await api('/rest/v1/reviews?select=*,orders(ref)&order=created_at.desc&limit=500');
        } catch (e) {
            data.reviews = [];
        }
        renderReviews();
    }

    function renderReviews() {
        var list = data.reviews || [];
        var pending = list.filter(function (r) { return r.status === 'pendiente'; }).length;
        var badge = $('badge-reviews');
        badge.hidden = !pending;
        badge.textContent = pending;

        var chips = $('reviews-filter');
        chips.textContent = '';
        REVIEW_STATES.forEach(function (st) {
            var n = list.filter(function (r) { return r.status === st[0]; }).length;
            var c = el('button', 'chip' + (reviewFilter === st[0] ? ' active' : ''), st[1] + ' (' + n + ')');
            c.type = 'button';
            c.addEventListener('click', function () { reviewFilter = st[0]; renderReviews(); });
            chips.appendChild(c);
        });

        var wrap = $('reviews-list');
        wrap.textContent = '';
        var shown = list.filter(function (r) { return r.status === reviewFilter; });
        if (!shown.length) wrap.appendChild(el('p', 'admin-empty', reviewFilter === 'pendiente' ? 'No hay opiniones por revisar.' : 'No hay opiniones aquí.'));
        shown.forEach(function (r) {
            var prod = data.products.filter(function (p) { return p.id === r.product_id; })[0];
            var row = el('div', 'admin-row review-row');
            var main = el('div', 'row-main static');
            var title = el('span', 'row-title');
            title.appendChild(el('strong', '', '★★★★★'.slice(0, r.rating) + '☆☆☆☆☆'.slice(0, 5 - r.rating) + '  ' + (prod ? prod.name : r.product_id)));
            title.appendChild(el('span', 'row-sub', r.name + ' · pedido ' + (r.orders ? r.orders.ref : '—') + ' · ' + fmtDate(r.created_at)));
            if (r.title) title.appendChild(el('span', 'review-title', r.title));
            if (r.body) title.appendChild(el('span', 'review-body', r.body));
            main.appendChild(title);
            row.appendChild(main);

            var controls = el('div', 'row-controls');
            if (r.status !== 'publicada') controls.appendChild(button('Publicar', 'btn btn-sm btn-primary', function () { patchReview(r, { status: 'publicada' }, 'Opinión publicada'); }));
            if (r.status !== 'rechazada') controls.appendChild(button('Rechazar', 'btn btn-sm btn-ghost', function () { patchReview(r, { status: 'rechazada' }, 'Opinión rechazada'); }));
            controls.appendChild(button(r.reply ? 'Editar respuesta' : 'Responder', 'btn btn-sm btn-ghost', function () {
                var text = prompt('Respuesta pública de la tienda (déjala vacía para quitarla):', r.reply || '');
                if (text === null) return;
                patchReview(r, { reply: text.trim().slice(0, 1000) || null }, 'Respuesta guardada');
            }));
            controls.appendChild(button('Eliminar', 'btn btn-sm btn-danger', async function () {
                if (!confirm('¿Eliminar esta opinión? No se puede deshacer.')) return;
                try {
                    await api('/rest/v1/reviews?id=eq.' + encodeURIComponent(r.id), { method: 'DELETE' });
                    data.reviews = data.reviews.filter(function (x) { return x.id !== r.id; });
                    toast('Opinión eliminada');
                    renderReviews();
                } catch (e) { toast(e.message, true); }
            }));
            row.appendChild(controls);
            if (r.reply) row.appendChild(el('p', 'review-reply-admin', 'Tu respuesta: ' + r.reply));
            wrap.appendChild(row);
        });
    }

    async function patchReview(r, patch, message) {
        try {
            await api('/rest/v1/reviews?id=eq.' + encodeURIComponent(r.id), { method: 'PATCH', body: patch });
            Object.assign(r, patch);
            toast(message);
            renderReviews();
        } catch (e) { toast(e.message, true); }
    }

    /* ===== CSV ===== */
    function csvCell(v) {
        if (v === null || v === undefined) return '';
        var t = Array.isArray(v) ? v.join(' | ') : String(v);
        // Evita que Excel interprete el texto como fórmula.
        if (/^[=+\-@]/.test(t) && !/^-?\d+(\.\d+)?$/.test(t)) t = "'" + t;
        return /[";\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    }

    // Separado por punto y coma para que Excel en español lo abra en columnas.
    function downloadCsv(name, header, rows) {
        var text = '\ufeff' + [header].concat(rows).map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
        a.download = name + '-' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }

    function parseCsv(text) {
        text = text.replace(/^\ufeff/, '');
        var first = text.split(/\r?\n/)[0] || '';
        var sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
        var rows = [], row = [], cell = '', quoted = false;
        for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            if (quoted) {
                if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
                else if (ch === '"') quoted = false;
                else cell += ch;
            } else if (ch === '"') quoted = true;
            else if (ch === sep) { row.push(cell); cell = ''; }
            else if (ch === '\n' || ch === '\r') {
                if (ch === '\r' && text[i + 1] === '\n') i++;
                row.push(cell); rows.push(row); row = []; cell = '';
            } else cell += ch;
        }
        if (cell || row.length) { row.push(cell); rows.push(row); }
        return rows.filter(function (r) { return r.some(function (c) { return c.trim(); }); });
    }

    var PRODUCT_COLS = ['id', 'name', 'cat', 'sub', 'brand', 'sku', 'price', 'compare', 'stock', 'active', 'desc'];
    var PRODUCT_HEAD = ['id', 'nombre', 'categoria', 'subcategoria', 'marca', 'sku', 'precio', 'precio_antes', 'stock', 'visible', 'descripcion'];

    function exportProducts() {
        downloadCsv('productos', PRODUCT_HEAD.concat(['opciones', 'stock_por_opcion', 'foto']), data.products.map(function (p) {
            return PRODUCT_COLS.map(function (k) { return k === 'active' ? (p.active ? 'si' : 'no') : p[k]; }).concat([
                p.options ? p.options.name + ': ' + p.options.values.join(', ') : '',
                p.option_stock ? Object.keys(p.option_stock).map(function (k) { return k + '=' + p.option_stock[k]; }).join(', ') : '',
                p.img || ''
            ]);
        }));
    }

    async function importProducts(file) {
        var rows = parseCsv(await file.text());
        if (rows.length < 2) return toast('El archivo no tiene productos.', true);
        var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
        var idx = {};
        PRODUCT_COLS.forEach(function (k, i) {
            var at = head.indexOf(PRODUCT_HEAD[i]);
            if (at === -1) at = head.indexOf(k);
            if (at !== -1) idx[k] = at;
        });
        if (idx.id === undefined && idx.name === undefined) return toast('Falta la columna «id» o «nombre».', true);
        var byId = {};
        data.products.forEach(function (p) { byId[p.id] = p; });
        var updates = [], creates = [], errors = [];
        rows.slice(1).forEach(function (r, n) {
            var get = function (k) { return idx[k] === undefined ? undefined : (r[idx[k]] || '').trim().replace(/^'/, ''); };
            var row = {};
            ['name', 'cat', 'sub', 'brand', 'sku', 'desc'].forEach(function (k) {
                var v = get(k);
                if (v !== undefined) row[k] = v || (k === 'desc' ? '' : null);
            });
            ['price', 'compare', 'stock'].forEach(function (k) {
                var v = get(k);
                if (v === undefined) return;
                v = v.replace(/[$.\s]/g, '').replace(',', '.');
                row[k] = v === '' ? null : Math.max(0, Math.round(Number(v)));
                if (isNaN(row[k])) errors.push('Fila ' + (n + 2) + ': «' + k + '» no es un número');
            });
            var act = get('active');
            if (act !== undefined && act !== '') row.active = !/^(no|0|false|falso)$/i.test(act);
            if (row.cat && CATS.indexOf(row.cat) === -1) errors.push('Fila ' + (n + 2) + ': categoría «' + row.cat + '» no existe');
            var id = get('id');
            var existing = id && byId[id];
            if (existing) {
                if (existing.option_stock) delete row.stock;
                Object.keys(row).forEach(function (k) {
                    if ((existing[k] === undefined ? null : existing[k]) === row[k]) delete row[k];
                });
                if (Object.keys(row).length) updates.push({ id: id, row: row });
            } else {
                if (!row.name || row.price === undefined || row.price === null) {
                    errors.push('Fila ' + (n + 2) + ': para crear un producto nuevo faltan nombre o precio');
                    return;
                }
                row.id = id || uniqueProductId(row.name);
                byId[row.id] = row;
                if (!row.cat) row.cat = 'Repuestos';
                creates.push(row);
            }
        });
        if (errors.length) return toast(errors.slice(0, 3).join(' · '), true);
        if (!confirm('Se actualizarán ' + updates.length + ' productos y se crearán ' + creates.length + '. ¿Continuar?')) return;
        try {
            for (var i = 0; i < updates.length; i++) {
                var u = updates[i];
                if (!Object.keys(u.row).length) continue;
                var res = await api('/rest/v1/products?id=eq.' + encodeURIComponent(u.id), { method: 'PATCH', body: u.row, headers: { Prefer: 'return=representation' } });
                if (res[0]) Object.assign(byId[u.id], res[0]);
            }
            if (creates.length) {
                creates.forEach(function (c, k) { c.sort = data.products.length + k; c.specs = []; });
                var created = await api('/rest/v1/products', { method: 'POST', body: creates, headers: { Prefer: 'return=representation' } });
                data.products = data.products.concat(created);
            }
            toast('Importación lista: ' + updates.length + ' actualizados, ' + creates.length + ' nuevos.');
        } catch (e) {
            toast('La importación se detuvo: ' + e.message, true);
        }
        renderAll();
    }

    function exportOrders() {
        downloadCsv('pedidos', ['pedido', 'fecha', 'estado', 'cliente', 'telefono', 'email', 'entrega', 'region', 'comuna', 'direccion',
            'pago', 'productos', 'subtotal', 'cupon', 'descuento', 'envio', 'total', 'documento', 'rut', 'razon_social', 'n_documento',
            'empresa_transporte', 'n_seguimiento'], data.orders.map(function (o) {
            return [o.ref, new Date(o.created_at).toLocaleString('es-CL'), o.status, o.name, o.phone, o.email, o.delivery, o.region, o.commune,
                o.address, o.payment, (o.items || []).map(function (i) { return i.qty + ' x ' + i.name + (i.option ? ' (' + i.option + ')' : ''); }).join(' | '),
                o.subtotal, o.coupon, o.discount, o.shipping, o.total, o.doc_type, o.billing ? formatRut(o.billing.rut) : '',
                o.billing ? o.billing.razon_social : '', o.doc_number, o.courier, o.tracking_number];
        }));
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
    var REGIONS = ['Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso', 'Metropolitana',
        "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'];

    function renderRates() {
        var grid = $('rates-grid');
        grid.textContent = '';
        var rates = data.settings.shipping_rates || {};
        REGIONS.forEach(function (region) {
            var i = input('number', rates[region] === undefined ? '' : rates[region], { min: 0, step: 100, placeholder: 'A cotizar' });
            i.dataset.region = region;
            grid.appendChild(field(region, i));
        });
    }

    async function loadPaymentConfig() {
        try {
            data.payment = await api('/rest/v1/rpc/admin_get_payment_config', { method: 'POST', body: {} });
        } catch (e) {
            data.payment = null;
        }
        renderPaymentConfig();
    }

    function renderPaymentConfig() {
        var c = data.payment || {};
        var state = $('mp-state');
        state.className = 'mp-state ' + (c.mp_enabled ? 'on' : 'off');
        state.textContent = c.mp_enabled
            ? '● Activo' + (c.is_test ? ' (modo de prueba)' : '') + ' · token ' + (c.token_hint || '')
            : (c.has_token ? '○ Desactivado · token guardado ' + c.token_hint : '○ Desactivado · sin token');
        $('mp-enabled').checked = !!c.mp_enabled;
        $('mp-token').value = '';
        $('mp-token').placeholder = c.has_token ? 'Token guardado (' + c.token_hint + '). Escribe uno nuevo para cambiarlo.' : 'APP_USR-...';
    }

    async function onPaymentSave(e) {
        e.preventDefault();
        var token = $('mp-token').value.trim();
        var enabled = $('mp-enabled').checked;
        try {
            await api('/rest/v1/rpc/admin_set_payment_config', { method: 'POST', body: { p_token: token || null, p_enabled: enabled } });
            toast(enabled ? 'Pago en línea activado. La tienda ya cobra con Mercado Pago.' : 'Configuración de pagos guardada.');
            await loadPaymentConfig();
        } catch (err) { toast(err.message, true); }
    }

    async function loadAutomations() {
        try {
            data.auto = await api('/rest/v1/rpc/admin_get_automations', { method: 'POST', body: {} });
        } catch (e) {
            data.auto = null;
            return;
        }
        var a = data.auto;
        $('auto-cart').checked = a.cart_enabled;
        $('auto-cart-hours').value = a.cart_hours;
        $('auto-cart-coupon').value = a.cart_coupon || '';
        $('auto-restock').checked = a.restock_enabled;
        $('auto-maint').checked = a.maint_enabled;
        $('auto-maint-months').value = a.maint_months;
        var st = a.stats || {};
        var box = $('auto-stats');
        box.textContent = '';
        [[st.carros_recordados, 'carros recordados'], [st.carros_recuperados, 'compraron después'],
            [st.avisos_pendientes, 'esperan stock'], [st.mantencion_enviados, 'recordatorios de mantención']].forEach(function (x) {
            var item = el('div', 'stats-num');
            item.appendChild(el('strong', '', String(x[0] || 0)));
            item.appendChild(el('span', '', x[1]));
            box.appendChild(item);
        });
        box.appendChild(el('p', 'admin-help', 'Últimos 30 días.'));
        renderProducts();
    }

    async function onAutoSave(e) {
        e.preventDefault();
        var hours = parseInt($('auto-cart-hours').value, 10);
        var months = parseInt($('auto-maint-months').value, 10);
        if (!(hours >= 1 && hours <= 72)) return toast('Las horas deben estar entre 1 y 72.', true);
        if (!(months >= 1 && months <= 24)) return toast('Los meses deben estar entre 1 y 24.', true);
        try {
            await api('/rest/v1/rpc/admin_set_automations', { method: 'POST', body: {
                p_cart_enabled: $('auto-cart').checked, p_cart_hours: hours, p_cart_coupon: $('auto-cart-coupon').value.trim(),
                p_restock_enabled: $('auto-restock').checked, p_maint_enabled: $('auto-maint').checked, p_maint_months: months
            } });
            toast('Automatizaciones guardadas');
            loadAutomations();
        } catch (err) { toast(err.message, true); }
    }

    async function loadEmailConfig() {
        try {
            data.email = await api('/rest/v1/rpc/admin_get_email_config', { method: 'POST', body: {} });
        } catch (e) {
            data.email = null;
        }
        var c = data.email || {};
        var state = $('email-state');
        state.className = 'mp-state ' + (c.enabled ? 'on' : 'off');
        state.textContent = c.enabled ? '● Activos · enviando desde ' + c.from_address
            : (c.has_key ? '○ Desactivados · clave guardada ' + c.key_hint : '○ Desactivados · sin clave');
        $('email-key').value = '';
        $('email-key').placeholder = c.has_key ? 'Clave guardada (' + c.key_hint + '). Escribe una nueva para cambiarla.' : 're_...';
        $('email-from').value = c.from_address || '';
        $('email-reply').value = c.reply_to || '';
        $('email-url').value = c.store_url || '';
        $('email-enabled').checked = !!c.enabled;
    }

    async function saveEmailConfig() {
        await api('/rest/v1/rpc/admin_set_email_config', { method: 'POST', body: {
            p_key: $('email-key').value.trim() || null,
            p_from: $('email-from').value.trim(),
            p_reply_to: $('email-reply').value.trim(),
            p_store_url: $('email-url').value.trim(),
            p_enabled: $('email-enabled').checked
        } });
    }

    async function onEmailSave(e) {
        e.preventDefault();
        try {
            await saveEmailConfig();
            toast($('email-enabled').checked ? 'Correos automáticos activados.' : 'Configuración de correos guardada.');
            await loadEmailConfig();
        } catch (err) { toast(err.message, true); }
    }

    async function onEmailTest() {
        var to = prompt('¿A qué correo enviamos la prueba?', '');
        if (!to) return;
        try {
            await saveEmailConfig();
            await api('/rest/v1/rpc/admin_test_email', { method: 'POST', body: { p_to: to.trim() } });
            toast('Correo de prueba enviado a ' + to.trim());
            await loadEmailConfig();
        } catch (err) { toast(err.message, true); }
    }

    async function onRatesSave(e) {
        e.preventDefault();
        var rates = {};
        var bad = false;
        $('rates-grid').querySelectorAll('input').forEach(function (i) {
            if (i.value === '') return;
            var n = parseInt(i.value, 10);
            if (isNaN(n) || n < 0) bad = true;
            else rates[i.dataset.region] = n;
        });
        if (bad) return toast('Revisa las tarifas: deben ser montos en pesos.', true);
        try {
            await api('/rest/v1/settings?on_conflict=key', {
                method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' },
                body: [{ key: 'shipping_rates', value: rates }]
            });
            data.settings.shipping_rates = rates;
            toast('Tarifas de envío guardadas. La tienda ya las usa.');
        } catch (err) { toast(err.message, true); }
    }

    function renderSettings() {
        renderRates();
        $('set-whatsapp').value = data.settings.whatsapp || '';
        $('set-free').value = data.settings.free_shipping_from === undefined ? '' : data.settings.free_shipping_from;
        $('set-announce').value = (data.settings.announce || []).join('\n');
        renderFinance();
        $('set-ga4').value = (data.settings.analytics || {}).ga4 || '';
        $('set-pixel').value = (data.settings.analytics || {}).pixel || '';

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
        var analytics = { ga4: $('set-ga4').value.trim().toUpperCase(), pixel: $('set-pixel').value.replace(/\D/g, '') };
        if (analytics.ga4 && !/^G-[A-Z0-9]{4,15}$/.test(analytics.ga4)) return toast('El ID de Google Analytics empieza con G- (ej: G-AB12CD34EF).', true);
        if (analytics.pixel && !/^\d{6,20}$/.test(analytics.pixel)) return toast('El ID del Meta Pixel son solo números.', true);
        try {
            await api('/rest/v1/settings?on_conflict=key', {
                method: 'POST',
                headers: { Prefer: 'resolution=merge-duplicates' },
                body: [
                    { key: 'whatsapp', value: whatsapp },
                    { key: 'free_shipping_from', value: free },
                    { key: 'announce', value: announce },
                    { key: 'analytics', value: analytics }
                ]
            });
            data.settings.whatsapp = whatsapp;
            data.settings.free_shipping_from = free;
            data.settings.announce = announce;
            data.settings.analytics = analytics;
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
    $('products-export').addEventListener('click', exportProducts);
    $('orders-export').addEventListener('click', exportOrders);
    $('products-import').addEventListener('click', function () { $('products-import-file').click(); });
    $('products-import-file').addEventListener('change', function () {
        var f = this.files[0];
        this.value = '';
        if (f) importProducts(f);
    });
    $('coupon-kind').addEventListener('change', syncCouponKind);
    $('vehicle-form').addEventListener('submit', onVehicleCreate);
    $('settings-form').addEventListener('submit', onSettingsSave);
    $('rates-form').addEventListener('submit', onRatesSave);
    $('mp-form').addEventListener('submit', onPaymentSave);
    $('email-form').addEventListener('submit', onEmailSave);
    $('auto-form').addEventListener('submit', onAutoSave);
    $('finance-form').addEventListener('submit', onFinanceSave);
    $('email-test').addEventListener('click', onEmailTest);
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

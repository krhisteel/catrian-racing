// Sirve index.html con título, descripción, imagen y datos estructurados propios de cada
// producto o categoría, para que Google y las redes sociales muestren la página correcta.
const seo = require('./_seo');

function replaceTag(html, pattern, tag) {
    return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', tag + '\n</head>');
}

function inject(html, meta) {
    const e = seo.esc;
    html = html.replace('<head>', '<head>\n    <base href="/">');
    html = replaceTag(html, /<title>[\s\S]*?<\/title>/, '<title>' + e(meta.title) + '</title>');
    html = replaceTag(html, /<meta name="description"[^>]*>/, '<meta name="description" content="' + e(meta.description) + '">');
    html = replaceTag(html, /<link rel="canonical"[^>]*>/, '<link rel="canonical" href="' + e(meta.url) + '">');
    const tags = {
        'og:type': meta.type || 'website', 'og:title': meta.title, 'og:description': meta.description,
        'og:url': meta.url, 'og:image': meta.image
    };
    Object.keys(tags).forEach(function (key) {
        html = replaceTag(html, new RegExp('<meta property="' + key + '"[^>]*>'),
            '<meta property="' + key + '" content="' + e(tags[key]) + '">');
    });
    html = replaceTag(html, /<meta name="twitter:card"[^>]*>/, '<meta name="twitter:card" content="summary_large_image">');
    if (meta.robots) html = html.replace('</head>', '    <meta name="robots" content="' + meta.robots + '">\n</head>');
    if (meta.jsonld) {
        // "<" escapado para que el texto del producto no pueda cerrar la etiqueta script.
        const json = JSON.stringify(meta.jsonld).replace(/</g, '\\u003c');
        html = html.replace('</head>', '    <script type="application/ld+json">' + json + '</script>\n</head>');
    }
    return html;
}

function productMeta(base, p) {
    const url = base + seo.productPath(p);
    const image = seo.imageUrl(base, p);
    const crumbs = [{ name: 'Inicio', url: base + '/' }, { name: p.cat, url: base + seo.categoryPath(p.cat) }];
    if (p.sub) crumbs.push({ name: p.sub, url: base + seo.categoryPath(p.cat, p.sub) });
    crumbs.push({ name: p.name, url: url });
    const product = {
        '@type': 'Product', name: p.name, image: [image], description: seo.clip(p.desc, 5000) || p.name,
        url: url, category: [p.cat, p.sub].filter(Boolean).join(' > ')
    };
    if (p.sku) product.sku = p.sku;
    if (p.brand) product.brand = { '@type': 'Brand', name: p.brand };
    if (!p.quote) {
        product.offers = {
            '@type': 'Offer', url: url, priceCurrency: 'CLP', price: p.price,
            availability: 'https://schema.org/' + (seo.inStock(p) ? 'InStock' : 'OutOfStock'),
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: seo.STORE_NAME }
        };
    }
    const price = p.quote ? 'Cotiza' : '$' + Number(p.price).toLocaleString('es-CL');
    return {
        type: 'product', url: url, image: image,
        title: p.name + ' | ' + seo.STORE_NAME,
        description: seo.clip(price + ' · ' + (p.desc || p.name) + ' Envíos a todo Chile.', 160),
        jsonld: { '@context': 'https://schema.org', '@graph': [product, breadcrumbs(crumbs)] }
    };
}

function breadcrumbs(items) {
    return {
        '@type': 'BreadcrumbList',
        itemListElement: items.map(function (c, i) {
            return { '@type': 'ListItem', position: i + 1, name: c.name, item: c.url };
        })
    };
}

function categoryMeta(base, cat, sub, list) {
    const name = sub || cat;
    const url = base + seo.categoryPath(cat, sub);
    const crumbs = [{ name: 'Inicio', url: base + '/' }, { name: cat, url: base + seo.categoryPath(cat) }];
    if (sub) crumbs.push({ name: sub, url: url });
    return {
        url: url, image: list.length ? seo.imageUrl(base, list[0]) : base + '/img/productos/neumatico.png',
        title: name + (sub ? ' · ' + cat : '') + ' | ' + seo.STORE_NAME,
        description: seo.clip(seo.DESCRIPTIONS[name] || seo.DESCRIPTIONS[cat] || ('Compra ' + name + ' en ' + seo.STORE_NAME + '.'), 160),
        jsonld: {
            '@context': 'https://schema.org',
            '@graph': [{
                '@type': 'CollectionPage', name: name, url: url,
                mainEntity: {
                    '@type': 'ItemList',
                    itemListElement: list.slice(0, 30).map(function (p, i) {
                        return { '@type': 'ListItem', position: i + 1, url: base + seo.productPath(p), name: p.name };
                    })
                }
            }, breadcrumbs(crumbs)]
        }
    };
}

function decode(value) {
    try { return decodeURIComponent(String(value || '')); } catch (e) { return ''; }
}

module.exports = async function handler(req, res) {
    const base = seo.origin(req);
    const q = req.query || {};
    let html;
    try {
        const page = await fetch(base + '/index.html');
        html = await page.text();
    } catch (e) {
        res.setHeader('Location', '/');
        return res.status(302).send('');
    }

    let meta = null;
    try {
        const products = await seo.activeProducts();
        if (q.type === 'producto') {
            const id = decode(q.id);
            const p = products.find(function (x) { return x.id === id; });
            if (p) meta = productMeta(base, p);
        } else if (q.type === 'categoria') {
            const cat = decode(q.cat);
            const sub = decode(q.sub);
            const list = products.filter(function (p) { return p.cat === cat && (!sub || p.sub === sub); });
            if (seo.CATEGORIES.indexOf(cat) >= 0 && (!sub || list.length)) meta = categoryMeta(base, cat, sub, list);
        }
    } catch (e) {
        // Sin base de datos se sirve la tienda igual; la página se arma en el navegador.
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html.replace('<head>', '<head>\n    <base href="/">'));
    }

    if (!meta) {
        meta = {
            url: base + '/', image: base + '/img/productos/neumatico.png', robots: 'noindex',
            title: 'Página no encontrada | ' + seo.STORE_NAME,
            description: 'Este producto ya no está disponible. Revisa el resto del catálogo de ' + seo.STORE_NAME + '.'
        };
        res.status(404);
    } else {
        res.status(200);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    res.send(inject(html, meta));
};

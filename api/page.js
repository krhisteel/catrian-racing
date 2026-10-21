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

function productMeta(base, p, reviews) {
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
    if (reviews && reviews.length) {
        const sum = reviews.reduce(function (t, r) { return t + r.rating; }, 0);
        product.aggregateRating = {
            '@type': 'AggregateRating', ratingValue: Math.round(sum / reviews.length * 10) / 10,
            reviewCount: reviews.length, bestRating: 5, worstRating: 1
        };
        product.review = reviews.slice(0, 5).map(function (r) {
            const item = {
                '@type': 'Review', author: { '@type': 'Person', name: r.name }, datePublished: String(r.created_at).slice(0, 10),
                reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 }
            };
            if (r.title) item.name = r.title;
            if (r.body) item.reviewBody = r.body;
            return item;
        });
    }
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

function guideMeta(base, g) {
    const url = base + '/guias/' + g.slug;
    const image = g.cover ? seo.imageUrl(base, { images: [g.cover] }) : base + '/img/productos/neumatico.png';
    return {
        type: 'article', url: url, image: image,
        title: g.title + ' | Guías ' + seo.STORE_NAME,
        description: seo.clip(g.excerpt || g.body, 160),
        jsonld: {
            '@context': 'https://schema.org',
            '@graph': [{
                '@type': 'Article', headline: g.title, description: g.excerpt, image: [image], url: url,
                datePublished: g.published_at, dateModified: g.updated_at,
                author: { '@type': 'Organization', name: seo.STORE_NAME },
                publisher: { '@type': 'Organization', name: seo.STORE_NAME }
            }, breadcrumbs([{ name: 'Inicio', url: base + '/' }, { name: 'Guías', url: base + '/guias' }, { name: g.title, url: url }])]
        }
    };
}

function guidesMeta(base, list) {
    return {
        url: base + '/guias', image: base + '/img/productos/aceite.png',
        title: 'Guías y consejos para tu moto | ' + seo.STORE_NAME,
        description: 'Mantención, neumáticos, viajes y más: guías prácticas del taller de ' + seo.STORE_NAME + '.',
        jsonld: {
            '@context': 'https://schema.org',
            '@graph': [{
                '@type': 'CollectionPage', name: 'Guías', url: base + '/guias',
                mainEntity: { '@type': 'ItemList', itemListElement: list.map(function (g, i) {
                    return { '@type': 'ListItem', position: i + 1, url: base + '/guias/' + g.slug, name: g.title };
                }) }
            }, breadcrumbs([{ name: 'Inicio', url: base + '/' }, { name: 'Guías', url: base + '/guias' }])]
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
        if (q.type === 'guia' || q.type === 'guias') {
            const posts = await seo.db('/rest/v1/posts?select=slug,title,excerpt,body,cover,published_at,updated_at&published=is.true&order=published_at.desc');
            if (q.type === 'guias') meta = guidesMeta(base, posts);
            else {
                const g = posts.find(function (x) { return x.slug === decode(q.slug); });
                if (g) meta = guideMeta(base, g);
            }
        }
        const products = meta || q.type === 'guia' ? [] : await seo.activeProducts();
        if (q.type === 'producto') {
            const id = decode(q.id);
            const p = products.find(function (x) { return x.id === id; });
            if (p) {
                let reviews = [];
                try {
                    reviews = await seo.db('/rest/v1/reviews?select=name,rating,title,body,created_at&status=eq.publicada&order=created_at.desc&product_id=eq.' + encodeURIComponent(p.id));
                } catch (e) { /* sin opiniones */ }
                meta = productMeta(base, p, reviews);
            }
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
            description: 'Esta página ya no está disponible. Revisa el catálogo y las guías de ' + seo.STORE_NAME + '.'
        };
        res.status(404);
    } else {
        res.status(200);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    res.send(inject(html, meta));
};

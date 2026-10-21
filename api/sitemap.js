const seo = require('./_seo');

module.exports = async function handler(req, res) {
    const base = seo.origin(req);
    let products = [];
    try { products = await seo.activeProducts(); } catch (e) { /* solo páginas fijas */ }

    const urls = [{ loc: base + '/', priority: '1.0' }];
    seo.CATEGORIES.forEach(function (cat) {
        const list = products.filter(function (p) { return p.cat === cat; });
        urls.push({ loc: base + seo.categoryPath(cat), priority: '0.8' });
        Array.from(new Set(list.map(function (p) { return p.sub; }).filter(Boolean))).forEach(function (sub) {
            urls.push({ loc: base + seo.categoryPath(cat, sub), priority: '0.7' });
        });
    });
    products.forEach(function (p) {
        urls.push({ loc: base + seo.productPath(p), priority: '0.6', lastmod: p.updated_at });
    });
    let posts = [];
    try { posts = await seo.db('/rest/v1/posts?select=slug,updated_at&published=is.true'); } catch (e) { /* sin guías */ }
    if (posts.length) urls.push({ loc: base + '/guias', priority: '0.6' });
    posts.forEach(function (g) {
        urls.push({ loc: base + '/guias/' + encodeURIComponent(g.slug), priority: '0.5', lastmod: g.updated_at });
    });
    urls.push({ loc: base + '/politicas.html', priority: '0.2' });

    const body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls.map(function (u) {
            return '  <url><loc>' + seo.esc(u.loc) + '</loc>' +
                (u.lastmod ? '<lastmod>' + String(u.lastmod).slice(0, 10) + '</lastmod>' : '') +
                '<priority>' + u.priority + '</priority></url>';
        }).join('\n') + '\n</urlset>\n';
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(body);
};

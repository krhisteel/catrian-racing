// Catálogo para Google Merchant Center (Google Shopping). Las motos se cotizan y no se incluyen.
const seo = require('./_seo');

const GOOGLE_CATEGORY = {
    'Repuestos': 'Vehicles & Parts > Vehicle Parts & Accessories > Motor Vehicle Parts',
    'Equipamiento': 'Apparel & Accessories > Clothing',
    'Accesorios': 'Vehicles & Parts > Vehicle Parts & Accessories'
};

module.exports = async function handler(req, res) {
    const base = seo.origin(req);
    let products;
    try {
        products = await seo.activeProducts();
    } catch (e) {
        return res.status(503).send('Catálogo no disponible');
    }
    const e = seo.esc;
    const items = products.filter(function (p) { return !p.quote && p.price > 0; }).map(function (p) {
        const extra = (p.images || []).slice(1, 10).map(function (src) {
            return '      <g:additional_image_link>' + e(seo.imageUrl(base, { images: [src] })) + '</g:additional_image_link>';
        });
        const lines = [
            '    <item>',
            '      <g:id>' + e(p.sku || p.id) + '</g:id>',
            '      <g:title>' + e(seo.clip(p.name, 150)) + '</g:title>',
            '      <g:description>' + e(seo.clip(p.desc || p.name, 5000)) + '</g:description>',
            '      <g:link>' + e(base + seo.productPath(p)) + '</g:link>',
            '      <g:image_link>' + e(seo.imageUrl(base, p)) + '</g:image_link>'
        ].concat(extra, [
            '      <g:availability>' + (seo.inStock(p) ? 'in_stock' : 'out_of_stock') + '</g:availability>',
            '      <g:condition>new</g:condition>',
            '      <g:product_type>' + e([p.cat, p.sub].filter(Boolean).join(' > ')) + '</g:product_type>'
        ]);
        if (p.compare && p.compare > p.price) {
            lines.push('      <g:price>' + p.compare + ' CLP</g:price>');
            lines.push('      <g:sale_price>' + p.price + ' CLP</g:sale_price>');
        } else {
            lines.push('      <g:price>' + p.price + ' CLP</g:price>');
        }
        if (GOOGLE_CATEGORY[p.cat]) lines.push('      <g:google_product_category>' + e(GOOGLE_CATEGORY[p.cat]) + '</g:google_product_category>');
        if (p.brand) lines.push('      <g:brand>' + e(p.brand) + '</g:brand>');
        else lines.push('      <g:identifier_exists>no</g:identifier_exists>');
        lines.push('    </item>');
        return lines.join('\n');
    });
    const body = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n' +
        '    <title>' + seo.STORE_NAME + '</title>\n    <link>' + e(base + '/') + '</link>\n' +
        '    <description>Repuestos, equipamiento y accesorios para motos</description>\n' +
        items.join('\n') + '\n  </channel>\n</rss>\n';
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(body);
};

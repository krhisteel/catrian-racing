const seo = require('./_seo');

module.exports = function handler(req, res) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send('User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/\n\nSitemap: ' + seo.origin(req) + '/sitemap.xml\n');
};

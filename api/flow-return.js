// Flow devuelve al cliente aquí (por POST). Se actualiza el pago y se lo lleva a «Mi pedido».
const flow = require('./_flow');

module.exports = async function handler(req, res) {
    const token = flow.tokenFrom(req);
    let ref = String((req.query && req.query.ref) || '').toUpperCase();
    if (token) {
        try {
            const r = await flow.syncToken(token);
            if (r && r.ref) ref = r.ref;
        } catch (e) { /* la página verifica el pago de nuevo al abrir */ }
    }
    if (!/^CR-[A-Z0-9]{4,10}$/.test(ref)) ref = '';
    res.setHeader('Location', ref ? '/#pago/' + ref : '/#seguimiento');
    res.status(303).send('');
};

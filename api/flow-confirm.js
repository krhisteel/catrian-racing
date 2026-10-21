// Confirmación de pago de Flow (servidor a servidor).
const flow = require('./_flow');

module.exports = async function handler(req, res) {
    const token = flow.tokenFrom(req);
    if (token) {
        try { await flow.syncToken(token); } catch (e) { /* Flow reintenta y el cliente puede verificar desde «Mi pedido» */ }
    }
    res.status(200).send('ok');
};

// Notificaciones de Mercado Pago (webhook). No confía en el contenido recibido:
// solo toma el ID del pago y la base de datos lo verifica directamente con Mercado Pago.
const SUPABASE_URL = 'https://odywoasventojksfemgp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3b6ZTWdN05NeRyWOzE4AOg_f7TqFIn-';

function paymentIdFrom(req) {
    const q = req.query || {};
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const type = q.type || q.topic || b.type || b.topic || '';
    const id = q['data.id'] || (b.data && b.data.id) || (type === 'payment' ? q.id || b.id : '');
    return /payment/.test(type) || q['data.id'] || (b.data && b.data.id) ? String(id || '') : '';
}

module.exports = async function handler(req, res) {
    const id = paymentIdFrom(req);
    if (/^[0-9]{3,30}$/.test(id)) {
        try {
            await fetch(SUPABASE_URL + '/rest/v1/rpc/mp_sync_payment', {
                method: 'POST',
                headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ p_payment_id: id })
            });
        } catch (e) {
            // Mercado Pago reintenta la notificación; el cliente también puede verificar desde «Mi pedido».
        }
    }
    res.status(200).send('ok');
};

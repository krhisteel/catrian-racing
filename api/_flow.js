// Flow avisa con un «token»; la base de datos consulta a Flow el estado real del pago.
const SUPABASE_URL = 'https://odywoasventojksfemgp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3b6ZTWdN05NeRyWOzE4AOg_f7TqFIn-';

function tokenFrom(req) {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    let t = b.token || (req.query && req.query.token) || '';
    if (!t && typeof req.body === 'string') {
        const m = /(?:^|&)token=([^&]+)/.exec(req.body);
        if (m) t = decodeURIComponent(m[1]);
    }
    return /^[A-Za-z0-9_-]{10,100}$/.test(String(t)) ? String(t) : '';
}

async function syncToken(token) {
    const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/flow_sync', {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_token: token })
    });
    return res.ok ? res.json() : null;
}

module.exports = { tokenFrom, syncToken };

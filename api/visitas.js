const { pipeline } = require('./_db');
// Prefixo: separa as visitas deste site das do portfólio antigo, mesmo usando o mesmo banco.
const P = 'novo:';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const senha = process.env.CENTRAL_SENHA;
  if (!senha) { res.status(500).json({ erro: 'Defina a variável CENTRAL_SENHA em Vercel > Settings > Environment Variables.' }); return; }
  if ((req.headers['x-senha'] || '') !== senha) { res.status(401).json({ erro: 'Senha incorreta.' }); return; }
  if (req.method === 'DELETE') {
    try {
      const [ids] = (await pipeline([['LRANGE', P+'visitas', 0, -1]])).map(x => x.result);
      const cmds = [['DEL', P+'visitas']];
      for (let i = 0; ids && i < ids.length; i += 200) cmds.push(['DEL', ...ids.slice(i, i + 200).map(x => P+'visita:' + x)]);
      await pipeline(cmds);
      res.json({ ok: true, apagadas: ids ? ids.length : 0 });
    } catch (e) { res.status(500).json({ erro: String(e.message || e) }); }
    return;
  }
  try {
    const [ids] = (await pipeline([['LRANGE', P+'visitas', 0, 499]])).map(x => x.result);
    if (!ids || !ids.length) { res.json({ visitas: [], agora: Date.now() }); return; }
    const [vals] = (await pipeline([['MGET', ...ids.map(i => P+'visita:' + i)]])).map(x => x.result);
    const visitas = vals.filter(Boolean).map(v => JSON.parse(v));
    res.json({ visitas, agora: Date.now() });
  } catch (e) {
    res.status(500).json({ erro: String(e.message || e) });
  }
};

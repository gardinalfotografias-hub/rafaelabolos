import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'banca_rosa_segredo_2024';
export const JWT_EXPIRES = '12h';

/**
 * Middleware: verifica o token JWT no header Authorization.
 * Só deixa passar rotas protegidas (painel da dona).
 */
export function autenticar(req, res, next) {
  // Rota pública: POST /api/pedidos (clientes criando pedido)
  if (req.method === 'POST' && req.path === '/') {
    return next();
  }

  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ erro: 'Token não informado. Faça login primeiro.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

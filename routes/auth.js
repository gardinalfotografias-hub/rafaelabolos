import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, initDB } from '../data/db.js';
import { JWT_SECRET, JWT_EXPIRES } from '../middleware/auth.js';

await initDB();
const router = Router();

// ── POST /api/auth/login ─────────────────────────────────────────
// Corpo: { login, senha }
// Retorna: { token, expira_em }
router.post('/login', async (req, res) => {
  const { login, senha } = req.body;

  if (!login || !senha) {
    return res.status(400).json({ erro: 'Informe login e senha.' });
  }

  await db.read();
  const usuario = db.data.usuario;

  if (usuario.login !== login) {
    return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
  }

  const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
  if (!senhaOk) {
    return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
  }

  const token = jwt.sign(
    { login: usuario.login, role: 'dona' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  res.json({ token, expira_em: JWT_EXPIRES });
});

// ── POST /api/auth/trocar-senha ──────────────────────────────────
// Corpo: { senha_atual, nova_senha }
// Requer: Bearer token
import { autenticar } from '../middleware/auth.js';

router.post('/trocar-senha', autenticar, async (req, res) => {
  const { senha_atual, nova_senha } = req.body;

  if (!senha_atual || !nova_senha) {
    return res.status(400).json({ erro: 'Informe a senha atual e a nova senha.' });
  }
  if (nova_senha.length < 4) {
    return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 4 caracteres.' });
  }

  await db.read();
  const atual_ok = await bcrypt.compare(senha_atual, db.data.usuario.senha_hash);
  if (!atual_ok) {
    return res.status(401).json({ erro: 'Senha atual incorreta.' });
  }

  db.data.usuario.senha_hash = await bcrypt.hash(nova_senha, 10);
  await db.write();

  res.json({ ok: true, mensagem: 'Senha alterada com sucesso.' });
});

export default router;

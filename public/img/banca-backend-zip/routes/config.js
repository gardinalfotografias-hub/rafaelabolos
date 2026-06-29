import { Router } from 'express';
import { db } from '../data/db.js';

const router = Router();

// ── GET /api/config ───────────────────────────────────────────────
// Protegido — retorna as configurações atuais
router.get('/', async (req, res) => {
  await db.read();
  res.json(db.data.config);
});

// ── PUT /api/config ───────────────────────────────────────────────
// Protegido — atualiza as configurações
// Corpo: { nome_banca, chave_pix, taxa_entrega, whatsapp }
router.put('/', async (req, res) => {
  const { nome_banca, chave_pix, taxa_entrega, whatsapp } = req.body;

  await db.read();

  if (nome_banca !== undefined) db.data.config.nome_banca = String(nome_banca).trim();
  if (chave_pix  !== undefined) db.data.config.chave_pix  = String(chave_pix).trim();
  if (whatsapp   !== undefined) db.data.config.whatsapp   = String(whatsapp).trim();

  if (taxa_entrega !== undefined) {
    const taxa = parseFloat(taxa_entrega);
    if (isNaN(taxa) || taxa < 0) return res.status(400).json({ erro: 'Taxa de entrega inválida.' });
    db.data.config.taxa_entrega = taxa;
  }

  await db.write();
  res.json({ ok: true, config: db.data.config });
});

// ── GET /api/config/publica ───────────────────────────────────────
// Público — só o que o cliente precisa ver (chave pix, taxa)
router.get('/publica', async (req, res) => {
  await db.read();
  const { nome_banca, chave_pix, taxa_entrega } = db.data.config;
  res.json({ nome_banca, chave_pix, taxa_entrega });
});

export default router;

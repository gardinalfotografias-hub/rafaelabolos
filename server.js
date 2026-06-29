import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pedidosRouter from './routes/pedidos.js';
import authRouter from './routes/auth.js';
import configRouter from './routes/config.js';
import { autenticar } from './middleware/auth.js';
import { initDB, db } from './data/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares globais ──────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ── Rotas públicas (sem autenticação) ────────────────────────────
app.use('/api/auth', authRouter);
app.get('/api/config/publica', configRouter);

// POST /api/pedidos → cliente cria pedido (público)
app.post('/api/pedidos', pedidosRouter);

// GET /api/pedidos/publico/:id → cliente consulta status (público)
// ✅ Declarado aqui, ANTES do app.use protegido, para não ser bloqueado pelo autenticar
app.get('/api/pedidos/publico/:id', async (req, res) => {
  await db.read();
  const id = req.params.id.toUpperCase().trim();
  const pedido = db.data.pedidos.find(p => p.id === id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

  const { id: pid, data, cliente, fone, entrega, endereco,
          pagamento, obs, itens, subtotal, taxa, total, status, atualizado_em } = pedido;

  res.json({ pedido: { id: pid, data, cliente, fone, entrega, endereco,
    pagamento, obs, itens, subtotal, taxa, total, status, atualizado_em } });
});

// ── Health check ─────────────────────────────────────────────────
app.get('/api/ping', (_req, res) => res.json({ ok: true, ts: new Date() }));

// ── Rotas protegidas (precisam de token) ─────────────────────────
app.use('/api/pedidos', autenticar, pedidosRouter);
app.use('/api/config',  autenticar, configRouter);

// ── 404 ──────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

// ── Inicialização ────────────────────────────────────────────────
await initDB();

app.listen(PORT, () => {
  console.log(`\n🎂 @Rafaela Bolos — servidor iniciado`);
  console.log(`Loja:   http://localhost:${PORT}/loja.html`);
  console.log(`Painel: http://localhost:${PORT}/painel-dona.html`);
  console.log(`API:    http://localhost:${PORT}/api\n`);
});
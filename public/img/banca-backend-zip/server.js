import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pedidosRouter from './routes/pedidos.js';
import authRouter    from './routes/auth.js';
import configRouter  from './routes/config.js';
import { autenticar } from './middleware/auth.js';
import { initDB }    from './data/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares globais ──────────────────────────────────────────
app.use(cors({ origin: '*' }));          // Em produção coloque seu domínio
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));  // Serve loja.html e painel-dona.html

// ── Rotas públicas ───────────────────────────────────────────────
app.use('/api/auth',         authRouter);
app.get('/api/config/publica', configRouter);   // taxa e chave pix para a loja

// ── POST /api/pedidos — público (cliente faz pedido) ────────────
app.post('/api/pedidos', pedidosRouter);

// ── Rotas protegidas por JWT (apenas a dona) ────────────────────
app.use('/api/pedidos', autenticar, pedidosRouter);
app.use('/api/config',  autenticar, configRouter);

// ── Health check ────────────────────────────────────────────────
app.get('/api/ping', (_req, res) => res.json({ ok: true, ts: new Date() }));

// ── 404 ──────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

// ── Inicialização ────────────────────────────────────────────────
await initDB();
app.listen(PORT, () => {
  console.log(`\n🌸  Banca da Dona Rosa — servidor iniciado`);
  console.log(`    Loja:   http://localhost:${PORT}/loja.html`);
  console.log(`    Painel: http://localhost:${PORT}/painel-dona.html`);
  console.log(`    API:    http://localhost:${PORT}/api\n`);
});

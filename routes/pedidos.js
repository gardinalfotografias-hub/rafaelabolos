import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../data/db.js';

const router = Router();

const STATUS_VALIDOS = ['novo', 'preparo', 'pronto', 'entregue', 'cancelado'];
const PROXIMO_STATUS = {
  novo:      'preparo',
  preparo:   'pronto',
  pronto:    'entregue',
  entregue:  null,
  cancelado: null,
};

// Mensagens enviadas ao cliente via WhatsApp para cada status
const MSG_STATUS = {
  preparo:  (p) => `Olá ${p.cliente}! 👩‍🍳 Seu pedido *${p.id}* entrou em preparo agora! Em breve fica pronto 🎂`,
  pronto:   (p) => p.entrega === 'entrega'
    ? `Olá ${p.cliente}! 📦 Seu pedido *${p.id}* está pronto e saiu para entrega! 🛵`
    : `Olá ${p.cliente}! 📦 Seu pedido *${p.id}* está pronto para retirada! 🏪`,
  entregue: (p) => `Olá ${p.cliente}! 🎉 Seu pedido *${p.id}* foi entregue! Obrigada pela preferência 💕`,
  cancelado:(p) => `Olá ${p.cliente}, infelizmente seu pedido *${p.id}* foi cancelado. Entre em contato para mais informações.`,
};

// ── POST /api/pedidos — público ───────────────────────────────────
router.post('/', async (req, res) => {
  const { cliente, fone, entrega, endereco, pagamento, obs, itens } = req.body;

  if (!cliente?.trim()) return res.status(400).json({ erro: 'Nome do cliente é obrigatório.' });
  if (!fone?.trim())    return res.status(400).json({ erro: 'WhatsApp é obrigatório.' });
  if (!['retirada','entrega'].includes(entrega))
    return res.status(400).json({ erro: 'Tipo de entrega inválido.' });
  if (entrega === 'entrega' && !endereco?.trim())
    return res.status(400).json({ erro: 'Endereço de entrega é obrigatório.' });
  if (!['pix','cartao'].includes(pagamento))
    return res.status(400).json({ erro: 'Forma de pagamento inválida.' });
  if (!Array.isArray(itens) || itens.length === 0)
    return res.status(400).json({ erro: 'O pedido deve ter pelo menos 1 item.' });

  await db.read();
  const taxa     = entrega === 'entrega' ? (db.data.config.taxa_entrega ?? 5.0) : 0;
  const subtotal = itens.reduce((s, i) => s + (Number(i.preco) * Number(i.qtd)), 0);
  const total    = subtotal + taxa;

  const pedido = {
    id:       'PED-' + uuidv4().slice(0,8).toUpperCase(),
    data:     new Date().toISOString(),
    cliente:  cliente.trim(),
    fone:     fone.trim(),
    entrega,
    endereco: endereco?.trim() || 'Retirada na banca',
    pagamento,
    obs:      obs?.trim() || '',
    itens:    itens.map(i => ({
      nome:  String(i.nome),
      qtd:   Number(i.qtd),
      preco: Number(i.preco),
    })),
    subtotal: Number(subtotal.toFixed(2)),
    taxa:     Number(taxa.toFixed(2)),
    total:    Number(total.toFixed(2)),
    status:   'novo',
  };

  db.data.pedidos.unshift(pedido);
  await db.write();

  console.log(`📦 Novo pedido: ${pedido.id} — ${pedido.cliente} — R$ ${pedido.total}`);
  res.status(201).json({ ok: true, pedido });
});

// ── GET /api/pedidos/publico/:id — PÚBLICO (sem token) ───────────
// Usado pelo cliente na loja para consultar status do próprio pedido
router.get('/publico/:id', async (req, res) => {
  await db.read();
  const id = req.params.id.toUpperCase().trim();
  const pedido = db.data.pedidos.find(p => p.id === id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

  // Retorna apenas campos seguros (sem dados internos)
  const { id: pid, data, cliente, fone, entrega, endereco, pagamento, obs,
          itens, subtotal, taxa, total, status, atualizado_em } = pedido;

  res.json({ pedido: { id: pid, data, cliente, fone, entrega, endereco,
    pagamento, obs, itens, subtotal, taxa, total, status, atualizado_em } });
});

// ── GET /api/pedidos — protegido ──────────────────────────────────
router.get('/', async (req, res) => {
  await db.read();
  let lista = [...db.data.pedidos];

  if (req.query.status && req.query.status !== 'todos')
    lista = lista.filter(p => p.status === req.query.status);

  if (req.query.data)
    lista = lista.filter(p => p.data.startsWith(req.query.data));

  const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
  const limite = Math.min(100, parseInt(req.query.limite) || 50);
  const total  = lista.length;
  lista = lista.slice((pagina - 1) * limite, pagina * limite);

  res.json({ total, pagina, limite, pedidos: lista });
});

// ── GET /api/pedidos/:id — protegido ─────────────────────────────
router.get('/:id', async (req, res) => {
  await db.read();
  const pedido = db.data.pedidos.find(p => p.id === req.params.id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  res.json({ pedido });
});

// ── PATCH /api/pedidos/:id/status — protegido ────────────────────
// Retorna também o link WhatsApp para a dona notificar o cliente
router.patch('/:id/status', async (req, res) => {
  await db.read();
  const idx = db.data.pedidos.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Pedido não encontrado.' });

  const pedido = db.data.pedidos[idx];
  let novoStatus;

  if (req.body?.status) {
    if (!STATUS_VALIDOS.includes(req.body.status))
      return res.status(400).json({ erro: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` });
    novoStatus = req.body.status;
  } else {
    novoStatus = PROXIMO_STATUS[pedido.status];
    if (!novoStatus)
      return res.status(400).json({ erro: `Pedido já está no status final: ${pedido.status}` });
  }

  db.data.pedidos[idx].status       = novoStatus;
  db.data.pedidos[idx].atualizado_em = new Date().toISOString();
  await db.write();

  const pedidoAtualizado = db.data.pedidos[idx];

  // Monta link WhatsApp para a dona enviar ao cliente
  let wppLink = null;
  const fnMsg = MSG_STATUS[novoStatus];
  if (fnMsg) {
    const foneNum = pedidoAtualizado.fone.replace(/\D/g, '');
    const foneComDDI = foneNum.startsWith('55') ? foneNum : '55' + foneNum;
    const msg = encodeURIComponent(fnMsg(pedidoAtualizado));
    wppLink = `https://wa.me/${foneComDDI}?text=${msg}`;
  }

  console.log(`🔄 Pedido ${pedido.id} → ${novoStatus}`);
  res.json({ ok: true, pedido: pedidoAtualizado, wppLink });
});

// ── DELETE /api/pedidos/:id — protegido ──────────────────────────
router.delete('/:id', async (req, res) => {
  await db.read();
  const idx = db.data.pedidos.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ erro: 'Pedido não encontrado.' });

  db.data.pedidos[idx].status        = 'cancelado';
  db.data.pedidos[idx].atualizado_em = new Date().toISOString();
  await db.write();

  // Link WhatsApp para avisar o cliente
  const pedido = db.data.pedidos[idx];
  const foneNum    = pedido.fone.replace(/\D/g, '');
  const foneComDDI = foneNum.startsWith('55') ? foneNum : '55' + foneNum;
  const msg     = encodeURIComponent(MSG_STATUS.cancelado(pedido));
  const wppLink = `https://wa.me/${foneComDDI}?text=${msg}`;

  res.json({ ok: true, mensagem: 'Pedido cancelado.', wppLink });
});

// ── GET /api/pedidos/resumo/hoje — protegido ──────────────────────
router.get('/resumo/hoje', async (req, res) => {
  await db.read();
  const hoje   = new Date().toISOString().slice(0, 10);
  const doDia  = db.data.pedidos.filter(p => p.data.startsWith(hoje));
  const por_status = {};
  STATUS_VALIDOS.forEach(s => { por_status[s] = doDia.filter(p => p.status === s).length; });
  const faturamento = doDia.filter(p => p.status !== 'cancelado').reduce((s, p) => s + p.total, 0);
  res.json({ data: hoje, total_pedidos: doDia.length, faturamento: Number(faturamento.toFixed(2)), por_status });
});

// ── GET /api/pedidos/relatorio/geral — protegido ──────────────────
router.get('/relatorio/geral', async (req, res) => {
  await db.read();
  const todos = db.data.pedidos.filter(p => p.status !== 'cancelado');
  const cont_itens = {};
  todos.forEach(p => p.itens.forEach(i => {
    cont_itens[i.nome] = (cont_itens[i.nome] || 0) + i.qtd;
  }));
  const ranking_itens = Object.entries(cont_itens)
    .map(([nome, qtd]) => ({ nome, qtd }))
    .sort((a,b) => b.qtd - a.qtd).slice(0, 8);
  const pgto = { pix: 0, cartao: 0 };
  todos.forEach(p => { pgto[p.pagamento] = (pgto[p.pagamento] || 0) + 1; });
  const semana = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dia = d.toISOString().slice(0, 10);
    semana.push({
      data: dia,
      dia_semana: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
      pedidos: todos.filter(p => p.data.startsWith(dia)).length,
      faturamento: todos.filter(p => p.data.startsWith(dia)).reduce((s,p) => s + p.total, 0),
    });
  }
  const faturamento_total = todos.reduce((s, p) => s + p.total, 0);
  const ticket_medio = todos.length ? faturamento_total / todos.length : 0;
  res.json({
    total_pedidos: todos.length,
    entregues: todos.filter(p => p.status === 'entregue').length,
    faturamento_total: Number(faturamento_total.toFixed(2)),
    ticket_medio: Number(ticket_medio.toFixed(2)),
    ranking_itens, pagamentos: pgto, semana,
  });
});

export default router;
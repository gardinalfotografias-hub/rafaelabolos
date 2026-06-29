# 🌸 Banca da Dona Rosa — Backend

Sistema de vendas completo com Node.js + Express + banco de dados JSON local.

---

## 📁 Estrutura

```
banca-backend/
├── server.js              # Ponto de entrada
├── package.json
├── .env.example           # Variáveis de ambiente (copie para .env)
├── data/
│   ├── db.js              # Inicialização do banco (lowdb)
│   └── db.json            # Banco de dados (criado automaticamente)
├── middleware/
│   └── auth.js            # Verificação JWT
├── routes/
│   ├── auth.js            # Login e troca de senha
│   ├── pedidos.js         # CRUD de pedidos + relatórios
│   └── config.js          # Configurações da banca
└── public/                # Cole aqui os arquivos HTML
    ├── loja.html
    └── painel-dona.html
```

---

## 🚀 Como rodar

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Edite o .env com sua chave JWT
```

### 3. Copiar os HTMLs para a pasta public/
```bash
cp ../loja.html public/
cp ../painel-dona.html public/
```

### 4. Iniciar o servidor
```bash
# Produção
npm start

# Desenvolvimento (reinicia ao salvar)
npm run dev
```

Acesse:
- **Loja:** http://localhost:3001/loja.html
- **Painel:** http://localhost:3001/painel-dona.html

---

## 🔐 Credenciais padrão

| Campo   | Valor     |
|---------|-----------|
| Usuário | donarosa  |
| Senha   | rosa123   |

> Troque a senha no primeiro acesso pelo painel de configurações.

---

## 📡 Rotas da API

### Públicas (sem autenticação)

| Método | Rota                  | Descrição                        |
|--------|-----------------------|----------------------------------|
| POST   | /api/auth/login       | Login da dona (retorna JWT)      |
| POST   | /api/pedidos          | Cliente cria um pedido           |
| GET    | /api/config/publica   | Chave Pix e taxa de entrega      |
| GET    | /api/ping             | Health check                     |

### Protegidas (requer `Authorization: Bearer <token>`)

| Método | Rota                          | Descrição                        |
|--------|-------------------------------|----------------------------------|
| GET    | /api/pedidos                  | Lista pedidos (filtros: status, data) |
| GET    | /api/pedidos/:id              | Detalhe de um pedido             |
| PATCH  | /api/pedidos/:id/status       | Avança ou define status          |
| DELETE | /api/pedidos/:id              | Cancela um pedido                |
| GET    | /api/pedidos/resumo/hoje      | Resumo do dia (cards do painel)  |
| GET    | /api/pedidos/relatorio/geral  | Dados para a página de gerência  |
| GET    | /api/config                   | Configurações completas          |
| PUT    | /api/config                   | Atualiza configurações           |
| POST   | /api/auth/trocar-senha        | Altera a senha da dona           |

---

## 📦 Exemplo de pedido (POST /api/pedidos)

```json
{
  "cliente": "Maria Silva",
  "fone": "(42) 99999-0000",
  "entrega": "entrega",
  "endereco": "Rua das Flores, 123 - Centro",
  "pagamento": "pix",
  "obs": "Sem cebola na coxinha",
  "itens": [
    { "nome": "Coxinha Frango", "qtd": 3, "preco": 5.00 },
    { "nome": "Fatia de Chocolate", "qtd": 1, "preco": 8.00 }
  ]
}
```

---

## 🌐 Deploy (produção)

### Opção 1 — Railway / Render / Fly.io
1. Suba o código para um repositório GitHub
2. Conecte no Railway ou Render
3. Configure a variável `JWT_SECRET`
4. Pronto — o banco `db.json` persiste no volume

### Opção 2 — VPS própria
```bash
npm install -g pm2
pm2 start server.js --name banca-rosa
pm2 save
pm2 startup
```

---

## 🗄️ Banco de dados

Usa **lowdb** — armazena tudo em `data/db.json`. Simples e sem instalação de servidor de banco.
Se o projeto crescer, migre para SQLite (better-sqlite3) ou PostgreSQL com mínimas alterações nas rotas.

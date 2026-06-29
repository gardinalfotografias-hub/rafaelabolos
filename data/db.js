import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../data/db.json');

// Estrutura padrão do banco
const defaultData = {
  pedidos: [],
  config: {
    nome_banca: 'Banca da Dona Rosa',
    chave_pix: '(11) 99999-9999',
    taxa_entrega: 5.0,
    whatsapp: '',
  },
  usuario: {
    login: 'donarosa',
    // senha padrão: rosa123  (hash gerado com bcrypt rounds=10)
    senha_hash: bcrypt.hashSync('rosa123', 10),
  },
};

const adapter = new JSONFile(dbPath);
const db = new Low(adapter, defaultData);

// Garante que o arquivo existe e tem todos os campos
export async function initDB() {
  await db.read();

  // Merge: se faltar algum campo novo, adiciona sem apagar dados existentes
  db.data.pedidos  ??= defaultData.pedidos;
  db.data.config   ??= defaultData.config;
  db.data.usuario  ??= defaultData.usuario;

  await db.write();
  console.log('✅ Banco de dados carregado:', dbPath);
}

export { db };

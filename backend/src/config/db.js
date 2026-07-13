import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

// Si hay DATABASE_URL (Supabase/Render en producción) se usa esa connection
// string con SSL. En local (sin DATABASE_URL) se arma la conexión con las
// variables sueltas de siempre y sin SSL.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    })

// El pooler de Supabase (Supavisor) fuerza search_path='' por seguridad en
// cada conexión nueva. Sin esto, las queries sin schema explícito
// (ej: "SELECT * FROM puntos_reciclaje") fallan con "relation does not exist".
if (process.env.DATABASE_URL) {
  pool.on('connect', (client) => {
    client.query('SET search_path TO public')
  })
}

export default pool

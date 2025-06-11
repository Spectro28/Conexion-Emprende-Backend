import { pool } from './src/config/database';

pool.query('SELECT NOW()')
    .then((res) => console.log('Conexión exitosa:', res.rows[0]))
    .catch((err) => console.error('Error en la conexión:', err));

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Prueba conexión a la base de datos
sequelize.authenticate()
  .then(() => console.log("✅ Conectado a PostgreSQL"))
  .catch(err => console.error("❌ Error en la conexión:", err));

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('¡Backend funcionando!');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

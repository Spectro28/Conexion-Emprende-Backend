-- Crear tabla de tokens temporales
CREATE TABLE IF NOT EXISTS temp_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice en email para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_temp_tokens_email ON temp_tokens(email);

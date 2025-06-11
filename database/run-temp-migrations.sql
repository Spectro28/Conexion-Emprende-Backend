-- Primera migración: Modificar tabla users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'perfil') THEN
        ALTER TABLE users ADD COLUMN perfil VARCHAR(50);
    END IF;
END $$;

-- Segunda migración: Crear tabla verification_tokens
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'verification_tokens') THEN
        CREATE TABLE verification_tokens (
            id SERIAL PRIMARY KEY,
            token VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Crear índice único en el email
        CREATE UNIQUE INDEX idx_verification_tokens_email ON verification_tokens(email);

        -- Crear trigger para actualizar el timestamp
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER update_verification_tokens_updated_at
            BEFORE UPDATE ON verification_tokens
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

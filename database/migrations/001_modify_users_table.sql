-- Modificar la tabla users para permitir que el campo perfil sea NULL
ALTER TABLE users ALTER COLUMN perfil DROP NOT NULL;

-- Asegurarse de que el campo perfil sea NOT NULL después de la selección
CREATE OR REPLACE FUNCTION check_profile_not_null()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.perfil IS NULL AND NEW.is_verified = TRUE THEN
        RAISE EXCEPTION 'El perfil no puede ser NULL para usuarios verificados';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecuta antes de INSERT o UPDATE
CREATE OR REPLACE TRIGGER check_profile_not_null_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION check_profile_not_null();

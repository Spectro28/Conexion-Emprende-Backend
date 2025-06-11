-- Crear tabla para tokens de verificación
drop table if exists verification_tokens;

create table verification_tokens (
    id serial primary key,
    email varchar(255) not null,
    token varchar(255) not null,
    expires_at timestamp not null,
    created_at timestamp default current_timestamp,
    unique (email)
);

-- Índice para búsqueda rápida por email
create index idx_verification_tokens_email on verification_tokens(email);

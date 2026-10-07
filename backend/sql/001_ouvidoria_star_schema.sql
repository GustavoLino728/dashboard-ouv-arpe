-- docker-entrypoint-initdb.d/01-init.sql
-- Só garante extensões e setup de banco. Schema é responsabilidade do Alembic.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
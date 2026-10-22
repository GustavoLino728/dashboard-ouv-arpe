"""cria tabela users

Revision ID: 4f7566187c78
Revises: 20260923_ouvidoria_star_schema
Create Date: 2026-10-07 13:29:08.065392

"""
from typing import Sequence, Union

from alembic import op

revision: str = "4f7566187c78"
down_revision: Union[str, Sequence[str], None] = "20260923_ouvidoria_star_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Cria a tabela users (idempotente)."""
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(120) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(30) NOT NULL DEFAULT 'servidor',
            department VARCHAR(50),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)


def downgrade() -> None:
    """Remove a tabela users."""
    op.execute("DROP TABLE IF EXISTS users CASCADE")
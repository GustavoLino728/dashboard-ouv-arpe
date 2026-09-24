"""create ouvidoria star schema

Revision ID: 20260923_ouvidoria_star_schema
Revises: 
Create Date: 2026-09-23
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260923_ouvidoria_star_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "dim_data",
        sa.Column("sk_data", sa.Integer(), nullable=False),
        sa.Column("data_completa", sa.Date(), nullable=False),
        sa.Column("ano", sa.Integer(), nullable=False),
        sa.Column("mes", sa.Integer(), nullable=False),
        sa.Column("nome_mes", sa.String(length=20), nullable=False),
        sa.Column("ano_mes", sa.String(length=7), nullable=False),
        sa.PrimaryKeyConstraint("sk_data"),
        sa.UniqueConstraint("data_completa"),
    )
    op.create_index("ix_dim_data_ano", "dim_data", ["ano"])
    op.create_index("ix_dim_data_ano_mes", "dim_data", ["ano_mes"])
    op.create_index("idx_dim_data_ano_mes_mes", "dim_data", ["ano", "mes"])

    op.create_table(
        "dim_assunto",
        sa.Column("sk_assunto", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("assunto", sa.String(length=255), nullable=False),
        sa.Column("subassunto", sa.String(length=255), nullable=False),
        sa.Column("flag_dificuldade_call_center", sa.Boolean(), nullable=False),
        sa.Column("flag_desconsiderar_regra_arpe", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("sk_assunto"),
        sa.UniqueConstraint("assunto", "subassunto", name="uq_dim_assunto_assunto_subassunto"),
    )
    op.create_index("ix_dim_assunto_flag_dificuldade_call_center", "dim_assunto", ["flag_dificuldade_call_center"])
    op.create_index("ix_dim_assunto_flag_desconsiderar_regra_arpe", "dim_assunto", ["flag_desconsiderar_regra_arpe"])
    op.create_index("idx_dim_assunto_subassunto", "dim_assunto", ["subassunto"])

    op.create_table(
        "dim_origem",
        sa.Column("sk_origem", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("orgao_origem", sa.String(length=255), nullable=True),
        sa.Column("origem_atendimento", sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint("sk_origem"),
        sa.UniqueConstraint("orgao_origem", "origem_atendimento", name="uq_dim_origem"),
    )
    op.create_index("idx_dim_origem_atendimento", "dim_origem", ["origem_atendimento"])

    op.create_table(
        "dim_status",
        sa.Column("sk_status", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("modalidade_atendimento", sa.String(length=100), nullable=True),
        sa.Column("tipo_atendimento", sa.String(length=100), nullable=True),
        sa.Column("situacao", sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint("sk_status"),
        sa.UniqueConstraint("modalidade_atendimento", "tipo_atendimento", "situacao", name="uq_dim_status"),
    )

    op.create_table(
        "uploads_planilhas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nome_planilha", sa.String(length=255), nullable=False),
        sa.Column("nome_arquivo_original", sa.String(length=255), nullable=False),
        sa.Column("worksheet", sa.String(length=100), nullable=False),
        sa.Column("competencia_ano_mes", sa.String(length=7), nullable=True),
        sa.Column("quantidade_registros", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="concluido"),
        sa.Column("mensagem", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_uploads_planilhas_competencia", "uploads_planilhas", ["competencia_ano_mes"])

    op.create_table(
        "fato_manifestacoes",
        sa.Column("id_protocolo", sa.String(length=100), nullable=False),
        sa.Column("sk_data_criacao", sa.Integer(), nullable=False),
        sa.Column("sk_data_prorrogacao", sa.Integer(), nullable=True),
        sa.Column("sk_data_conclusao", sa.Integer(), nullable=True),
        sa.Column("sk_assunto", sa.Integer(), nullable=False),
        sa.Column("sk_origem", sa.Integer(), nullable=False),
        sa.Column("sk_status", sa.Integer(), nullable=False),
        sa.Column("upload_id", sa.Integer(), nullable=True),
        sa.Column("palavras_chave", sa.Text(), nullable=True),
        sa.Column("setores", sa.String(length=255), nullable=True),
        sa.Column("dias_para_conclusao", sa.Integer(), nullable=True),
        sa.Column("qtd_manifestacoes", sa.Integer(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(["sk_assunto"], ["dim_assunto.sk_assunto"]),
        sa.ForeignKeyConstraint(["sk_data_conclusao"], ["dim_data.sk_data"]),
        sa.ForeignKeyConstraint(["sk_data_criacao"], ["dim_data.sk_data"]),
        sa.ForeignKeyConstraint(["sk_data_prorrogacao"], ["dim_data.sk_data"]),
        sa.ForeignKeyConstraint(["sk_origem"], ["dim_origem.sk_origem"]),
        sa.ForeignKeyConstraint(["sk_status"], ["dim_status.sk_status"]),
        sa.ForeignKeyConstraint(["upload_id"], ["uploads_planilhas.id"]),
        sa.PrimaryKeyConstraint("id_protocolo"),
    )
    op.create_index("idx_fato_data_assunto", "fato_manifestacoes", ["sk_data_criacao", "sk_assunto"])
    op.create_index("ix_fato_manifestacoes_sk_assunto", "fato_manifestacoes", ["sk_assunto"])
    op.create_index("ix_fato_manifestacoes_sk_data_criacao", "fato_manifestacoes", ["sk_data_criacao"])
    op.create_index("ix_fato_manifestacoes_sk_origem", "fato_manifestacoes", ["sk_origem"])
    op.create_index("ix_fato_manifestacoes_sk_status", "fato_manifestacoes", ["sk_status"])
    op.create_index("idx_fato_upload_id", "fato_manifestacoes", ["upload_id"])


def downgrade() -> None:
    op.drop_table("fato_manifestacoes")
    op.drop_table("uploads_planilhas")
    op.drop_table("dim_status")
    op.drop_table("dim_origem")
    op.drop_table("dim_assunto")
    op.drop_table("dim_data")

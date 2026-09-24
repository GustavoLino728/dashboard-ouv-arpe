from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


CALL_CENTER_SUBASSUNTO = "DIFICULDADE DE ATENDIMENTO PELO CALL CENTER COMPESA"
DESCONSIDERAR_SUBASSUNTO = (
    "INFORMAÇÕES TELEFONE/ ENDEREÇO DA PRESTADORA DE SERVIÇO DE SANEAMENTO"
)


class DimData(Base):
    __tablename__ = "dim_data"

    sk_data: Mapped[int] = mapped_column(Integer, primary_key=True)
    data_completa: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    ano: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    mes: Mapped[int] = mapped_column(Integer, nullable=False)
    nome_mes: Mapped[str] = mapped_column(String(20), nullable=False)
    ano_mes: Mapped[str] = mapped_column(String(7), nullable=False, index=True)


class DimAssunto(Base):
    __tablename__ = "dim_assunto"
    __table_args__ = (
        UniqueConstraint("assunto", "subassunto", name="uq_dim_assunto_assunto_subassunto"),
    )

    sk_assunto: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    assunto: Mapped[str] = mapped_column(String(255), nullable=False)
    subassunto: Mapped[str] = mapped_column(String(255), nullable=False)
    flag_dificuldade_call_center: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )
    flag_desconsiderar_regra_arpe: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )


class DimOrigem(Base):
    __tablename__ = "dim_origem"
    __table_args__ = (
        UniqueConstraint("orgao_origem", "origem_atendimento", name="uq_dim_origem"),
    )

    sk_origem: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    orgao_origem: Mapped[str | None] = mapped_column(String(255), nullable=True)
    origem_atendimento: Mapped[str | None] = mapped_column(String(100), nullable=True)


class DimStatus(Base):
    __tablename__ = "dim_status"
    __table_args__ = (
        UniqueConstraint(
            "modalidade_atendimento",
            "tipo_atendimento",
            "situacao",
            name="uq_dim_status",
        ),
    )

    sk_status: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    modalidade_atendimento: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tipo_atendimento: Mapped[str | None] = mapped_column(String(100), nullable=True)
    situacao: Mapped[str | None] = mapped_column(String(100), nullable=True)


class UploadPlanilha(Base):
    __tablename__ = "uploads_planilhas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome_planilha: Mapped[str] = mapped_column(String(255), nullable=False)
    nome_arquivo_original: Mapped[str] = mapped_column(String(255), nullable=False)
    worksheet: Mapped[str] = mapped_column(String(100), nullable=False)
    competencia_ano_mes: Mapped[str | None] = mapped_column(String(7), nullable=True, index=True)
    quantidade_registros: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="concluido")
    mensagem: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class FatoManifestacao(Base):
    __tablename__ = "fato_manifestacoes"

    id_protocolo: Mapped[str] = mapped_column(String(100), primary_key=True)
    sk_data_criacao: Mapped[int] = mapped_column(ForeignKey("dim_data.sk_data"), nullable=False, index=True)
    sk_data_prorrogacao: Mapped[int | None] = mapped_column(ForeignKey("dim_data.sk_data"), nullable=True)
    sk_data_conclusao: Mapped[int | None] = mapped_column(ForeignKey("dim_data.sk_data"), nullable=True)
    sk_assunto: Mapped[int] = mapped_column(ForeignKey("dim_assunto.sk_assunto"), nullable=False, index=True)
    sk_origem: Mapped[int] = mapped_column(ForeignKey("dim_origem.sk_origem"), nullable=False, index=True)
    sk_status: Mapped[int] = mapped_column(ForeignKey("dim_status.sk_status"), nullable=False, index=True)
    upload_id: Mapped[int | None] = mapped_column(ForeignKey("uploads_planilhas.id"), nullable=True, index=True)
    palavras_chave: Mapped[str | None] = mapped_column(Text, nullable=True)
    setores: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dias_para_conclusao: Mapped[int | None] = mapped_column(Integer, nullable=True)
    qtd_manifestacoes: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    data_criacao: Mapped[DimData] = relationship("DimData", foreign_keys=[sk_data_criacao])
    assunto: Mapped[DimAssunto] = relationship("DimAssunto")
    origem: Mapped[DimOrigem] = relationship("DimOrigem")
    status: Mapped[DimStatus] = relationship("DimStatus")
    upload: Mapped[UploadPlanilha | None] = relationship("UploadPlanilha")

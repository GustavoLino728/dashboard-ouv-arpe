import pytest
from sqlalchemy import text

from app.domain.ouvidoria.services import (
    get_call_center_comparison,
    get_kpis,
    get_manifestacoes,
    get_monthly_series,
)


async def _seed_minimo(db):
    """Cria um conjunto mínimo de dimensões e fatos para os testes."""
    # dim_data
    await db.execute(
        text(
            """
            INSERT INTO dim_data (sk_data, data_completa, ano, mes, nome_mes, ano_mes)
            VALUES
                (20250115, '2025-01-15', 2025, 1, 'Janeiro', '2025-01'),
                (20250210, '2025-02-10', 2025, 2, 'Fevereiro', '2025-02')
            """
        )
    )

    # dim_assunto — um call center, um comum, um a desconsiderar
    await db.execute(
        text(
            """
            INSERT INTO dim_assunto
                (sk_assunto, assunto, subassunto, flag_dificuldade_call_center, flag_desconsiderar_regra_arpe)
            VALUES
                (1, 'Atendimento', 'Dificuldade de atendimento call center Compesa', TRUE, FALSE),
                (2, 'Água', 'Falta de água', FALSE, FALSE),
                (3, 'Saneamento', 'Informação de telefone da prestadora de saneamento', FALSE, TRUE)
            """
        )
    )

    # dim_origem
    await db.execute(
        text(
            """
            INSERT INTO dim_origem (sk_origem, orgao_origem, origem_atendimento)
            VALUES (1, 'OUVE PE', 'Telefone')
            """
        )
    )

    # dim_status
    await db.execute(
        text(
            """
            INSERT INTO dim_status (sk_status, modalidade_atendimento, tipo_atendimento, situacao)
            VALUES
                (1, 'Reclamação', 'Reclamação', 'Concluída'),
                (2, 'Denúncia', 'Denúncia', 'Em andamento')
            """
        )
    )

    # uploads_planilhas (opcional, para o JOIN)
    await db.execute(
        text(
            """
            INSERT INTO uploads_planilhas
                (id, nome_planilha, nome_arquivo_original, worksheet,
                 quantidade_registros, status)
            VALUES
                (1, 'planilha.xlsx', 'planilha.xlsx', 'Dados', 0, 'concluido')
            """
        )
    )


    # fato_manifestacoes
    await db.execute(
        text(
            """
            INSERT INTO fato_manifestacoes (
                id_protocolo, sk_data_criacao, sk_assunto, sk_origem, sk_status,
                upload_id, dias_para_conclusao, qtd_manifestacoes
            )
            VALUES
                ('P001', 20250115, 1, 1, 1, 1, 5, 1),    -- call center, janeiro
                ('P002', 20250115, 2, 1, 1, 1, 10, 1),   -- falta de água, janeiro
                ('P003', 20250210, 1, 1, 1, 1, 20, 1),   -- call center, fevereiro
                ('P004', 20250210, 2, 1, 2, 1, 40, 1),   -- falta de água, fevereiro
                ('P005', 20250210, 3, 1, 1, 1, 3, 1)     -- a desconsiderar, fevereiro
            """
        )
    )
    await db.flush()


async def test_get_monthly_series_agrega_por_mes(db_session):
    await _seed_minimo(db_session)

    series = await get_monthly_series(db_session)

    assert len(series) == 2
    janeiro = next(s for s in series if s["ano_mes"] == "2025-01")
    fevereiro = next(s for s in series if s["ano_mes"] == "2025-02")

    assert janeiro["total"] == 2
    assert janeiro["call_center"] == 1
    assert fevereiro["total"] == 3
    assert fevereiro["call_center"] == 1


async def test_get_monthly_series_respeita_periodo(db_session):
    await _seed_minimo(db_session)

    series = await get_monthly_series(
        db_session, ano_mes_inicio="2025-02", ano_mes_fim="2025-02"
    )

    assert len(series) == 1
    assert series[0]["ano_mes"] == "2025-02"


async def test_get_kpis_calcula_total_media_pico_menor(db_session):
    await _seed_minimo(db_session)

    kpis = await get_kpis(db_session)

    assert kpis["total_manifestacoes"] == 5
    assert kpis["total_meses"] == 2
    assert kpis["media_mensal"] == 2.5
    assert kpis["pico_mes"]["ano_mes"] == "2025-02"
    assert kpis["pico_mes"]["total"] == 3
    assert kpis["menor_mes"]["ano_mes"] == "2025-01"
    assert kpis["menor_mes"]["total"] == 2


async def test_get_kpis_usa_destaque_padrao(db_session):
    """Sem subassunto_destaque, usa a flag de call center."""
    await _seed_minimo(db_session)

    kpis = await get_kpis(db_session)

    assert kpis["total_call_center"] == 2  # P001 e P003
    assert kpis["rotulo_destaque"] == "Call Center Compesa"


async def test_get_kpis_respeita_destaque_customizado(db_session):
    await _seed_minimo(db_session)

    kpis = await get_kpis(db_session, subassunto_destaque="Falta de água")

    # P002 e P004 são "Falta de água"
    assert kpis["total_call_center"] == 2
    assert kpis["rotulo_destaque"] == "Falta de água"


async def test_get_call_center_comparison_exclui_desconsiderar(db_session):
    await _seed_minimo(db_session)

    comparison = await get_call_center_comparison(db_session)

    # 5 registros no total, 1 tem flag_desconsiderar, então total_considerado = 4
    assert comparison["total_considerado"] == 4
    grupos = {item["grupo"]: item for item in comparison["itens"]}
    assert "Call Center Compesa" in grupos
    assert grupos["Call Center Compesa"]["total"] == 2
    assert grupos["Call Center Compesa"]["eh_destaque"] is True


async def test_get_manifestacoes_page_size_respeita_minimo(db_session):
    """O service força page_size mínimo de 10."""
    await _seed_minimo(db_session)

    result = await get_manifestacoes(db_session, page=1, page_size=2)

    assert result["page_size"] == 10
    assert result["total_filtrado"] == 5
    assert result["total_pages"] == 1
    assert len(result["items"]) == 5


async def test_get_manifestacoes_filtro_situacao(db_session):
    await _seed_minimo(db_session)

    result = await get_manifestacoes(db_session, situacao="Em andamento")

    assert result["total_filtrado"] == 1
    assert result["items"][0]["id_protocolo"] == "P004"


async def test_get_manifestacoes_filtro_dias_min(db_session):
    await _seed_minimo(db_session)

    result = await get_manifestacoes(db_session, dias_min=20)

    # P003 (20), P004 (40)
    protocolos = {item["id_protocolo"] for item in result["items"]}
    assert protocolos == {"P003", "P004"}


async def test_get_manifestacoes_filtro_dias_max(db_session):
    await _seed_minimo(db_session)

    result = await get_manifestacoes(db_session, dias_max=10)

    # P001 (5), P002 (10), P005 (3)
    protocolos = {item["id_protocolo"] for item in result["items"]}
    assert protocolos == {"P001", "P002", "P005"}


async def test_get_manifestacoes_sem_resultado(db_session):
    await _seed_minimo(db_session)

    result = await get_manifestacoes(db_session, assunto="Inexistente")

    assert result["total_filtrado"] == 0
    assert result["items"] == []
    assert result["total_pages"] == 0


async def test_ensure_upload_schema_idempotente(db_session):
    """Rodar duas vezes não deve quebrar."""
    from app.domain.ouvidoria.services import ensure_upload_schema

    await ensure_upload_schema(db_session)
    await ensure_upload_schema(db_session)

    result = await db_session.execute(
        text("SELECT COUNT(*) FROM uploads_planilhas")
    )
    assert result.scalar_one() == 0
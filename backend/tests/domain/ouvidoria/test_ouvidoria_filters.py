from app.domain.ouvidoria.services import _build_filters


def test_build_filters_vazio():
    where_sql, params = _build_filters()
    assert where_sql == ""
    assert params == {}


def test_build_filters_ano():
    where_sql, params = _build_filters(ano=2025)
    assert "d.ano = :ano" in where_sql
    assert params == {"ano": 2025}


def test_build_filters_periodo():
    where_sql, params = _build_filters(
        ano_mes_inicio="2025-01", ano_mes_fim="2025-12"
    )
    assert "d.ano_mes >= :ano_mes_inicio" in where_sql
    assert "d.ano_mes <= :ano_mes_fim" in where_sql
    assert params["ano_mes_inicio"] == "2025-01"
    assert params["ano_mes_fim"] == "2025-12"


def test_build_filters_origem_usa_coalesce():
    where_sql, params = _build_filters(origem="Telefone")
    assert "COALESCE(o.origem_atendimento, 'Não informado') = :origem" in where_sql
    assert params == {"origem": "Telefone"}


def test_build_filters_composicao():
    where_sql, params = _build_filters(
        ano_mes_inicio="2025-01",
        ano_mes_fim="2025-12",
        assunto="Água",
        subassunto="Falta de água",
        situacao="Concluída",
        tipo_atendimento="Reclamação",
        dias_min=10,
        dias_max=90,
    )

    assert "d.ano_mes >= :ano_mes_inicio" in where_sql
    assert "d.ano_mes <= :ano_mes_fim" in where_sql
    assert "a.assunto = :assunto" in where_sql
    assert "a.subassunto = :subassunto" in where_sql
    assert "s.situacao = :situacao" in where_sql
    assert "s.tipo_atendimento = :tipo_atendimento" in where_sql
    assert "f.dias_para_conclusao >= :dias_min" in where_sql
    assert "f.dias_para_conclusao <= :dias_max" in where_sql

    assert params["assunto"] == "Água"
    assert params["dias_min"] == 10
    assert params["dias_max"] == 90


def test_build_filters_dias_zero_eh_aplicado():
    """0 é um valor válido para dias_min — não pode ser tratado como falsy."""
    where_sql, params = _build_filters(dias_min=0)
    assert "f.dias_para_conclusao >= :dias_min" in where_sql
    assert params["dias_min"] == 0


def test_build_filters_sem_clausulas_retorna_string_vazia():
    where_sql, _ = _build_filters()
    assert where_sql == ""
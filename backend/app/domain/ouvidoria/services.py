from math import ceil
from typing import Any

import pandas as pd
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.ouvidoria.models import UploadPlanilha
from app.domain.ouvidoria.parser import (
    MONTHS_PT,
    is_call_center_subassunto,
    is_desconsiderar_subassunto,
    read_excel_bytes,
    sk_from_date,
)


def _none_if_nan(value: Any) -> Any:
    if pd.isna(value):
        return None
    return value


async def ensure_upload_schema(db: AsyncSession) -> None:
    await db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS uploads_planilhas (
                id SERIAL PRIMARY KEY,
                nome_planilha VARCHAR(255) NOT NULL,
                nome_arquivo_original VARCHAR(255) NOT NULL,
                worksheet VARCHAR(100) NOT NULL,
                competencia_ano_mes VARCHAR(7),
                quantidade_registros INT NOT NULL DEFAULT 0,
                status VARCHAR(30) NOT NULL DEFAULT 'concluido',
                mensagem TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    )
    await db.execute(
        text("ALTER TABLE fato_manifestacoes ADD COLUMN IF NOT EXISTS upload_id INT REFERENCES uploads_planilhas(id)")
    )
    await db.execute(
        text("CREATE INDEX IF NOT EXISTS idx_uploads_planilhas_competencia ON uploads_planilhas (competencia_ano_mes)")
    )
    await db.execute(
        text("CREATE INDEX IF NOT EXISTS idx_fato_upload_id ON fato_manifestacoes (upload_id)")
    )


def _build_filters(
    ano: int | None = None,
    ano_mes_inicio: str | None = None,
    ano_mes_fim: str | None = None,
    origem: str | None = None,
    assunto: str | None = None,
    subassunto: str | None = None,
) -> tuple[str, dict[str, Any]]:
    clauses = []
    params: dict[str, Any] = {}

    if ano:
        clauses.append("d.ano = :ano")
        params["ano"] = ano
    if ano_mes_inicio:
        clauses.append("d.ano_mes >= :ano_mes_inicio")
        params["ano_mes_inicio"] = ano_mes_inicio
    if ano_mes_fim:
        clauses.append("d.ano_mes <= :ano_mes_fim")
        params["ano_mes_fim"] = ano_mes_fim
    if origem:
        clauses.append("COALESCE(o.origem_atendimento, 'Não informado') = :origem")
        params["origem"] = origem
    if assunto:
        clauses.append("a.assunto = :assunto")
        params["assunto"] = assunto
    if subassunto:
        clauses.append("a.subassunto = :subassunto")
        params["subassunto"] = subassunto

    where_sql = " AND ".join(clauses)
    return (f"WHERE {where_sql}" if where_sql else ""), params


async def get_filters(db: AsyncSession) -> dict[str, Any]:
    rows = await db.execute(
        text(
            """
            SELECT DISTINCT d.ano, d.mes, d.ano_mes, d.nome_mes
            FROM dim_data d
            JOIN fato_manifestacoes f ON f.sk_data_criacao = d.sk_data
            ORDER BY d.ano_mes
            """
        )
    )
    dates = rows.mappings().all()

    origins = await db.execute(
        text(
            """
            SELECT DISTINCT COALESCE(origem_atendimento, 'Não informado') AS origem
            FROM dim_origem
            ORDER BY origem
            """
        )
    )
    assuntos = await db.execute(text("SELECT DISTINCT assunto FROM dim_assunto ORDER BY assunto"))
    subassuntos = await db.execute(text("SELECT DISTINCT subassunto FROM dim_assunto ORDER BY subassunto"))

    return {
        "anos": sorted({row["ano"] for row in dates}),
        "meses": [
            {"value": row["ano_mes"], "label": f"{row['nome_mes']}/{row['ano']}"}
            for row in dates
        ],
        "origens": [{"value": row["origem"], "label": row["origem"]} for row in origins.mappings()],
        "assuntos": [{"value": row[0], "label": row[0]} for row in assuntos.all()],
        "subassuntos": [{"value": row[0], "label": row[0]} for row in subassuntos.all()],
    }


async def list_uploads(db: AsyncSession) -> list[UploadPlanilha]:
    result = await db.execute(select(UploadPlanilha).order_by(UploadPlanilha.created_at.desc()))
    return list(result.scalars().all())


async def _upsert_dim_data(db: AsyncSession, dates: set) -> None:
    for value in sorted(dates):
        await db.execute(
            text(
                """
                INSERT INTO dim_data (sk_data, data_completa, ano, mes, nome_mes, ano_mes)
                VALUES (:sk_data, :data_completa, :ano, :mes, :nome_mes, :ano_mes)
                ON CONFLICT (sk_data) DO UPDATE SET
                    data_completa = EXCLUDED.data_completa,
                    ano = EXCLUDED.ano,
                    mes = EXCLUDED.mes,
                    nome_mes = EXCLUDED.nome_mes,
                    ano_mes = EXCLUDED.ano_mes
                """
            ),
            {
                "sk_data": sk_from_date(value),
                "data_completa": value,
                "ano": value.year,
                "mes": value.month,
                "nome_mes": MONTHS_PT[value.month],
                "ano_mes": value.strftime("%Y-%m"),
            },
        )


async def _upsert_dimensions(db: AsyncSession, df: pd.DataFrame):
    for assunto, subassunto in df[["assunto", "subassunto"]].drop_duplicates().itertuples(index=False):
        await db.execute(
            text(
                """
                INSERT INTO dim_assunto (
                    assunto, subassunto, flag_dificuldade_call_center, flag_desconsiderar_regra_arpe
                )
                VALUES (:assunto, :subassunto, :flag_call_center, :flag_desconsiderar)
                ON CONFLICT (assunto, subassunto) DO UPDATE SET
                    flag_dificuldade_call_center = EXCLUDED.flag_dificuldade_call_center,
                    flag_desconsiderar_regra_arpe = EXCLUDED.flag_desconsiderar_regra_arpe
                """
            ),
            {
                "assunto": assunto,
                "subassunto": subassunto,
                "flag_call_center": is_call_center_subassunto(subassunto),
                "flag_desconsiderar": is_desconsiderar_subassunto(subassunto),
            },
        )

    for orgao, origem in df[["orgao_origem", "origem_atendimento"]].drop_duplicates().itertuples(index=False):
        await db.execute(
            text(
                """
                INSERT INTO dim_origem (orgao_origem, origem_atendimento)
                VALUES (:orgao, :origem)
                ON CONFLICT (orgao_origem, origem_atendimento) DO NOTHING
                """
            ),
            {"orgao": orgao, "origem": origem},
        )

    status_cols = ["modalidade_atendimento", "tipo_atendimento", "situacao"]
    for modalidade, tipo, situacao in df[status_cols].drop_duplicates().itertuples(index=False):
        await db.execute(
            text(
                """
                INSERT INTO dim_status (modalidade_atendimento, tipo_atendimento, situacao)
                VALUES (:modalidade, :tipo, :situacao)
                ON CONFLICT (modalidade_atendimento, tipo_atendimento, situacao) DO NOTHING
                """
            ),
            {"modalidade": modalidade, "tipo": tipo, "situacao": situacao},
        )

    assunto_rows = await db.execute(text("SELECT sk_assunto, assunto, subassunto FROM dim_assunto"))
    origem_rows = await db.execute(text("SELECT sk_origem, orgao_origem, origem_atendimento FROM dim_origem"))
    status_rows = await db.execute(text("SELECT sk_status, modalidade_atendimento, tipo_atendimento, situacao FROM dim_status"))

    assunto_map = {
        (row.assunto, row.subassunto): row.sk_assunto
        for row in assunto_rows.fetchall()
    }
    origem_map = {
        (row.orgao_origem, row.origem_atendimento): row.sk_origem
        for row in origem_rows.fetchall()
    }
    status_map = {
        (row.modalidade_atendimento, row.tipo_atendimento, row.situacao): row.sk_status
        for row in status_rows.fetchall()
    }
    return assunto_map, origem_map, status_map


async def _upsert_facts(db: AsyncSession, df: pd.DataFrame, upload_id: int, assunto_map, origem_map, status_map) -> int:
    count = 0
    for row in df.itertuples(index=False):
        await db.execute(
            text(
                """
                INSERT INTO fato_manifestacoes (
                    id_protocolo, sk_data_criacao, sk_data_prorrogacao, sk_data_conclusao,
                    sk_assunto, sk_origem, sk_status, upload_id, palavras_chave, setores,
                    dias_para_conclusao, qtd_manifestacoes
                )
                VALUES (
                    :id_protocolo, :sk_data_criacao, :sk_data_prorrogacao, :sk_data_conclusao,
                    :sk_assunto, :sk_origem, :sk_status, :upload_id, :palavras_chave, :setores,
                    :dias_para_conclusao, 1
                )
                ON CONFLICT (id_protocolo) DO UPDATE SET
                    sk_data_criacao = EXCLUDED.sk_data_criacao,
                    sk_data_prorrogacao = EXCLUDED.sk_data_prorrogacao,
                    sk_data_conclusao = EXCLUDED.sk_data_conclusao,
                    sk_assunto = EXCLUDED.sk_assunto,
                    sk_origem = EXCLUDED.sk_origem,
                    sk_status = EXCLUDED.sk_status,
                    upload_id = EXCLUDED.upload_id,
                    palavras_chave = EXCLUDED.palavras_chave,
                    setores = EXCLUDED.setores,
                    dias_para_conclusao = EXCLUDED.dias_para_conclusao,
                    qtd_manifestacoes = 1
                """
            ),
            {
                "id_protocolo": row.id_protocolo,
                "sk_data_criacao": sk_from_date(row.data_criacao),
                "sk_data_prorrogacao": sk_from_date(row.data_prorrogacao) if row.data_prorrogacao else None,
                "sk_data_conclusao": sk_from_date(row.data_conclusao) if row.data_conclusao else None,
                "sk_assunto": assunto_map[(row.assunto, row.subassunto)],
                "sk_origem": origem_map[(row.orgao_origem, row.origem_atendimento)],
                "sk_status": status_map[(row.modalidade_atendimento, row.tipo_atendimento, row.situacao)],
                "upload_id": upload_id,
                "palavras_chave": _none_if_nan(row.palavras_chave),
                "setores": _none_if_nan(row.setores),
                "dias_para_conclusao": _none_if_nan(row.dias_para_conclusao),
            },
        )
        count += 1
    return count


async def upload_planilha(db: AsyncSession, contents: bytes, filename: str, nome_planilha: str | None = None) -> dict[str, Any]:
    parsed = read_excel_bytes(contents, filename)
    df = parsed.dataframe
    if df.empty:
        raise ValueError("A planilha nao possui registros validos para carga.")

    display_name = nome_planilha.strip() if nome_planilha and nome_planilha.strip() else parsed.suggested_name
    upload = UploadPlanilha(
        nome_planilha=display_name,
        nome_arquivo_original=filename,
        worksheet=parsed.worksheet_name,
        competencia_ano_mes=parsed.competencia_ano_mes,
        quantidade_registros=0,
        status="processando",
    )
    db.add(upload)
    await db.flush()

    all_dates = set()
    for col in ["data_criacao", "data_prorrogacao", "data_conclusao"]:
        all_dates.update(value for value in df[col].dropna().tolist() if value)

    await _upsert_dim_data(db, all_dates)
    assunto_map, origem_map, status_map = await _upsert_dimensions(db, df)
    processed = await _upsert_facts(db, df, upload.id, assunto_map, origem_map, status_map)

    upload.quantidade_registros = processed
    upload.status = "concluido"
    upload.mensagem = "Carga concluida com sucesso."
    await db.flush()

    return {
        "id": upload.id,
        "nome_planilha": upload.nome_planilha,
        "nome_arquivo_original": upload.nome_arquivo_original,
        "worksheet": upload.worksheet,
        "competencia_ano_mes": upload.competencia_ano_mes,
        "quantidade_registros": upload.quantidade_registros,
        "status": upload.status,
        "mensagem": upload.mensagem,
        "created_at": upload.created_at,
        "registros_processados": processed,
    }


async def delete_upload(db: AsyncSession, upload_id: int) -> dict[str, int]:
    upload = await db.get(UploadPlanilha, upload_id)
    if not upload:
        raise ValueError("Upload nao encontrado.")

    result = await db.execute(
        text("DELETE FROM fato_manifestacoes WHERE upload_id = :upload_id"),
        {"upload_id": upload_id},
    )
    await db.delete(upload)
    return {
        "upload_id": upload_id,
        "manifestacoes_removidas": result.rowcount or 0,
    }


async def get_manifestacoes(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 25,
    **filters: Any,
) -> dict[str, Any]:
    page = max(page, 1)
    page_size = min(max(page_size, 10), 100)
    offset = (page - 1) * page_size
    where_sql, params = _build_filters(**filters)

    total_geral_result = await db.execute(text("SELECT COUNT(*)::int FROM fato_manifestacoes"))
    total_geral = total_geral_result.scalar_one()

    total_filtrado_result = await db.execute(
        text(
            f"""
            SELECT COUNT(*)::int
            FROM fato_manifestacoes f
            JOIN dim_data d ON d.sk_data = f.sk_data_criacao
            JOIN dim_assunto a ON a.sk_assunto = f.sk_assunto
            JOIN dim_origem o ON o.sk_origem = f.sk_origem
            {where_sql}
            """
        ),
        params,
    )
    total_filtrado = total_filtrado_result.scalar_one()

    list_params = {**params, "limit": page_size, "offset": offset}
    rows = await db.execute(
        text(
            f"""
            SELECT
                f.id_protocolo,
                dc.data_completa AS data_criacao,
                dp.data_completa AS data_prorrogacao,
                dco.data_completa AS data_conclusao,
                dc.ano_mes,
                a.assunto,
                a.subassunto,
                o.orgao_origem,
                o.origem_atendimento,
                s.modalidade_atendimento,
                s.tipo_atendimento,
                s.situacao,
                f.palavras_chave,
                f.setores,
                f.dias_para_conclusao,
                u.nome_planilha
            FROM fato_manifestacoes f
            JOIN dim_data dc ON dc.sk_data = f.sk_data_criacao
            JOIN dim_assunto a ON a.sk_assunto = f.sk_assunto
            JOIN dim_origem o ON o.sk_origem = f.sk_origem
            JOIN dim_status s ON s.sk_status = f.sk_status
            LEFT JOIN dim_data dp ON dp.sk_data = f.sk_data_prorrogacao
            LEFT JOIN dim_data dco ON dco.sk_data = f.sk_data_conclusao
            LEFT JOIN uploads_planilhas u ON u.id = f.upload_id
            {where_sql.replace("d.", "dc.")}
            ORDER BY dc.data_completa DESC, f.id_protocolo DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        list_params,
    )

    return {
        "items": [dict(row) for row in rows.mappings().all()],
        "page": page,
        "page_size": page_size,
        "total_filtrado": total_filtrado,
        "total_geral": total_geral,
        "total_pages": ceil(total_filtrado / page_size) if total_filtrado else 0,
    }


async def get_monthly_series(db: AsyncSession, **filters: Any) -> list[dict[str, Any]]:
    where_sql, params = _build_filters(**filters)
    result = await db.execute(
        text(
            f"""
            WITH monthly AS (
                SELECT
                    d.ano_mes,
                    SUM(f.qtd_manifestacoes)::int AS total,
                    SUM(CASE WHEN a.flag_dificuldade_call_center THEN f.qtd_manifestacoes ELSE 0 END)::int AS call_center,
                    SUM(CASE WHEN NOT a.flag_dificuldade_call_center THEN f.qtd_manifestacoes ELSE 0 END)::int AS demais_subassuntos
                FROM fato_manifestacoes f
                JOIN dim_data d ON d.sk_data = f.sk_data_criacao
                JOIN dim_assunto a ON a.sk_assunto = f.sk_assunto
                JOIN dim_origem o ON o.sk_origem = f.sk_origem
                {where_sql}
                GROUP BY d.ano_mes
            )
            SELECT
                ano_mes,
                total,
                call_center,
                demais_subassuntos,
                ROUND(((total - LAG(total) OVER (ORDER BY ano_mes))::numeric
                    / NULLIF(LAG(total) OVER (ORDER BY ano_mes), 0)) * 100, 2) AS variacao_mom
            FROM monthly
            ORDER BY ano_mes
            """
        ),
        params,
    )
    series = [dict(row) for row in result.mappings().all()]
    if not series:
        return []

    max_total = max(item["total"] for item in series)
    min_total = min(item["total"] for item in series)
    for item in series:
        item["is_pico"] = item["total"] == max_total
        item["is_queda"] = item["total"] == min_total
        item["variacao_mom"] = float(item["variacao_mom"]) if item["variacao_mom"] is not None else None
    return series


async def get_evolution(db: AsyncSession, **filters: Any) -> dict[str, Any]:
    series = await get_monthly_series(db, **filters)
    where_sql, params = _build_filters(**filters)
    typologies = await db.execute(
        text(
            f"""
            SELECT d.ano_mes, a.subassunto, SUM(f.qtd_manifestacoes)::int AS total
            FROM fato_manifestacoes f
            JOIN dim_data d ON d.sk_data = f.sk_data_criacao
            JOIN dim_assunto a ON a.sk_assunto = f.sk_assunto
            JOIN dim_origem o ON o.sk_origem = f.sk_origem
            {where_sql}
            GROUP BY d.ano_mes, a.subassunto
            ORDER BY d.ano_mes, total DESC
            """
        ),
        params,
    )
    return {"series": series, "tipologias": [dict(row) for row in typologies.mappings().all()]}


async def get_kpis(db: AsyncSession, **filters: Any) -> dict[str, Any]:
    series = await get_monthly_series(db, **filters)
    total = sum(item["total"] for item in series)
    total_months = len(series)
    pico = max(series, key=lambda item: item["total"], default=None)
    menor = min(series, key=lambda item: item["total"], default=None)
    last_mom = series[-1]["variacao_mom"] if series else None

    comparison = await get_call_center_comparison(db, **filters)
    call_center_item = next((item for item in comparison["itens"] if item["grupo"] == "Call Center Compesa"), None)

    return {
        "total_manifestacoes": total,
        "total_meses": total_months,
        "media_mensal": round(total / total_months, 2) if total_months else 0,
        "pico_mes": {"ano_mes": pico["ano_mes"], "total": pico["total"]} if pico else None,
        "menor_mes": {"ano_mes": menor["ano_mes"], "total": menor["total"]} if menor else None,
        "variacao_mom_ultimo_mes": last_mom,
        "total_call_center": call_center_item["total"] if call_center_item else 0,
        "participacao_call_center": call_center_item["percentual"] if call_center_item else 0,
    }


async def get_call_center_comparison(db: AsyncSession, **filters: Any) -> dict[str, Any]:
    where_sql, params = _build_filters(**filters)
    where_sql = f"{where_sql} AND a.flag_desconsiderar_regra_arpe = FALSE" if where_sql else "WHERE a.flag_desconsiderar_regra_arpe = FALSE"

    result = await db.execute(
        text(
            f"""
            SELECT
                CASE WHEN a.flag_dificuldade_call_center
                    THEN 'Call Center Compesa'
                    ELSE 'Demais subassuntos'
                END AS grupo,
                SUM(f.qtd_manifestacoes)::int AS total
            FROM fato_manifestacoes f
            JOIN dim_data d ON d.sk_data = f.sk_data_criacao
            JOIN dim_assunto a ON a.sk_assunto = f.sk_assunto
            JOIN dim_origem o ON o.sk_origem = f.sk_origem
            {where_sql}
            GROUP BY grupo
            ORDER BY grupo
            """
        ),
        params,
    )
    rows = [dict(row) for row in result.mappings().all()]
    total_considerado = sum(row["total"] for row in rows)
    for row in rows:
        row["percentual"] = round((row["total"] / total_considerado) * 100, 2) if total_considerado else 0
    return {"total_considerado": total_considerado, "itens": rows}

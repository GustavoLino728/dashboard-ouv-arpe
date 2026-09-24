from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.domain.ouvidoria import schemas, services

router = APIRouter(prefix="/api/v1", tags=["Ouvidoria"])


@router.get("/filters", response_model=schemas.DashboardFilters)
async def filters(db: AsyncSession = Depends(get_db)):
    return await services.get_filters(db)


@router.get("/uploads", response_model=list[schemas.UploadPlanilhaItem])
async def uploads(db: AsyncSession = Depends(get_db)):
    return await services.list_uploads(db)


@router.post("/uploads", response_model=schemas.UploadPlanilhaResponse, status_code=status.HTTP_201_CREATED)
async def upload_planilha(
    file: UploadFile = File(...),
    nome_planilha: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo sem nome.")
    if not file.filename.lower().endswith((".xlsx", ".xls", ".xlsm")):
        raise HTTPException(status_code=400, detail="Envie uma planilha Excel (.xlsx, .xls ou .xlsm).")
    try:
        contents = await file.read()
        return await services.upload_planilha(db, contents, file.filename, nome_planilha)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/uploads/{upload_id}", response_model=schemas.DeleteUploadResponse)
async def delete_upload(upload_id: int, db: AsyncSession = Depends(get_db)):
    try:
        return await services.delete_upload(db, upload_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/manifestacoes", response_model=schemas.ManifestacoesResponse)
async def manifestacoes(
    page: int = 1,
    page_size: int = 25,
    ano: int | None = None,
    ano_mes_inicio: str | None = None,
    ano_mes_fim: str | None = None,
    origem: str | None = None,
    assunto: str | None = None,
    subassunto: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await services.get_manifestacoes(
        db,
        page=page,
        page_size=page_size,
        ano=ano,
        ano_mes_inicio=ano_mes_inicio,
        ano_mes_fim=ano_mes_fim,
        origem=origem,
        assunto=assunto,
        subassunto=subassunto,
    )


@router.get("/dashboard/kpis", response_model=schemas.DashboardKpis)
async def kpis(
    ano: int | None = None,
    ano_mes_inicio: str | None = None,
    ano_mes_fim: str | None = None,
    origem: str | None = None,
    assunto: str | None = None,
    subassunto: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await services.get_kpis(db, ano=ano, ano_mes_inicio=ano_mes_inicio, ano_mes_fim=ano_mes_fim, origem=origem, assunto=assunto, subassunto=subassunto)


@router.get("/dashboard/evolution", response_model=schemas.EvolutionResponse)
async def evolution(
    ano: int | None = None,
    ano_mes_inicio: str | None = None,
    ano_mes_fim: str | None = None,
    origem: str | None = None,
    assunto: str | None = None,
    subassunto: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await services.get_evolution(db, ano=ano, ano_mes_inicio=ano_mes_inicio, ano_mes_fim=ano_mes_fim, origem=origem, assunto=assunto, subassunto=subassunto)


@router.get(
    "/dashboard/call-center-comparison",
    response_model=schemas.CallCenterComparisonResponse,
)
async def call_center_comparison(
    ano: int | None = None,
    ano_mes_inicio: str | None = None,
    ano_mes_fim: str | None = None,
    origem: str | None = None,
    assunto: str | None = None,
    subassunto: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await services.get_call_center_comparison(db, ano=ano, ano_mes_inicio=ano_mes_inicio, ano_mes_fim=ano_mes_fim, origem=origem, assunto=assunto, subassunto=subassunto)

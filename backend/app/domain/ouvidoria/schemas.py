from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FilterOption(BaseModel):
    value: str
    label: str


class DashboardFilters(BaseModel):
    anos: list[int]
    meses: list[FilterOption]
    origens: list[FilterOption]
    assuntos: list[FilterOption]
    subassuntos: list[FilterOption]


class PeakMonth(BaseModel):
    ano_mes: str
    total: int


class DashboardKpis(BaseModel):
    total_manifestacoes: int
    total_meses: int
    media_mensal: float
    pico_mes: PeakMonth | None
    menor_mes: PeakMonth | None
    variacao_mom_ultimo_mes: float | None
    total_call_center: int
    participacao_call_center: float


class EvolutionPoint(BaseModel):
    ano_mes: str
    total: int
    call_center: int
    demais_subassuntos: int
    variacao_mom: float | None
    is_pico: bool = False
    is_queda: bool = False


class TypologyPoint(BaseModel):
    ano_mes: str
    subassunto: str
    total: int


class EvolutionResponse(BaseModel):
    series: list[EvolutionPoint]
    tipologias: list[TypologyPoint]


class CallCenterComparisonItem(BaseModel):
    grupo: str
    total: int
    percentual: float


class CallCenterComparisonResponse(BaseModel):
    total_considerado: int
    itens: list[CallCenterComparisonItem]


class UploadPlanilhaItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome_planilha: str
    nome_arquivo_original: str
    worksheet: str
    competencia_ano_mes: str | None
    quantidade_registros: int
    status: str
    mensagem: str | None
    created_at: datetime


class UploadPlanilhaResponse(UploadPlanilhaItem):
    registros_processados: int


class DeleteUploadResponse(BaseModel):
    upload_id: int
    manifestacoes_removidas: int

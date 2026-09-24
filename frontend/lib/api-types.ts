export interface OuvidoriaFilterOption {
  value: string;
  label: string;
}

export interface OuvidoriaFilters {
  anos: number[];
  meses: OuvidoriaFilterOption[];
  origens: OuvidoriaFilterOption[];
  assuntos: OuvidoriaFilterOption[];
  subassuntos: OuvidoriaFilterOption[];
}

export interface OuvidoriaPeakMonth {
  ano_mes: string;
  total: number;
}

export interface OuvidoriaKpis {
  total_manifestacoes: number;
  total_meses: number;
  media_mensal: number;
  pico_mes: OuvidoriaPeakMonth | null;
  menor_mes: OuvidoriaPeakMonth | null;
  variacao_mom_ultimo_mes: number | null;
  total_call_center: number;
  participacao_call_center: number;
}

export interface OuvidoriaEvolutionPoint {
  ano_mes: string;
  total: number;
  call_center: number;
  demais_subassuntos: number;
  variacao_mom: number | null;
  is_pico: boolean;
  is_queda: boolean;
}

export interface OuvidoriaTypologyPoint {
  ano_mes: string;
  subassunto: string;
  total: number;
}

export interface OuvidoriaEvolution {
  series: OuvidoriaEvolutionPoint[];
  tipologias: OuvidoriaTypologyPoint[];
}

export interface OuvidoriaComparisonItem {
  grupo: string;
  total: number;
  percentual: number;
}

export interface OuvidoriaComparison {
  total_considerado: number;
  itens: OuvidoriaComparisonItem[];
}

export interface UploadPlanilhaItem {
  id: number;
  nome_planilha: string;
  nome_arquivo_original: string;
  worksheet: string;
  competencia_ano_mes: string | null;
  quantidade_registros: number;
  status: string;
  mensagem: string | null;
  created_at: string;
}

export interface UploadPlanilhaResponse extends UploadPlanilhaItem {
  registros_processados: number;
}

export interface DeleteUploadResponse {
  upload_id: number;
  manifestacoes_removidas: number;
}

export interface ManifestacaoItem {
  id_protocolo: string;
  data_criacao: string;
  data_prorrogacao: string | null;
  data_conclusao: string | null;
  ano_mes: string;
  assunto: string;
  subassunto: string;
  orgao_origem: string | null;
  origem_atendimento: string | null;
  modalidade_atendimento: string | null;
  tipo_atendimento: string | null;
  situacao: string | null;
  palavras_chave: string | null;
  setores: string | null;
  dias_para_conclusao: number | null;
  nome_planilha: string | null;
}

export interface ManifestacoesResponse {
  items: ManifestacaoItem[];
  page: number;
  page_size: number;
  total_filtrado: number;
  total_geral: number;
  total_pages: number;
}

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
  situacoes: OuvidoriaFilterOption[];
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
  rotulo_destaque: string;
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
  eh_destaque: boolean;
}

export interface OuvidoriaComparison {
  total_considerado: number;
  itens: OuvidoriaComparisonItem[];
  rotulo_destaque: string;
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

export interface ApiActivity {
  id: string;
  project_id: string;
  project_name?: string;
  description: string;
  sei_number: string | null;
  department: string[] | null;
  start_date: string | null;
  deadline: string | null;
  working_days: number | null;
  new_date: string | null;
  status: string;
  observations: string | null;
  group_item: string | null;
  contract: string | null;
  contract_url?: string | null;
  contract_links?: ActivityContractLink[];
  step_number: string | null;
  actual_start_date: string | null;
  delay_justification_problem?: string | null;
  delay_justification_action?: string | null;
  delay_justification_responsible?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiProject {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  activities: ApiActivity[];
}

export interface ApiProjectSimple {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiProjectSummary {
  projeto: string;
  data_referencia: string;
  total_atividades: number;
  concluidas: number;
  em_andamento: number;
  nao_iniciadas: number;
  percentual_conclusao: number;
  prazos_proximos_7_dias: number;
  prazos_criticos_2_dias: number;
  atrasadas: number;
}

export interface ApiSectorLoad {
  setor: string;
  total: number;
}

export interface ApiSectorStatus {
  setor: string;
  concluido: number;
  em_andamento: number;
  nao_iniciado: number;
}

export interface ApiCriticalActivity {
  id: string;
  descricao: string;
  setor: string;
  prazo_final: string | null;
  status: string;
  dias_para_prazo: number;
}

export interface ApiPhaseStatus {
  fase: string;
  concluido: number;
  em_andamento: number;
  nao_iniciado: number;
}

export interface ApiTimelineEvent {
  id: string;
  descricao: string;
  data_inicio: string | null;
  prazo_final: string | null;
  status: string;
  fase: string;
}

export type StatusType = "ok" | "warn" | "late" | "pending";

export interface Atividade {
  id: string;
  project_id: string;
  atividade: string;
  coordenadoria: string;
  responsavel: string;
  progresso: number;
  prazo: string;
  status: StatusType;
  projeto?: string;
  data_inicio?: string | null;
  data_fim?: string | null;
  contrato?: string;
  contrato_url?: string | null;
  contrato_links?: ActivityContractLink[];
  sei_number?: string | null;
  working_days?: number | null;
  deadline?: string | null;
  new_date?: string | null;
  raw_status?: string;
  observations?: string | null;
  group_item?: string | null;
  step_number?: string | null;
  actual_start_date?: string | null;
  delay_justification_problem?: string | null;
  delay_justification_action?: string | null;
  delay_justification_responsible?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ActivityContractLink {
  contract: string;
  url: string | null;
}

export interface ContractLink {
  id: string | null;
  project_id: string;
  project_name: string;
  contract: string;
  url: string | null;
  activities_count: number;
  updated_at: string | null;
}

export interface ContractLinkUpsert {
  project_id: string;
  contract: string;
  url: string;
}

export interface StatusDetail {
  label: string;
  corTailwind: string;
  corHex: string;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "servidor" | "coordenador" | "admin";
  department?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiUserCreate {
  name: string;
  email: string;
  password: string;
  role: "servidor" | "coordenador" | "admin";
  department?: string | null;
}

export interface ApiUserUpdate {
  name?: string;
  email?: string;
  role?: "servidor" | "coordenador" | "admin";
  department?: string | null;
  is_active?: boolean;
  password?: string;
}

export interface ApiCoordenadoria {
  id: string;
  name: string;
  emails: string[];
  created_at: string;
  updated_at: string;
}

export interface ApiCoordenadoriaCreate {
  name: string;
  emails: string[];
}

export interface ApiCoordenadoriaUpdate {
  name?: string;
  emails?: string[];
}

export interface ApiNotification {
  id: string;
  user_id: string;
  activity_id: string | null;
  title: string;
  content: string;
  is_read: boolean;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface ApiUnreadCount {
  count: number;
}

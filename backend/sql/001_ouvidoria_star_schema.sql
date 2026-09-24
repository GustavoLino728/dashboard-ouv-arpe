CREATE TABLE IF NOT EXISTS dim_data (
    sk_data INT PRIMARY KEY,
    data_completa DATE NOT NULL UNIQUE,
    ano INT NOT NULL,
    mes INT NOT NULL,
    nome_mes VARCHAR(20) NOT NULL,
    ano_mes VARCHAR(7) NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_assunto (
    sk_assunto SERIAL PRIMARY KEY,
    assunto VARCHAR(255) NOT NULL,
    subassunto VARCHAR(255) NOT NULL,
    flag_dificuldade_call_center BOOLEAN NOT NULL DEFAULT FALSE,
    flag_desconsiderar_regra_arpe BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_dim_assunto_assunto_subassunto UNIQUE (assunto, subassunto)
);

CREATE TABLE IF NOT EXISTS dim_origem (
    sk_origem SERIAL PRIMARY KEY,
    orgao_origem VARCHAR(255),
    origem_atendimento VARCHAR(100),
    CONSTRAINT uq_dim_origem UNIQUE (orgao_origem, origem_atendimento)
);

CREATE TABLE IF NOT EXISTS dim_status (
    sk_status SERIAL PRIMARY KEY,
    modalidade_atendimento VARCHAR(100),
    tipo_atendimento VARCHAR(100),
    situacao VARCHAR(100),
    CONSTRAINT uq_dim_status UNIQUE (modalidade_atendimento, tipo_atendimento, situacao)
);

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
);

CREATE TABLE IF NOT EXISTS fato_manifestacoes (
    id_protocolo VARCHAR(100) PRIMARY KEY,
    sk_data_criacao INT NOT NULL REFERENCES dim_data(sk_data),
    sk_data_prorrogacao INT REFERENCES dim_data(sk_data),
    sk_data_conclusao INT REFERENCES dim_data(sk_data),
    sk_assunto INT NOT NULL REFERENCES dim_assunto(sk_assunto),
    sk_origem INT NOT NULL REFERENCES dim_origem(sk_origem),
    sk_status INT NOT NULL REFERENCES dim_status(sk_status),
    upload_id INT REFERENCES uploads_planilhas(id),
    palavras_chave TEXT,
    setores VARCHAR(255),
    dias_para_conclusao INT,
    qtd_manifestacoes INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_dim_data_ano_mes ON dim_data (ano_mes);
CREATE INDEX IF NOT EXISTS idx_dim_data_ano_mes_mes ON dim_data (ano, mes);
CREATE INDEX IF NOT EXISTS idx_dim_assunto_call_center ON dim_assunto (flag_dificuldade_call_center);
CREATE INDEX IF NOT EXISTS idx_dim_assunto_desconsiderar ON dim_assunto (flag_desconsiderar_regra_arpe);
CREATE INDEX IF NOT EXISTS idx_dim_assunto_subassunto ON dim_assunto (subassunto);
CREATE INDEX IF NOT EXISTS idx_dim_origem_atendimento ON dim_origem (origem_atendimento);
CREATE INDEX IF NOT EXISTS idx_uploads_planilhas_competencia ON uploads_planilhas (competencia_ano_mes);
CREATE INDEX IF NOT EXISTS idx_fato_data_criacao ON fato_manifestacoes (sk_data_criacao);
CREATE INDEX IF NOT EXISTS idx_fato_assunto ON fato_manifestacoes (sk_assunto);
CREATE INDEX IF NOT EXISTS idx_fato_origem ON fato_manifestacoes (sk_origem);
CREATE INDEX IF NOT EXISTS idx_fato_status ON fato_manifestacoes (sk_status);
CREATE INDEX IF NOT EXISTS idx_fato_upload_id ON fato_manifestacoes (upload_id);
CREATE INDEX IF NOT EXISTS idx_fato_data_assunto ON fato_manifestacoes (sk_data_criacao, sk_assunto);

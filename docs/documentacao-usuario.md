---

### Documento 2 — `docs/usuario.md`

```markdown
# Painel da Ouvidoria ARPE — Guia de Uso

**Versão:** 1.0  
**Última atualização:** 2026-10-08  
**Responsável:** Gustavo Lino  
**Público:** Gestores, analistas e servidores da ARPE  

---

## 1. O que é este sistema?

O **Painel da Ouvidoria ARPE** é uma plataforma desenvolvida para centralizar, visualizar e analisar as manifestações e reclamações registradas na Ouvidoria da ARPE.

Com o painel, a equipe técnica e a gestão podem acompanhar o volume de demandas ao longo dos meses, identificar assuntos de maior relevância (como o acompanhamento detalhado do Call Center da Compesa) e consultar detalhes de cada atendimento individualmente em poucos cliques.

## 2. Para quem é este sistema?

- **Gestores e Diretores:** Para acompanhar indicadores gerais, volume mensal de atendimento e suporte à tomada de decisão.
- **Analistas e Servidores:** Para consultar dados históricos, aplicar filtros por origem ou assunto e acompanhar o status das manifestações.

## 3. Como Acessar

1. Abra o seu navegador web (Google Chrome, Microsoft Edge ou Firefox).
2. Acesse o endereço do sistema (https://dashboard-ouv-arpe.vercel.app/manifestacoes).
3. Insira o seu e-mail corporativo e a sua senha cadastrada.
4. Clique em **Entrar**.

> *Caso ainda não possua acesso ou tenha esquecido sua senha, solicite suporte ao administrador do sistema.*

## 4. Funcionalidades do Sistema

### 4.1 Painel de Indicadores (Dashboard)
Ao acessar a plataforma, você será apresentado ao Painel Principal:
- **Resumo Geral:** Cartões contendo o volume total de manifestações, média mensal de atendimentos, mês com maior volume (pico) e mês com menor volume.
- **Evolução Temporal:** Gráficos intuitivos que mostram se o volume de reclamações está subindo ou descendo ao longo dos meses.
- **Destaque Call Center:** Bloco de acompanhamento específico para comparar demandas direcionadas ao Call Center com os demais assuntos.

### 4.2 Interatividade nos Cartões de KPI
Todos os cartões de indicadores no painel são clicáveis. Ao clicar em um cartão (como por exemplo no *Mês de Pico*), você será redirecionado para a tela de **Manifestações** com o filtro referente àquele mês aplicado automaticamente.

### 4.3 Consulta e Filtros de Manifestações
Na aba **Manifestações**, você pode realizar pesquisas detalhadas:
1. **Filtros do Topo:** Escolha o Ano, Período (Mês inicial e final), Origem da demanda, Assunto ou Subassunto.
2. **Navegação:** A tabela exibe número de protocolo, data de abertura, assunto, situação atual e setor responsável.
3. **Paginação:** Use os botões no rodapé da tabela para avançar páginas ou alterar a quantidade de registros exibidos por página.

### 4.4 Carregamento de Planilhas (Apenas Administradores)
Para atualizar a base de dados do sistema com novos registros:
1. Clique no menu **Planilhas**.
2. Clique no botão **Enviar Planilha**.
3. Selecione o arquivo Excel (`.xlsx`, `.xls` ou `.xlsm`) em seu computador.
4. Digite um nome de identificação para a planilha e confirme o envio.
5. O sistema processará o arquivo e atualizará os indicadores do painel automaticamente.

### 4.5 Gerenciamento de Usuários (Apenas Administradores)
Na aba **Usuários**, o administrador pode:
- Cadastrar novos servidores e analistas.
- Alterar o nome ou perfil de acesso de um usuário existente.
- Ativar ou desativar acessos ao sistema.

## 5. Perfis de Acesso

| Perfil | O que pode fazer no sistema |
|---|---|
| **Administrador** | Acesso total: visualiza painéis, consulta manifestações, realiza upload de planilhas e gerencia usuários. |
| **Servidor** | Visualização e consulta: acessa os dashboards, aplica filtros e navega pela lista completa de manifestações. |

## 6. Perguntas Frequentes (FAQ)

**1. Onde consigo ver a data da última atualização dos dados?**  
Na aba *Planilhas*, é possível visualizar a lista de todos os arquivos que foram carregados e a data/hora em que o processamento foi concluído.

**2. Por que a aba "Planilhas" ou "Usuários" não aparece para mim?**  
Estas abas são restritas a usuários com o perfil de **Administrador**. Se você precisa recarregar dados ou cadastrar um colega, procure o responsável pela administração do sistema.

**3. Posso aplicar mais de um filtro ao mesmo tempo?**  
Sim. Você pode selecionar simultaneamente o Ano, o Órgão de Origem e o Assunto desejado para refinar os gráficos e a lista de registros.

## 7. Suporte ao Usuário

Caso identifique inconsistências nos dados ou precise de auxílio técnico:
- **Setor Responsável:** Ouvidoria / Núcleo de Tecnologia da ARPE  
- **E-mail de Suporte:** `suporte.ti@arpe.pe.gov.br` *(exemplo)*

```

---

### Estrutura dos Arquivos no Repositório

Para manter o repositório organizado, você pode criar a pasta `docs/` na raiz do seu projeto e salvar os arquivos conforme a estrutura abaixo:

```text
dashboard-ouv-arpe/
├── backend/
├── frontend/
├── docker-compose.yml
└── docs/
    ├── tecnica.md
    └── usuario.md

```
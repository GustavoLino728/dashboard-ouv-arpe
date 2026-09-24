# Dashboard Ouvidoria ARPE

Aplicacao web para analise de manifestacoes da Ouvidoria da ARPE extraidas do OUVE PE, com foco no subassunto "Dificuldade de Atendimento pelo Call Center da Compesa".

## Stack

- Backend: FastAPI, SQLAlchemy async, Alembic e PostgreSQL/Supabase.
- ETL: Python com Pandas/OpenPyXL para ingestao de planilhas Excel.
- Frontend: Next.js, React, TypeScript, Tailwind CSS e Recharts.

## Estrutura Principal

- `backend/app/domain/ouvidoria`: modelos, schemas, services e rotas REST do dashboard.
- `backend/sql/001_ouvidoria_star_schema.sql`: DDL completa para PostgreSQL/Supabase.
- `backend/scripts/etl_ouvidoria.py`: carga idempotente das planilhas OUVE PE.
- `frontend/components/ouvidoria/OuvidoriaDashboard.tsx`: tela analitica principal.

## Rodando Com Docker

Configure `backend/.env` a partir de `backend/.env.example` e execute:

```bash
docker-compose up -d --build
```

Servicos:

| Servico | URL |
| --- | --- |
| Frontend | http://localhost:3001 |
| Backend/API | http://localhost:8001 |
| Swagger | http://localhost:8001/docs |
| PostgreSQL local | localhost:5434 |

## Banco De Dados

Aplicar migration:

```bash
docker-compose exec api alembic upgrade head
```

Ou executar diretamente o SQL em `backend/sql/001_ouvidoria_star_schema.sql` no Supabase.

## Carga Das Planilhas

Com `DATABASE_URL` configurado:

```bash
python backend/scripts/etl_ouvidoria.py --input-dir ./dados/ouve-pe
```

O ETL faz upsert por `id_protocolo`, popula as dimensoes e aplica as flags de negocio para o comparativo do Call Center.

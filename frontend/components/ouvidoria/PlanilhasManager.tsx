"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Trash2, Upload } from "lucide-react";
import {
  deleteUpload,
  fetchUploads,
  UploadPlanilhaItem,
  uploadPlanilha,
} from "@/lib/api";

const numberFmt = new Intl.NumberFormat("pt-BR");

function suggestUploadName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function PlanilhasManager() {
  const [uploads, setUploads] = useState<UploadPlanilhaItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadUploads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUploads(await fetchUploads());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar uploads.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUploads();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadUploads]);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    setMessage(null);
    setUploadName(file ? suggestUploadName(file.name) : "");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage("Selecione uma planilha antes de enviar.");
      return;
    }

    setUploading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await uploadPlanilha(selectedFile, uploadName);
      setMessage(`${numberFmt.format(result.registros_processados)} registros carregados.`);
      setSelectedFile(null);
      setUploadName("");
      await loadUploads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar planilha.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteUpload = async (uploadId: number) => {
    setMessage(null);
    setError(null);
    try {
      const result = await deleteUpload(uploadId);
      setMessage(`${numberFmt.format(result.manifestacoes_removidas)} registros removidos.`);
      await loadUploads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover upload.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="text-[22px] font-semibold text-ink">Planilhas</h1>
          <p className="text-[13px] text-ink-soft mt-1">
            Cargas mensais do OUVE PE e controle de remoção por arquivo enviado
          </p>
        </div>
        <button
          onClick={loadUploads}
          className="flex items-center gap-2 text-[13px] font-semibold text-white bg-teal rounded-lg py-2 px-4 hover:bg-teal/90"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </section>

      <section className="bg-panel border border-line/30 rounded-custom p-5">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-4 h-4 text-teal" />
          <h2 className="text-[14px] font-semibold text-ink">Carga mensal de planilha</h2>
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 max-lg:grid-cols-1">
          <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
            Arquivo
            <input
              type="file"
              accept=".xlsx,.xls,.xlsm"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink-soft">
            Nome da planilha
            <input
              value={uploadName}
              onChange={(event) => setUploadName(event.target.value)}
              placeholder="Relatorio de Atendimento Agosto"
              className="text-[13px] rounded-lg border border-line bg-panel text-ink px-3 py-2"
            />
          </label>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="self-end flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-teal rounded-lg py-2 px-4 hover:bg-teal/90 disabled:opacity-60"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Enviando" : "Enviar"}
          </button>
        </div>
        {message ? <p className="mt-3 text-[12px] text-ink-soft">{message}</p> : null}
        {error ? (
          <p className="mt-3 flex items-center gap-2 text-[12px] text-red-600">
            <AlertTriangle className="w-4 h-4" /> {error}
          </p>
        ) : null}
      </section>

      <section className="bg-panel border border-line/30 rounded-custom p-5">
        <h2 className="text-[14px] font-semibold text-ink mb-4">Uploads registrados</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-[66px] rounded-lg border border-line/30 animate-pulse" />
            ))}
          </div>
        ) : uploads.length === 0 ? (
          <p className="text-[13px] text-ink-soft">Nenhuma planilha carregada.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
            {uploads.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-line/40 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{item.nome_planilha}</p>
                  <p className="text-[11px] text-ink-soft">
                    {item.competencia_ano_mes ?? "sem competencia"} - {numberFmt.format(item.quantidade_registros)} registros
                  </p>
                  <p className="truncate text-[11px] text-ink-soft">{item.nome_arquivo_original}</p>
                </div>
                <button
                  onClick={() => void handleDeleteUpload(item.id)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line/50 text-red-600 hover:bg-red-50"
                  title="Remover upload"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

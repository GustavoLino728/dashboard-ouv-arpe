"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  ApiUser,
  ApiUserCreate,
  ApiUserUpdate,
  ApiError,
  fetchCoordenadorias,
  ApiCoordenadoria,
} from "@/lib/api";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Lock,
  ShieldAlert,
  XCircle,
  X,
  Loader2,
  Check,
  UserCheck,
  UserX,
  Search,
} from "lucide-react";

export default function UsuariosPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"servidor" | "coordenador" | "admin">("servidor");
  const [department, setDepartment] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [coordenadorias, setCoordenadorias] = useState<ApiCoordenadoria[]>([]);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Load users from API
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error("[Usuarios] Erro ao carregar usuários da API", err);
      const msg = err instanceof ApiError ? err.message : "Erro ao conectar com o servidor para carregar usuários.";
      setFeedback({ type: "error", message: msg });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCoordenadorias = useCallback(async () => {
    try {
      const data = await fetchCoordenadorias();
      setCoordenadorias(data);
    } catch (err) {
      console.error("[Usuarios] Erro ao carregar responsáveis", err);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      loadUsers();
      loadCoordenadorias();
    }
  }, [user, loadUsers, loadCoordenadorias]);

  // Open modal for creating a new user
  const handleOpenCreate = () => {
    setModalMode("create");
    setSelectedUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("servidor");
    setDepartment("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  // Open modal for editing an existing user
  const handleOpenEdit = (targetUser: ApiUser) => {
    setModalMode("edit");
    setSelectedUser(targetUser);
    setName(targetUser.name);
    setEmail(targetUser.email);
    setPassword(""); // Keep password blank unless changing it
    setRole(targetUser.role);
    setDepartment(targetUser.department || "");
    setIsActive(targetUser.is_active);
    setIsModalOpen(true);
  };

  // Submit User form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      if (modalMode === "create") {
        const payload: ApiUserCreate = { name, email, password, role, department: department || null };
        await createUser(payload);
        setFeedback({ type: "success", message: "Usuário criado com sucesso!" });
      } else {
        if (!selectedUser) return;
        const payload: ApiUserUpdate = { name, role, is_active: isActive, department: department || null };
        if (password) {
          payload.password = password;
        }
        await updateUser(selectedUser.id, payload);
        setFeedback({ type: "success", message: "Usuário atualizado com sucesso!" });
      }
      setIsModalOpen(false);
      await loadUsers();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erro ao salvar alterações do usuário.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete User
  const handleDelete = async (targetUser: ApiUser) => {
    if (!confirm(`Deseja realmente remover o usuário ${targetUser.name}?`)) {
      return;
    }
    
    setFeedback(null);
    try {
      await deleteUser(targetUser.id);
      setFeedback({ type: "success", message: "Usuário removido com sucesso!" });
      await loadUsers();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erro ao remover usuário.";
      setFeedback({ type: "error", message: msg });
    }
  };

  // Filtered users by search string
  const filteredUsers = users.filter((u) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower) ||
      u.role.toLowerCase().includes(searchLower) ||
      (u.department || "").toLowerCase().includes(searchLower)
    );
  });

  // Access check
  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 max-w-lg mx-auto text-center gap-4 animate-[fadeIn_0.2s_ease-out]">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-2">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="font-display font-bold text-[20px] text-ink leading-tight">
          Acesso Restrito
        </h2>
        <p className="text-[13px] text-ink-soft leading-normal">
          Você não possui privilégios de administrador para acessar as configurações de controle de usuários.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1100px] animate-[fadeIn_0.2s_ease-out]">
      {/* Top Header Section */}
      <div className="flex justify-between items-center flex-wrap gap-4 select-none">
        <div>
          <h2 className="font-display font-bold text-[18px] text-ink flex items-center gap-2.5">
            <Users className="w-5 h-5 text-teal" />
            Gestão de Usuários
          </h2>
          <p className="text-[12.5px] text-ink-soft mt-0.5">
            Controle de contas, atribuições de cargos e permissões de acesso.
          </p>
        </div>
        
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 font-sans text-[13px] font-semibold text-white bg-teal rounded-lg py-2 px-4 cursor-pointer hover:bg-teal/90 active:scale-[0.98] transition-all duration-150 shadow-sm"
        >
          <UserPlus className="w-4 h-4" /> Novo usuário
        </button>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div
          className={`flex items-center gap-3 border rounded-lg p-3.5 text-[12.5px] leading-normal animate-[fadeIn_0.15s_ease-out] ${
            feedback.type === "success"
              ? "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
          }`}
        >
          {feedback.type === "success" ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-ink-soft hover:text-ink cursor-pointer bg-transparent border-none"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Toolbar - Search */}
      <div className="bg-panel border border-line/30 rounded-custom p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar usuários por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="font-sans text-[12.5px] py-2 pl-9 pr-4 rounded-lg border border-line bg-panel text-ink outline-none focus:border-teal transition-colors w-full"
          />
        </div>
        <div className="text-[12px] text-ink-soft select-none">
          Total: <strong>{filteredUsers.length}</strong> {filteredUsers.length === 1 ? "usuário" : "usuários"}
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-panel border border-line/30 rounded-custom overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-ink-soft select-none">
            <Loader2 className="w-7 h-7 text-teal animate-spin" />
            <span className="text-[13px] font-medium">Carregando usuários...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 text-ink-soft select-none flex flex-col items-center gap-1.5">
            <Users className="w-9 h-9 text-line mb-1.5" />
            <span className="text-[13.5px] font-semibold text-ink">Nenhum usuário encontrado</span>
            <span className="text-[12px]">Tente redefinir o filtro de pesquisa.</span>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line bg-panel-soft/50 text-ink-soft font-semibold select-none">
                  <th className="py-3 px-5 font-semibold">Nome</th>
                  <th className="py-3 px-5 font-semibold">E-mail</th>
                  <th className="py-3 px-5 font-semibold">Responsável</th>
                  <th className="py-3 px-5 font-semibold">Cargo / Papel</th>
                  <th className="py-3 px-5 font-semibold">Status</th>
                  <th className="py-3 px-5 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {filteredUsers.map((u) => {
                  const roleLabel =
                    u.role === "admin"
                      ? "Administrador"
                      : u.role === "coordenador"
                        ? "Coordenador"
                        : "Servidor";

                  const roleColor =
                    u.role === "admin"
                      ? "text-teal bg-teal/10"
                      : u.role === "coordenador"
                        ? "text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-500/15"
                        : "text-ink-soft bg-line/60";

                  return (
                    <tr key={u.id} className="hover:bg-line/10 transition-colors">
                      <td className="py-3.5 px-5 font-medium text-ink">
                        {u.name}
                      </td>
                      <td className="py-3.5 px-5 text-ink-soft">{u.email}</td>
                      <td className="py-3.5 px-5 text-ink-soft">{u.department || "—"}</td>
                      <td className="py-3.5 px-5 select-none">
                        <span className={`inline-block text-[11px] font-semibold rounded-md px-2 py-0.5 uppercase tracking-wide ${roleColor}`}>
                          {roleLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 select-none">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-teal font-medium">
                            <UserCheck className="w-3.5 h-3.5" /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-rose-500 font-medium">
                            <UserX className="w-3.5 h-3.5" /> Inativo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right select-none">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded hover:bg-line text-ink-soft hover:text-ink cursor-pointer transition-colors"
                            title="Editar usuário"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1.5 rounded hover:bg-rose-500/10 text-ink-soft hover:text-rose-500 cursor-pointer transition-colors"
                            title="Excluir usuário"
                            disabled={user?.id === u.id} // Don't let active user delete themselves
                            style={{ opacity: user?.id === u.id ? 0.35 : 1, cursor: user?.id === u.id ? "not-allowed" : "pointer" }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creation/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease-out]">
          {/* Backdrop */}
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-[#000]/40 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Content */}
          <div className="relative bg-panel border border-line rounded-custom max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 overflow-hidden z-10">
            {/* Header */}
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-[16px] text-ink">
                {modalMode === "create" ? "Criar Novo Usuário" : "Editar Usuário"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-ink-soft hover:text-ink cursor-pointer p-1 rounded hover:bg-line/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Nome */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans font-semibold text-[12.5px] text-ink">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="font-sans text-[13px] py-2 px-3 rounded-lg border border-line bg-panel text-ink outline-none focus:border-teal transition-colors w-full"
                />
              </div>

              {/* Email (Disabled in edit mode) */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans font-semibold text-[12.5px] text-ink">
                  E-mail institucional
                </label>
                <input
                  type="email"
                  required
                  disabled={modalMode === "edit"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: joao.silva@arpe.pe.gov.br"
                  className="font-sans text-[13px] py-2 px-3 rounded-lg border border-line bg-panel text-ink outline-none focus:border-teal transition-colors w-full disabled:bg-line/10 disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>

              {/* Cargo / Papel */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans font-semibold text-[12.5px] text-ink">
                  Papel de Acesso
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="font-sans text-[13px] py-2 px-3 rounded-lg border border-line bg-panel text-ink outline-none cursor-pointer focus:border-teal transition-colors w-full"
                >
                  <option value="servidor">Servidor (Acesso de leitura)</option>
                  <option value="coordenador">Coordenador (Acesso setorial)</option>
                  <option value="admin">Administrador (Controle total)</option>
                </select>
              </div>

              {/* Responsável / Setor */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans font-semibold text-[12.5px] text-ink">
                  Responsável / Setor
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="font-sans text-[13px] py-2 px-3 rounded-lg border border-line bg-panel text-ink outline-none cursor-pointer focus:border-teal transition-colors w-full"
                >
                  <option value="">Nenhum / Sem responsável</option>
                  {coordenadorias.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Senha (Required in create, optional in edit for reset) */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans font-semibold text-[12.5px] text-ink flex items-center justify-between">
                  <span>{modalMode === "create" ? "Senha de acesso" : "Redefinir senha"}</span>
                  {modalMode === "edit" && (
                    <span className="text-[10px] text-ink-soft normal-case font-normal">
                      (Deixe em branco para manter a atual)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required={modalMode === "create"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={modalMode === "create" ? "Mínimo de 6 caracteres" : "Nova senha se desejar alterar"}
                    className="font-sans text-[13px] py-2 pl-9 pr-3 rounded-lg border border-line bg-panel text-ink outline-none focus:border-teal transition-colors w-full"
                    minLength={4}
                  />
                </div>
              </div>

              {/* Ativo Checkbox (only shown in edit) */}
              {modalMode === "edit" && (
                <div className="border-t border-line/40 pt-3 mt-1">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-line text-teal bg-panel focus:ring-teal outline-none cursor-pointer accent-teal"
                    />
                    <div className="flex flex-col">
                      <span className="font-sans text-[12.5px] font-semibold text-ink">
                        Conta Ativada
                      </span>
                      <span className="text-[11px] text-ink-soft">
                        Se desativado, o usuário não conseguirá efetuar login no sistema.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* Buttons */}
              <div className="border-t border-line/50 pt-4 mt-2 flex justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="font-sans text-[12.5px] font-semibold text-ink-soft hover:text-ink rounded-lg py-2 px-4 bg-transparent cursor-pointer border-none transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 font-sans text-[12.5px] font-semibold text-white bg-teal rounded-lg py-2 px-4 cursor-pointer hover:bg-teal/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {modalMode === "create" ? "Criar Conta" : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

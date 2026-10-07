"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { AuthError } from "@/lib/auth";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect se já autenticado
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      router.replace("/");
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError("Erro inesperado. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = email.includes("@") && password.length >= 4;

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-teal animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-10 relative">
      {/* Toggle de tema — canto superior direito */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-ink cursor-pointer bg-transparent border-none transition-colors duration-150"
        title={theme === "dark" ? "Modo claro" : "Modo escuro"}
      >
        {theme === "dark" ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {theme === "dark" ? "Claro" : "Escuro"}
        </span>
      </button>

      {/* Logo ARPE — centralizado acima do card */}
      <div className="flex items-center mb-8 select-none">
        <img
          src="/logo-arpe-positivo.png"
          alt="ARPE Painel"
          className="h-[50px] w-auto object-contain dark:hidden"
        />
        <img
          src="/logo-arpe-negativo.png"
          alt="ARPE Painel"
          className="h-[50px] w-auto object-contain hidden dark:block"
        />
      </div>

      {/* Card do formulário */}
      <div className="w-full max-w-[400px] bg-panel border border-line/30 rounded-custom p-8 sm:p-10 transition-all duration-200">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-display font-bold text-[22px] text-ink leading-tight">
            Bem-vindo de volta
          </h1>
          <p className="text-[13px] text-ink-soft mt-1.5">
            Entre com suas credenciais para acessar o painel
          </p>
        </div>

        {/* Alerta de erro */}
        {error && (
          <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/30 rounded-xl p-3.5 mb-6 animate-[fadeIn_0.2s_ease]">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 mt-0.5 shrink-0" />
            <p className="text-[13px] text-rose-700 dark:text-rose-400 leading-snug">
              {error}
            </p>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Campo: E-mail */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-email"
              className="text-[12.5px] font-semibold text-ink select-none"
            >
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-ink-soft/60 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="nome@arpe.pe.gov.br"
                className={`
                  w-full bg-panel border rounded-custom py-3 pl-10 pr-4
                  text-[14px] text-ink placeholder:text-ink-soft/40
                  outline-none transition-all duration-150
                  focus:border-teal focus:ring-1 focus:ring-teal/20
                  ${error ? "border-rose-400 dark:border-rose-500" : "border-line"}
                `}
              />
            </div>
          </div>

          {/* Campo: Senha */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-password"
              className="text-[12.5px] font-semibold text-ink select-none"
            >
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-ink-soft/60 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                minLength={4}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="••••••••"
                className={`
                  w-full bg-panel border rounded-custom py-3 pl-10 pr-11
                  text-[14px] text-ink placeholder:text-ink-soft/40
                  outline-none transition-all duration-150
                  focus:border-teal focus:ring-1 focus:ring-teal/20
                  ${error ? "border-rose-400 dark:border-rose-500" : "border-line"}
                `}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft/50 hover:text-ink-soft cursor-pointer bg-transparent border-none p-0.5 transition-colors duration-150"
                tabIndex={-1}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="w-[16px] h-[16px]" />
                ) : (
                  <Eye className="w-[16px] h-[16px]" />
                )}
              </button>
            </div>

            {/* Esqueceu a senha */}
            <div className="flex justify-end mt-0.5">
              <span
                className="text-[12px] text-teal opacity-50 cursor-default select-none"
                title="Funcionalidade em desenvolvimento"
              >
                Esqueceu a senha?
              </span>
            </div>
          </div>

          {/* Botão de submit */}
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className={`
              w-full flex items-center justify-center gap-2
              font-sans text-[14px] font-semibold text-white
              bg-teal rounded-custom py-3.5
              transition-all duration-150 shadow-sm
              ${
                isSubmitting || !isFormValid
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-teal/90 active:scale-[0.98] cursor-pointer"
              }
            `}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-ink-soft/50 mt-8 select-none">
        © 2026 ARPE — Agência de Regulação de Pernambuco
      </p>
    </div>
  );
}

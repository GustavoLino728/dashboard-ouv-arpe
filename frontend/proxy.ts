import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rotas que podem ser acessadas SEM autenticação
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Verifica se a rota atual é pública
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // 2. Verifica se existe o token de acesso no localStorage (via cookie espelho ou header)
  //    Como o token está no localStorage, o proxy não consegue lê-lo diretamente.
  //    A solução robusta é usar um cookie espelho (ex: "arpe-access-token") 
  //    definido no login e removido no logout.
  const hasAccessToken = request.cookies.has("arpe-access-token");

  // 3. Se NÃO for rota pública E NÃO tiver token -> redireciona para /login
  if (!isPublicRoute && !hasAccessToken) {
    const loginUrl = new URL("/login", request.url);
    // (Opcional) Guarda a URL de destino para redirecionar após o login
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Se já estiver logado e tentar acessar /login, redireciona para a home
  if (isPublicRoute && hasAccessToken && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 5. Permite a requisição prosseguir
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$).*)",
  ],
};
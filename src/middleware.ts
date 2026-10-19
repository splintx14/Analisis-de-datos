import { NextResponse, type NextRequest } from "next/server";

// Filtro rápido: sin cookie de sesión no se entra a la aplicación.
// La validación real de la sesión y de los permisos se hace en el servidor.
export function middleware(req: NextRequest) {
  if (!req.cookies.has("di_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/resumen/:path*",
    "/registros/:path*",
    "/importaciones/:path*",
    "/usuarios/:path*",
    "/perfil/:path*",
    "/configuracion/:path*",
  ],
};

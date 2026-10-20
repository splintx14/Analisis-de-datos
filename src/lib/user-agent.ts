// Describe un navegador de forma sencilla: "Chrome en Windows".
export function describeDevice(ua: string | null): string {
  if (!ua) return "Dispositivo desconocido";

  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\/|CriOS\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : null;

  const os = /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : null;

  if (browser && os) return `${browser} en ${os}`;
  return browser ?? os ?? "Dispositivo desconocido";
}

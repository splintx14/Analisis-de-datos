"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Brand from "./Brand";
import type { IconName, NavGroup } from "@/lib/permissions";

const ICONS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  table: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 4v16" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.6 3.2 2.3 3.5 5.2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.7-4 3.7-6 8-6s7.3 2 8 6" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
};

interface Props {
  groups: NavGroup[];
  workspaceName: string;
  userName: string;
  roleLabel: string;
}

export default function Sidebar({ groups, workspaceName, userName, roleLabel }: Props) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Brand />

      <nav className="nav" aria-label="Navegación principal">
        {groups.map((g) => (
          <div key={g.label} className="nav-group">
            <p className="nav-group-label">{g.label}</p>
            {g.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-link"
                  aria-current={active ? "page" : undefined}
                >
                  <svg
                    className="nav-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {ICONS[item.icon]}
                  </svg>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <p className="foot-kicker">Espacio de trabajo</p>
        <p className="foot-name">{workspaceName}</p>
        <p className="foot-meta">{userName} · {roleLabel}</p>
      </div>
    </aside>
  );
}

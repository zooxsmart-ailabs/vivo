// AppLayout.tsx — Layout principal com navegação por abas
// Design: Premium Dark Header — Geo-Intelligence × Vivo
// Filosofia: Header escuro com gradiente Vivo, nome da plataforma em destaque,
//            tabs com indicador luminoso, transições suaves.

import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Map, BarChart3, Building2 } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

// ─── Logo Vivo ─────────────────────────────────────────────────────────────────
function VivoLogo({ className }: { className?: string }) {
  return (
    <img
      src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663031821263/FMooUMezwbYNuWlt.png"
      alt="Vivo"
      className={className}
      style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
    />
  );
}

// ─── Wordmark Geo-Intelligence — versão refinada ───────────────────────────────
function GeoIntelligenceMark() {
  return (
    <div className="flex items-center gap-3">
      {/* Ícone hexagonal com símbolo de mapa/pin */}
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hex-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
        </defs>
        {/* Hexágono */}
        <path
          d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
          fill="url(#hex-grad)"
          fillOpacity="0.15"
          stroke="url(#hex-grad)"
          strokeWidth="1.2"
        />
        {/* Pin de localização estilizado */}
        <circle cx="16" cy="13" r="3.5" stroke="url(#hex-grad)" strokeWidth="1.5" fill="none" />
        <path d="M16 16.5C16 16.5 11 21 11 24" stroke="url(#hex-grad)" strokeWidth="1.2" strokeLinecap="round" opacity="0" />
        <path d="M16 16.5V22" stroke="url(#hex-grad)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="16" cy="13" r="1.2" fill="url(#hex-grad)" />
      </svg>

      {/* Texto */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-0">
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            Geo
          </span>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "16px",
              fontWeight: 300,
              letterSpacing: "-0.01em",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            Intelligence
          </span>
        </div>
        <span
          style={{
            fontSize: "8px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(192,132,252,0.6)",
            marginTop: "1px",
          }}
        >
          by Zoox Smart Data
        </span>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();

  const tabs = [
    { path: "/",        label: "Mapa Estratégico",     icon: <Map className="w-3.5 h-3.5" /> },
    { path: "/frentes", label: "Estratégias Growth", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { path: "/bairros", label: "Visão por Bairro",     icon: <Building2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Header premium escuro ── */}
      <header
        className="shrink-0 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F0A1E 0%, #1A0533 40%, #2D0A5C 70%, #1A0533 100%)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        {/* Ruído de textura sutil */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Brilho decorativo no topo */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px opacity-30"
          style={{ background: "linear-gradient(90deg, transparent, #C084FC, #818CF8, transparent)" }}
        />

        {/* Linha superior: nome da plataforma + badge + Vivo */}
        <div className="relative flex items-center justify-between px-6 pt-3 pb-2">
          {/* Esquerda: GeoIntelligence wordmark */}
          <GeoIntelligenceMark />

          {/* Direita: badge Live Data + Vivo logo */}
          <div className="flex items-center gap-4">
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase"
              style={{
                background: "rgba(192,132,252,0.12)",
                border: "1px solid rgba(192,132,252,0.2)",
                color: "#C084FC",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live Data
            </div>
            <VivoLogo className="h-8 w-auto" />
          </div>
        </div>

        {/* Navegação por abas */}
        <div className="relative flex gap-0 px-4">
          {tabs.map(tab => {
            const isActive = location === tab.path;
            return (
              <Link key={tab.path} href={tab.path}>
                <button
                  className="relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all duration-200"
                  style={{
                    color: isActive ? "#fff" : "rgba(255,255,255,0.38)",
                  }}
                >
                  <span style={{ color: isActive ? "#C084FC" : "rgba(255,255,255,0.3)" }}>
                    {tab.icon}
                  </span>

                  {tab.label}

                  {/* Indicador ativo — barra luminosa na base */}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                      style={{
                        background: "linear-gradient(90deg, #818CF8, #C084FC)",
                        boxShadow: "0 0 8px rgba(192,132,252,0.8)",
                      }}
                    />
                  )}

                  {/* Hover glow */}
                  {!isActive && (
                    <span className="absolute inset-0 rounded-t-lg opacity-0 hover:opacity-100 transition-opacity duration-200"
                      style={{ background: "rgba(255,255,255,0.04)" }} />
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      </header>

      {/* ── Page content ── */}
      <div className="flex-1 overflow-hidden min-h-0">
        {children}
      </div>
    </div>
  );
}

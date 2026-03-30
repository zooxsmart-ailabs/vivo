// Home.tsx — Mapa Estratégico com toggle Fibra / Móvel
// Design: Clean Analytics — Zoox × Vivo
// Header global gerenciado pelo AppLayout

import { MapView } from "@/components/Map";
import GeohashCard from "@/components/GeohashCard";
import {
  GEOHASH_DATA, QUADRANT_COLORS, QUADRANT_LABELS, QUADRANT_ORDER,
  GeohashData, Quadrant, TechCategory, geohashToPolygon,
} from "@/lib/geohashData";
import { useCallback, useRef, useState } from "react";
import { SlidersHorizontal, Info, ChevronRight, Wifi, Signal } from "lucide-react";

// Cores por tecnologia (usadas nos polígonos quando o filtro de tech está ativo)
const TECH_COLORS: Record<TechCategory, { hex: string; label: string }> = {
  FIBRA: { hex: "#0EA5E9", label: "Fibra" },
  MOVEL: { hex: "#F97316", label: "Móvel" },
  AMBOS: { hex: "#8B5CF6", label: "Ambos" },
};

export default function Home() {
  const [hoveredGeohash, setHoveredGeohash] = useState<GeohashData | null>(null);
  const [pinnedGeohash, setPinnedGeohash] = useState<GeohashData | null>(null);
  const pinnedGeohashRef = useRef<GeohashData | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<Quadrant>>(new Set(QUADRANT_ORDER));
  const [techFilter, setTechFilter] = useState<TechCategory | "TODOS">("TODOS");
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const polygonsRef = useRef<Map<string, google.maps.Polygon>>(new Map());
  // Guardamos o estado atual de techFilter e activeFilters em refs para uso nos listeners
  const techFilterRef = useRef<TechCategory | "TODOS">("TODOS");
  const activeFiltersRef = useRef<Set<Quadrant>>(new Set(QUADRANT_ORDER));

  // Ficha exibida = pinned (se houver) ou hovered
  const displayedGeohash = pinnedGeohash ?? hoveredGeohash;

  const isVisible = (gh: GeohashData, filters: Set<Quadrant>, tech: TechCategory | "TODOS") => {
    if (!filters.has(gh.quadrant)) return false;
    if (tech !== "TODOS" && gh.technology !== tech && gh.technology !== "AMBOS") return false;
    return true;
  };

  // Polígonos sempre usam a cor do quadrante estratégico.
  // O filtro de tecnologia apenas mostra/oculta — não muda a cor.
  const getPolygonColor = (gh: GeohashData) => {
    return QUADRANT_COLORS[gh.quadrant].hex;
  };

  const toggleFilter = (q: Quadrant) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q); else next.add(q);
      activeFiltersRef.current = next;
      polygonsRef.current.forEach((polygon, id) => {
        const data = GEOHASH_DATA.find(d => d.id === id);
        if (data) polygon.setVisible(isVisible(data, next, techFilterRef.current));
      });
      return next;
    });
  };

  const handleTechFilter = (tech: TechCategory | "TODOS") => {
    setTechFilter(tech);
    techFilterRef.current = tech;
    polygonsRef.current.forEach((polygon, id) => {
      const data = GEOHASH_DATA.find(d => d.id === id);
      if (!data) return;
      const visible = isVisible(data, activeFiltersRef.current, tech);
      polygon.setVisible(visible);
      if (visible) {
        const color = getPolygonColor(data);
        polygon.setOptions({ fillColor: color, strokeColor: color + "CC" });
      }
    });
  };

  const handleMapReady = useCallback((map: google.maps.Map) => {
    map.setOptions({
      styles: [
        { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
        { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
        { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
        { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
        { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
        { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
        { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
      ],
    });

    GEOHASH_DATA.forEach((ghData) => {
      const path = geohashToPolygon(ghData.id);
      const colors = QUADRANT_COLORS[ghData.quadrant];
      const polygon = new google.maps.Polygon({
        paths: path,
        strokeColor: colors.stroke,
        strokeOpacity: 0.9,
        strokeWeight: 1.5,
        fillColor: colors.hex,
        fillOpacity: 0.4,
        map,
        zIndex: 1,
      });
      polygon.addListener("mouseover", () => {
        polygon.setOptions({ fillOpacity: 0.72, strokeWeight: 2.5, strokeColor: "#ffffff", zIndex: 10 });
        // Só atualiza hover se não há pin ativo
        if (!pinnedGeohashRef.current) setHoveredGeohash(ghData);
      });
      polygon.addListener("mouseout", () => {
        const color = getPolygonColor(ghData);
        // Mantém destaque visual se este geohash está pinado
        if (pinnedGeohashRef.current?.id === ghData.id) return;
        polygon.setOptions({ fillOpacity: 0.4, strokeWeight: 1.5, strokeColor: color + "CC", zIndex: 1 });
        if (!pinnedGeohashRef.current) setHoveredGeohash(null);
      });
      polygon.addListener("click", () => {
        const currentPin = pinnedGeohashRef.current;
        if (currentPin?.id === ghData.id) {
          // Desafixar: clicou no mesmo geohash pinado
          pinnedGeohashRef.current = null;
          setPinnedGeohash(null);
          // Restaura estilo normal
          const color = getPolygonColor(ghData);
          polygon.setOptions({ fillOpacity: 0.4, strokeWeight: 1.5, strokeColor: color + "CC", zIndex: 1 });
        } else {
          // Restaura estilo do pin anterior (se houver)
          if (currentPin) {
            const prevPolygon = polygonsRef.current.get(currentPin.id);
            if (prevPolygon) {
              const prevColor = getPolygonColor(currentPin);
              prevPolygon.setOptions({ fillOpacity: 0.4, strokeWeight: 1.5, strokeColor: prevColor + "CC", zIndex: 1 });
            }
          }
          // Fixa o novo geohash
          pinnedGeohashRef.current = ghData;
          setPinnedGeohash(ghData);
          polygon.setOptions({ fillOpacity: 0.8, strokeWeight: 3, strokeColor: "#ffffff", zIndex: 20 });
        }
      });
      polygonsRef.current.set(ghData.id, polygon);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalGeohashes = GEOHASH_DATA.length;
  const riscoCount = GEOHASH_DATA.filter(d => d.quadrant === "RETENCAO").length;
  const visibleCount = GEOHASH_DATA.filter(d => isVisible(d, activeFilters, techFilter)).length;

  const DIAGNOSTIC_DESCRIPTIONS: Record<Quadrant, string> = {
    GROWTH:          "Share baixo + Satisfação alta — janela de ataque, geração de leads",
    UPSELL:          "Share alto + Satisfação alta — maximizar receita, upsell premium",
    GROWTH_RETENCAO: "Share baixo + Satisfação baixa — dupla frente: aquisição + infraestrutura",
    RETENCAO:        "Share alto + Satisfação baixa — risco iminente de churn, ação urgente",
  };

  const TECH_TABS: { key: TechCategory | "TODOS"; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "TODOS",  label: "Todos",  icon: <SlidersHorizontal className="w-3 h-3" />, color: "#64748B" },
    { key: "FIBRA",  label: "Fibra",  icon: <Wifi className="w-3 h-3" />,              color: TECH_COLORS.FIBRA.hex },
    { key: "MOVEL",  label: "Móvel",  icon: <Signal className="w-3 h-3" />,            color: TECH_COLORS.MOVEL.hex },
    { key: "AMBOS",  label: "Ambos",  icon: <span className="text-[9px] font-bold">F+M</span>, color: TECH_COLORS.AMBOS.hex },
  ];

  // Contagens por tecnologia
  const techCounts = {
    TODOS: totalGeohashes,
    FIBRA: GEOHASH_DATA.filter(d => d.technology === "FIBRA").length,
    MOVEL: GEOHASH_DATA.filter(d => d.technology === "MOVEL").length,
    AMBOS: GEOHASH_DATA.filter(d => d.technology === "AMBOS").length,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif", background: "#F0F2F8" }}>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Map Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Filter Bar — Quadrante */}
          <div className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-3 shrink-0 flex-wrap" style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtrar:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {QUADRANT_ORDER.map((q) => {
                const isActive = activeFilters.has(q);
                const colors = QUADRANT_COLORS[q];
                return (
                  <button
                    key={q}
                    onClick={() => toggleFilter(q)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${
                      isActive ? "border-transparent text-white" : "border-slate-200 text-slate-400 bg-white hover:border-slate-300"
                    }`}
                    style={isActive ? { backgroundColor: colors.hex, boxShadow: `0 2px 8px ${colors.hex}40` } : {}}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? "rgba(255,255,255,0.8)" : colors.hex }} />
                    {QUADRANT_LABELS[q]}
                  </button>
                );
              })}
            </div>

            {/* Divisor */}
            <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />

            {/* Toggle Tecnologia */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              {TECH_TABS.map(tab => {
                const isActive = techFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTechFilter(tab.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 ${
                      isActive ? "bg-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                    }`}
                    style={isActive ? { color: tab.color } : {}}
                  >
                    <span style={{ color: isActive ? tab.color : undefined }}>{tab.icon}</span>
                    {tab.label}
                    <span className="text-[9px] font-bold px-1 py-0.5 rounded-full"
                      style={isActive
                        ? { backgroundColor: tab.color + "18", color: tab.color }
                        : { backgroundColor: "#E2E8F0", color: "#94A3B8" }}>
                      {techCounts[tab.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
              <span>{visibleCount}/{totalGeohashes} visíveis</span>
              {riscoCount > 0 && (
                <span className="flex items-center gap-1 text-red-500 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {riscoCount} em risco
                </span>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
            <MapView
              className="w-full h-full"
              initialCenter={{ lat: -23.5505, lng: -46.6333 }}
              initialZoom={11}
              onMapReady={handleMapReady}
            />
            {!hoveredGeohash && (
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-slate-100 flex items-center gap-2 text-xs text-slate-500 pointer-events-none">
                <Info className="w-3.5 h-3.5 text-violet-400" />
                Passe o cursor sobre uma célula para ver a ficha estratégica
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="bg-white border-t border-slate-100 px-4 py-2.5 shrink-0">
            <div className="flex items-start gap-8 flex-wrap">
              {/* Legenda Quadrante */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Quadrante</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  {QUADRANT_ORDER.map((q) => (
                    <div key={q} className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: QUADRANT_COLORS[q].hex }} />
                      <span className="text-xs text-slate-600 font-medium">{QUADRANT_LABELS[q]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nota de filtro de tecnologia ativo */}
              {techFilter !== "TODOS" && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TECH_COLORS[techFilter as TechCategory]?.hex ?? "#64748B" }} />
                  <span>Exibindo apenas geohashes de <strong className="text-slate-700">{TECH_COLORS[techFilter as TechCategory]?.label ?? techFilter}</strong> — cores mantidas por quadrante estratégico</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 bg-white border-l border-slate-100 flex flex-col shrink-0 overflow-hidden" style={{ boxShadow: "-2px 0 12px rgba(0,0,0,0.04)" }}>
          <div className="px-5 py-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border-2 border-violet-300 flex items-center justify-center">
                  <ChevronRight className="w-3 h-3 text-[#660099]" />
                </div>
                <h2 className="text-sm font-bold text-[#660099]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {displayedGeohash ? "Ficha de Geohash" : "Territórios de Ação"}
                </h2>
              </div>
              {/* Indicador de pin */}
              {pinnedGeohash && (
                <button
                  onClick={() => {
                    const prevPolygon = polygonsRef.current.get(pinnedGeohash.id);
                    if (prevPolygon) {
                      const prevColor = getPolygonColor(pinnedGeohash);
                      prevPolygon.setOptions({ fillOpacity: 0.4, strokeWeight: 1.5, strokeColor: prevColor + "CC", zIndex: 1 });
                    }
                    pinnedGeohashRef.current = null;
                    setPinnedGeohash(null);
                  }}
                  className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full border transition-colors hover:bg-red-50"
                  style={{ color: "#660099", borderColor: "#66009940", backgroundColor: "#66009908" }}
                  title="Clique para desafixar"
                >
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 4v7l2 3v2h-6v5l-1 1-1-1v-5H5v-2l2-3V4H6V2h12v2h-1zm-2 0H9v7.6L7.42 14h9.16L15 11.6V4z"/>
                  </svg>
                  Fixado
                </button>
              )}
            </div>
            {!displayedGeohash && (
              <p className="text-xs text-slate-500 leading-relaxed ml-8 mt-1">
                Tradução do diagnóstico em <strong className="text-slate-700">4 estratégias distintas</strong>, aplicadas sobre o mapa real da cidade para maximizar o ROI.
              </p>
            )}
            {!pinnedGeohash && displayedGeohash && (
              <p className="text-[9px] text-slate-400 ml-8 mt-0.5">Clique na célula para fixar a ficha</p>
            )}
          </div>

          <div className="flex-1 overflow-hidden min-h-0">
            <GeohashCard data={displayedGeohash} techFilter={techFilter} />
          </div>

          <div className="border-t border-slate-100 shrink-0">
            <button
              className="w-full px-5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              onClick={() => setShowDiagnostic(!showDiagnostic)}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-violet-300 flex items-center justify-center">
                  <ChevronRight className={`w-2.5 h-2.5 text-[#660099] transition-transform ${showDiagnostic ? "rotate-90" : ""}`} />
                </div>
                <span className="text-xs font-bold text-[#660099]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Diagnóstico Bivariado
                </span>
              </div>
            </button>
            {showDiagnostic && (
              <div className="px-5 pb-3">
                <p className="text-xs text-slate-500 leading-relaxed mb-2">
                  Cruzamento de <strong className="text-slate-700">Share de Mercado (Vivo)</strong> com <strong className="text-slate-700">Satisfação do Usuário</strong>.
                </p>
                <div className="space-y-1.5">
                  {QUADRANT_ORDER.map(q => (
                    <div key={q} className="flex items-start gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0 mt-0.5" style={{ backgroundColor: QUADRANT_COLORS[q].hex }} />
                      <span className="text-[10px] text-slate-500">
                        <strong style={{ color: QUADRANT_COLORS[q].hex }}>{QUADRANT_LABELS[q]}</strong>{" — "}{DIAGNOSTIC_DESCRIPTIONS[q]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

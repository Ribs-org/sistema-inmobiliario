import type { ReactNode } from "react";
import { ETIQUETA_ESTADO_VENTA, type EstadoVenta } from "@/data/proyectos";
import type { EstadoLinea } from "@/data/metro";

/** Punto de color de una línea de Metro. Las futuras se dibujan huecas. */
export function PuntoLinea({
  color,
  estado,
  size = 10,
}: {
  color: string;
  estado: EstadoLinea;
  size?: number;
}) {
  const futura = estado !== "operativa";
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: futura ? "#fff" : color,
        border: `2px ${futura ? "dashed" : "solid"} ${color}`,
      }}
    />
  );
}

export function EtiquetaLinea({ id, color, estado }: { id: string; color: string; estado: EstadoLinea }) {
  const futura = estado !== "operativa";
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-px text-[11px] font-semibold leading-4"
      style={{
        background: futura ? "#fff" : color,
        color: futura ? color : "#fff",
        border: `1px ${futura ? "dashed" : "solid"} ${color}`,
      }}
    >
      {id.replace("X", "")}
    </span>
  );
}

const COLOR_ESTADO: Record<EstadoVenta, string> = {
  "entrega-inmediata": "bg-ok/10 text-ok",
  "en-verde": "bg-accent-soft text-accent",
  "en-blanco": "bg-line-soft text-ink-muted",
};

export function BadgeEstado({ estado }: { estado: EstadoVenta }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${COLOR_ESTADO[estado]}`}>
      {ETIQUETA_ESTADO_VENTA[estado]}
    </span>
  );
}

export function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        activo
          ? "border-ink bg-ink text-white"
          : "border-line bg-panel text-ink-muted hover:border-ink-faint hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function Interruptor({
  activo,
  onChange,
  label,
  descripcion,
}: {
  activo: boolean;
  onChange: (v: boolean) => void;
  label: string;
  descripcion?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {descripcion && <span className="block text-xs text-ink-muted">{descripcion}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        onClick={() => onChange(!activo)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
          activo ? "bg-accent" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            activo ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export function Dato({ etiqueta, valor, sub }: { etiqueta: string; valor: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-ink-muted">{etiqueta}</div>
      <div className="truncate text-sm font-semibold text-ink">{valor}</div>
      {sub && <div className="truncate text-xs text-ink-faint">{sub}</div>}
    </div>
  );
}

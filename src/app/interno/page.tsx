"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { clientesDemo } from "@/data/clientes-demo";
import type { Proyecto } from "@/data/proyectos";
import { proyectosMuestra } from "@/data/proyectos-muestra";
import Marca from "@/components/Marca";
import Embudo from "@/components/interno/Embudo";
import RankingVendedores from "@/components/interno/RankingVendedores";
import ProyectosInterno from "@/components/interno/ProyectosInterno";
import type { Cotizacion } from "@/lib/cotizaciones-store";
import {
  ETAPAS,
  ETAPAS_ACTIVAS,
  ETIQUETA_ETAPA,
  ETIQUETA_INTERACCION,
  TIPOS_MANUALES,
  hoyISO,
  nuevaInteraccion,
  ordenarInteracciones,
  reconciliarCliente,
  ultimaInteraccion,
  type TipoInteraccion,
  nuevoCliente,
  ordenarPorSeguimiento,
  type Cliente,
  type Etapa,
  type Interaccion,
} from "@/lib/clientes";
import { fmtUF } from "@/lib/format";
import { UF_RESPALDO } from "@/lib/uf";
import type { Sesion } from "@/lib/auth";
import type { Usuario } from "@/app/api/usuarios/route";
import BotonUsuario from "@/components/BotonUsuario";
import { Chip } from "@/components/ui";

type Auth = "cargando" | "bloqueado" | "abierto";
type Almacenamiento = "redis" | "ninguno";
const CLAVE_LOCAL = "ribs:clientes";

const COLOR_ETAPA: Record<Etapa, string> = {
  nuevo: "bg-line-soft text-ink",
  contactado: "bg-accent-soft text-accent",
  visita: "bg-select-soft text-warn",
  reserva: "bg-ok/10 text-ok",
  promesa: "bg-ok/15 text-ok",
  escritura: "bg-ink text-white",
  perdido: "bg-line-soft text-ink-faint line-through",
};

function leerLocal(): Cliente[] {
  try {
    const raw = localStorage.getItem(CLAVE_LOCAL);
    const datos = raw ? (JSON.parse(raw) as Cliente[]) : [];
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

function escribirLocal(lista: Cliente[]) {
  try {
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify(lista));
  } catch {
    /* sin espacio o navegador restringido: se ignora */
  }
}

function diasDesdeHoy(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  const [hy, hm, hd] = hoyISO().split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(hy, hm - 1, hd)) / 86400000);
}

function etiquetaFecha(fecha: string | null): {
  texto: string;
  tono: "atrasado" | "hoy" | "normal" | "vacio";
} {
  if (!fecha) return { texto: "Sin fecha", tono: "vacio" };
  const dias = diasDesdeHoy(fecha);
  if (dias < 0) return { texto: `Atrasado ${-dias} ${dias === -1 ? "día" : "días"}`, tono: "atrasado" };
  if (dias === 0) return { texto: "Hoy", tono: "hoy" };
  if (dias === 1) return { texto: "Mañana", tono: "normal" };
  return { texto: `En ${dias} días`, tono: "normal" };
}

function nombreProyecto(lista: Proyecto[], id: string | null) {
  return lista.find((p) => p.id === id)?.nombre ?? "Sin proyecto";
}

function nombreTipologia(lista: Proyecto[], proyectoId: string | null, tipId: string | null) {
  return lista.find((p) => p.id === proyectoId)?.tipologias.find((t) => t.id === tipId)?.nombre ?? null;
}

type Seccion = "clientes" | "embudo" | "proyectos";
const SECCIONES: { id: Seccion; nombre: string }[] = [
  { id: "clientes", nombre: "Clientes" },
  { id: "embudo", nombre: "Embudo" },
  { id: "proyectos", nombre: "Proyectos" },
];

export default function Interno() {
  const [auth, setAuth] = useState<Auth>("cargando");
  const [clavePorDefecto, setClavePorDefecto] = useState(false);
  const [clave, setClave] = useState("");
  const [errorClave, setErrorClave] = useState<string | null>(null);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [almacenamiento, setAlmacenamiento] = useState<Almacenamiento>("ninguno");
  const [filtro, setFiltro] = useState<Etapa | "activos" | "todos">("activos");
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [seccion, setSeccion] = useState<Seccion>("clientes");
  const [proyectos, setProyectos] = useState<Proyecto[]>(proyectosMuestra());
  const [origenProyectos, setOrigenProyectos] = useState<"redis" | "muestra">("muestra");
  const [valorUF, setValorUF] = useState(UF_RESPALDO);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [conClerk, setConClerk] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [vendedorFiltro, setVendedorFiltro] = useState<string>("todos");
  const admin = sesion?.rol === "admin";
  useEffect(() => {
    let vivo = true;
    fetch("/api/uf")
      .then((r) => r.json())
      .then((j: { valor?: number }) => vivo && typeof j.valor === "number" && setValorUF(j.valor))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    const r = await fetch("/api/clientes");
    if (r.status === 401) {
      setAuth("bloqueado");
      return;
    }
    const j = (await r.json()) as {
      clientes: Cliente[];
      almacenamiento: Almacenamiento;
      sesion?: Sesion | null;
    };
    setAlmacenamiento(j.almacenamiento);
    setClientes(j.almacenamiento === "redis" ? j.clientes : leerLocal());
    if (j.sesion) setSesion(j.sesion);
    setAuth("abierto");
    fetch("/api/usuarios")
      .then((r) => (r.ok ? r.json() : { usuarios: [] }))
      .then((ju: { usuarios?: Usuario[] }) => setUsuarios(ju.usuarios ?? []))
      .catch(() => {});
    fetch("/api/proyectos")
      .then((r) => r.json())
      .then((jp: { proyectos: Proyecto[]; origen: "redis" | "muestra" }) => {
        if (Array.isArray(jp.proyectos)) {
          setProyectos(jp.proyectos);
          setOrigenProyectos(jp.origen);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let vivo = true;
    fetch("/api/acceso")
      .then((r) => r.json())
      .then(
        (j: { autorizado: boolean; clavePorDefecto: boolean; clerk?: boolean; sesion?: Sesion | null }) => {
          if (!vivo) return;
          setClavePorDefecto(j.clavePorDefecto);
          setConClerk(!!j.clerk);
          if (j.sesion) setSesion(j.sesion);
          if (j.autorizado) cargar();
          else setAuth("bloqueado");
        },
      )
      .catch(() => vivo && setAuth("bloqueado"));
    return () => {
      vivo = false;
    };
  }, [cargar]);

  // Prefill desde la ficha de un proyecto: /interno?nuevo=1&p=<proyecto>&t=<tipología>
  useEffect(() => {
    if (auth !== "abierto") return;
    queueMicrotask(() => {
      const q = new URLSearchParams(window.location.search);
      if (q.get("nuevo") !== "1") return;
      const proyectoId = q.get("p");
      const proyecto = proyectos.find((p) => p.id === proyectoId);
      setEditando(
        nuevoCliente({
          proyectoId: proyecto?.id ?? null,
          tipologiaId: proyecto?.tipologias.find((t) => t.id === q.get("t"))?.id ?? null,
          proximoContacto: hoyISO(),
        }),
      );
      window.history.replaceState(null, "", "/interno");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir sesión
  }, [auth]);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setErrorClave(null);
    const r = await fetch("/api/acceso", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clave }),
    });
    if (r.ok) {
      setClave("");
      cargar();
    } else {
      setErrorClave("Clave incorrecta. Revisa mayúsculas y espacios.");
    }
  };

  const salir = async () => {
    await fetch("/api/acceso", { method: "DELETE" });
    setAuth("bloqueado");
    setClientes([]);
    setEditando(null);
  };

  const persistir = async (
    accion: () => Promise<Response>,
    local: () => Cliente[],
    despues: (lista: Cliente[]) => void = () => setEditando(null),
  ) => {
    setGuardando(true);
    setAviso(null);
    try {
      let lista: Cliente[];
      if (almacenamiento === "redis") {
        const r = await accion();
        if (r.status === 401) return setAuth("bloqueado");
        const j = (await r.json()) as { clientes?: Cliente[]; error?: string };
        if (!r.ok || !j.clientes) throw new Error(j.error ?? "No se pudo guardar");
        lista = j.clientes;
      } else {
        lista = local();
        escribirLocal(lista);
      }
      setClientes(lista);
      despues(lista);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  /** Guarda el cliente; con `mantenerAbierto` deja el formulario abierto con la versión guardada. */
  const guardar = (c: Cliente, mantenerAbierto = false) =>
    persistir(
      () =>
        fetch("/api/clientes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(c),
        }),
      () => {
        const previo = clientes.find((x) => x.id === c.id);
        const actualizado = reconciliarCliente({ ...c, actualizadoEn: new Date().toISOString() }, previo);
        return previo ? clientes.map((x) => (x.id === c.id ? actualizado : x)) : [...clientes, actualizado];
      },
      (lista) => setEditando(mantenerAbierto ? (lista.find((x) => x.id === c.id) ?? null) : null),
    );

  const eliminar = (id: string) => {
    if (!window.confirm("¿Eliminar este cliente? No se puede deshacer.")) return;
    persistir(
      () => fetch(`/api/clientes?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
      () => clientes.filter((x) => x.id !== id),
    );
  };

  const cargarDemo = async () => {
    const demo = clientesDemo().filter((d) => !clientes.some((c) => c.id === d.id));
    if (demo.length === 0) return setAviso("Los clientes de demo ya están cargados.");
    setGuardando(true);
    setAviso(null);
    try {
      if (almacenamiento === "redis") {
        let lista: Cliente[] = clientes;
        for (const c of demo) {
          const r = await fetch("/api/clientes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(c),
          });
          if (r.status === 401) return setAuth("bloqueado");
          const j = (await r.json()) as { clientes?: Cliente[]; error?: string };
          if (!r.ok || !j.clientes) throw new Error(j.error ?? "No se pudo cargar la demo");
          lista = j.clientes;
        }
        setClientes(lista);
      } else {
        const lista = [...clientes, ...demo];
        escribirLocal(lista);
        setClientes(lista);
      }
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo cargar la demo");
    } finally {
      setGuardando(false);
    }
  };

  const ordenados = useMemo(() => ordenarPorSeguimiento(clientes), [clientes]);
  const visibles = useMemo(
    () =>
      ordenados.filter((c) => {
        if (filtro === "todos") return true;
        if (filtro === "activos") return ETAPAS_ACTIVAS.includes(c.etapa);
        return c.etapa === filtro;
      }),
    [ordenados, filtro],
  );

  const resumen = useMemo(() => {
    const activos = clientes.filter((c) => ETAPAS_ACTIVAS.includes(c.etapa));
    const conFecha = activos.filter((c) => c.proximoContacto);
    return {
      atrasados: conFecha.filter((c) => diasDesdeHoy(c.proximoContacto!) < 0).length,
      hoy: conFecha.filter((c) => diasDesdeHoy(c.proximoContacto!) === 0).length,
      semana: conFecha.filter((c) => {
        const d = diasDesdeHoy(c.proximoContacto!);
        return d > 0 && d <= 7;
      }).length,
      activos: activos.length,
    };
  }, [clientes]);

  if (auth === "cargando") {
    return <div className="flex h-full items-center justify-center text-sm text-ink-muted">Cargando…</div>;
  }

  if (auth === "bloqueado") {
    return (
      <div className="flex min-h-full items-center justify-center bg-negro p-6">
        <form
          onSubmit={entrar}
          className="w-full max-w-sm rounded-xl border-t-4 border-oro bg-panel p-6 shadow-2xl"
        >
          <Marca tono="negro" />
          <h1 className="mt-3 text-2xl font-semibold">Área interna</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Seguimiento de clientes. Solo para el equipo comercial.
          </p>
          <label className="mt-5 block">
            <span className="mb-1 block text-sm font-medium">Clave</span>
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-accent"
            />
          </label>
          {errorClave && <p className="mt-2 text-sm text-warn">{errorClave}</p>}
          {clavePorDefecto && (
            <p className="mt-2 text-xs text-ink-faint">
              Clave inicial: <code className="rounded bg-fondo px-1">ribs2026</code>. Cámbiala definiendo{" "}
              <code className="rounded bg-fondo px-1">CLAVE_INTERNA</code> en Vercel.
            </p>
          )}
          <button
            type="submit"
            className="mt-5 w-full rounded-md bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-accent"
          >
            Entrar
          </button>
          {conClerk && (
            <p className="mt-4 text-center text-sm">
              <Link href="/ingresar" className="font-medium text-accent hover:underline">
                Entrar con mi cuenta de broker
              </Link>
            </p>
          )}
          <Link href="/" className="mt-4 block text-center text-xs text-ink-muted hover:text-ink">
            Volver al mapa
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-oro/30 bg-negro px-4 text-white">
        <div className="flex items-center gap-3">
          <Marca />
          <span className="hidden text-sm text-white/60 sm:inline">
            {sesion ? sesion.nombre : "Área interna"}
            {sesion && (
              <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-xs text-oro-claro">
                {admin ? "Admin" : "Broker"}
              </span>
            )}
          </span>
        </div>
        <nav className="flex gap-1 rounded-md bg-white/10 p-0.5" aria-label="Secciones">
          {SECCIONES.filter((s) => admin || s.id !== "proyectos").map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSeccion(s.id)}
              aria-current={seccion === s.id ? "page" : undefined}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                seccion === s.id ? "bg-oro text-negro" : "text-white/70 hover:text-white"
              }`}
            >
              {s.nombre}
            </button>
          ))}
        </nav>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-white/70 hover:text-white">
            Mapa
          </Link>
          {sesion?.origen === "clerk" ? (
            <BotonUsuario />
          ) : (
            <button type="button" onClick={salir} className="text-white/70 hover:text-white">
              Salir
            </button>
          )}
        </nav>
      </header>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-5 lg:px-8">
          {seccion === "embudo" && admin && (
            <RankingVendedores
              clientes={clientes}
              proyectos={proyectos}
              valorUF={valorUF}
              nombres={Object.fromEntries(usuarios.map((u) => [u.id, u.nombre]))}
            />
          )}
          {seccion === "embudo" && admin && usuarios.length > 1 && (
            <label className="mb-4 flex items-center gap-2 text-sm">
              <span className="text-ink-muted">Vendedor</span>
              <select
                value={vendedorFiltro}
                onChange={(e) => setVendedorFiltro(e.target.value)}
                className="rounded-md border border-line bg-panel px-2 py-1 text-sm"
              >
                <option value="todos">Todo el equipo</option>
                <option value="sin">Sin asignar</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          {seccion === "embudo" && (
            <Embudo
              clientes={
                vendedorFiltro === "todos"
                  ? clientes
                  : clientes.filter((c) =>
                      vendedorFiltro === "sin" ? !c.vendedorId : c.vendedorId === vendedorFiltro,
                    )
              }
              proyectos={proyectos}
              valorUF={valorUF}
              onAbrir={(c) => {
                setSeccion("clientes");
                setEditando(c);
              }}
            />
          )}
          {seccion === "proyectos" && (
            <ProyectosInterno
              proyectos={proyectos}
              origen={origenProyectos}
              onCambio={(lista, origen) => {
                setProyectos(lista);
                setOrigenProyectos(origen);
              }}
              onBloqueado={() => setAuth("bloqueado")}
            />
          )}
          {seccion === "clientes" && almacenamiento === "ninguno" && (
            <p className="mb-4 rounded-md border border-select bg-select-soft px-3 py-2 text-sm">
              Guardando solo en este navegador. Conecta Upstash Redis en Vercel para compartir la lista entre
              dispositivos.
            </p>
          )}
          {seccion === "clientes" && (
            <>
              {aviso && <p className="mb-4 rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">{aviso}</p>}

              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Tile etiqueta="Atrasados" valor={resumen.atrasados} alerta={resumen.atrasados > 0} />
                <Tile etiqueta="Para hoy" valor={resumen.hoy} />
                <Tile etiqueta="Próximos 7 días" valor={resumen.semana} />
                <Tile etiqueta="Clientes activos" valor={resumen.activos} />
              </div>

              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por etapa">
                  <Chip activo={filtro === "activos"} onClick={() => setFiltro("activos")}>
                    Activos
                  </Chip>
                  <Chip activo={filtro === "todos"} onClick={() => setFiltro("todos")}>
                    Todos
                  </Chip>
                  {ETAPAS.map((e) => (
                    <Chip key={e} activo={filtro === e} onClick={() => setFiltro(e)}>
                      {ETIQUETA_ETAPA[e]}
                    </Chip>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cargarDemo}
                    disabled={guardando}
                    className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-muted hover:border-ink hover:text-ink disabled:opacity-50"
                    title="Agrega clientes ficticios para probar la pantalla"
                  >
                    Cargar demo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando(nuevoCliente({ proximoContacto: hoyISO() }))}
                    className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-accent"
                  >
                    Nuevo cliente
                  </button>
                </div>
              </div>

              <div className={`grid gap-5 ${editando ? "lg:grid-cols-[1fr_380px]" : ""}`}>
                <div className="overflow-hidden rounded-xl border border-line bg-panel">
                  {visibles.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-ink-muted">
                      {clientes.length === 0
                        ? "Todavía no hay clientes. Crea el primero con “Nuevo cliente”, desde la ficha de un proyecto, o carga la demo."
                        : "Ningún cliente en esta etapa."}
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-fondo/70 text-left text-xs text-ink-muted">
                        <tr>
                          <th className="px-4 py-2 font-medium">Cliente</th>
                          <th className="hidden px-3 py-2 font-medium md:table-cell">Interés</th>
                          <th className="px-3 py-2 font-medium">Etapa</th>
                          <th className="px-3 py-2 font-medium">Próximo contacto</th>
                          <th className="hidden px-3 py-2 font-medium lg:table-cell">Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibles.map((c) => {
                          const f = etiquetaFecha(c.proximoContacto);
                          const tip = nombreTipologia(proyectos, c.proyectoId, c.tipologiaId);
                          return (
                            <tr
                              key={c.id}
                              onClick={() => setEditando(c)}
                              className={`cursor-pointer border-t border-line-soft hover:bg-fondo/60 ${
                                editando?.id === c.id ? "bg-select-soft" : ""
                              }`}
                            >
                              <td className="px-4 py-2.5">
                                <div className="font-medium">{c.nombre}</div>
                                <div className="text-xs text-ink-muted">
                                  {[c.telefono, c.email].filter(Boolean).join(" · ")}
                                </div>
                                {ultimaInteraccion(c) && (
                                  <div className="max-w-xs truncate text-xs text-ink-faint">
                                    {ultimaInteraccion(c)!.fecha.slice(5)} ·{" "}
                                    {ETIQUETA_INTERACCION[ultimaInteraccion(c)!.tipo]}:{" "}
                                    {ultimaInteraccion(c)!.texto}
                                  </div>
                                )}
                              </td>
                              <td className="hidden px-3 py-2.5 md:table-cell">
                                <div>{nombreProyecto(proyectos, c.proyectoId)}</div>
                                {tip && <div className="text-xs text-ink-muted">{tip}</div>}
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${COLOR_ETAPA[c.etapa]}`}
                                >
                                  {ETIQUETA_ETAPA[c.etapa]}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={
                                    f.tono === "atrasado"
                                      ? "font-semibold text-warn"
                                      : f.tono === "hoy"
                                        ? "font-semibold text-accent"
                                        : f.tono === "vacio"
                                          ? "text-ink-faint"
                                          : ""
                                  }
                                >
                                  {f.texto}
                                </span>
                                {c.proximoContacto && (
                                  <div className="text-xs text-ink-faint">{c.proximoContacto}</div>
                                )}
                              </td>
                              <td className="hidden max-w-xs truncate px-3 py-2.5 text-ink-muted lg:table-cell">
                                {c.notas}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {editando && (
                  <FormularioCliente
                    key={`${editando.id}-${editando.actualizadoEn}`}
                    inicial={editando}
                    proyectos={proyectos}
                    usuarios={admin ? usuarios : []}
                    existente={clientes.some((c) => c.id === editando.id)}
                    guardando={guardando}
                    onGuardar={guardar}
                    onEliminar={() => eliminar(editando.id)}
                    onCancelar={() => setEditando(null)}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ etiqueta, valor, alerta }: { etiqueta: string; valor: number; alerta?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${alerta ? "border-warn/40 bg-warn/5" : "border-line bg-panel"}`}
    >
      <div className="text-xs text-ink-muted">{etiqueta}</div>
      <div className={`display text-2xl font-semibold ${alerta ? "text-warn" : ""}`}>{valor}</div>
    </div>
  );
}

function FormularioCliente({
  inicial,
  proyectos,
  usuarios,
  existente,
  guardando,
  onGuardar,
  onEliminar,
  onCancelar,
}: {
  inicial: Cliente;
  proyectos: Proyecto[];
  /** Vendedores para reasignar; vacío si quien mira no es admin */
  usuarios: Usuario[];
  existente: boolean;
  guardando: boolean;
  onGuardar: (c: Cliente, mantenerAbierto?: boolean) => void;
  onEliminar: () => void;
  onCancelar: () => void;
}) {
  const [c, setC] = useState<Cliente>(inicial);
  const set = (parte: Partial<Cliente>) => setC((prev) => ({ ...prev, ...parte }));
  const proyecto = proyectos.find((p) => p.id === c.proyectoId);
  const tipologia = proyecto?.tipologias.find((t) => t.id === c.tipologiaId);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  useEffect(() => {
    if (!existente) return;
    let vivo = true;
    fetch(`/api/cotizaciones?cliente=${encodeURIComponent(inicial.id)}`)
      .then((r) => (r.ok ? r.json() : { cotizaciones: [] }))
      .then((j: { cotizaciones: Cotizacion[] }) => vivo && setCotizaciones(j.cotizaciones ?? []))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [existente, inicial.id]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (c.nombre.trim()) onGuardar({ ...c, nombre: c.nombre.trim() });
      }}
      className="h-fit space-y-3 rounded-xl border border-line bg-panel p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{existente ? "Editar cliente" : "Nuevo cliente"}</h2>
        <button type="button" onClick={onCancelar} className="text-sm text-ink-muted hover:text-ink">
          Cerrar
        </button>
      </div>

      <Campo etiqueta="Nombre">
        <input
          required
          value={c.nombre}
          onChange={(e) => set({ nombre: e.target.value })}
          className={INPUT}
          autoFocus
        />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Teléfono">
          <input
            value={c.telefono}
            onChange={(e) => set({ telefono: e.target.value })}
            className={INPUT}
            placeholder="+56 9 …"
          />
        </Campo>
        <Campo etiqueta="Email">
          <input
            type="email"
            value={c.email}
            onChange={(e) => set({ email: e.target.value })}
            className={INPUT}
          />
        </Campo>
      </div>

      <Campo etiqueta="Proyecto de interés">
        <select
          value={c.proyectoId ?? ""}
          onChange={(e) => set({ proyectoId: e.target.value || null, tipologiaId: null })}
          className={INPUT}
        >
          <option value="">Sin definir</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} · {p.comuna}
            </option>
          ))}
        </select>
      </Campo>
      {proyecto && (
        <Campo etiqueta="Tipología">
          <select
            value={c.tipologiaId ?? ""}
            onChange={(e) => set({ tipologiaId: e.target.value || null })}
            className={INPUT}
          >
            <option value="">Sin definir</option>
            {proyecto.tipologias.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} · {fmtUF(t.precioUF)}
              </option>
            ))}
          </select>
          {tipologia && (
            <Link
              href={`/?p=${proyecto.id}`}
              className="mt-1 inline-block text-xs text-accent hover:underline"
              target="_blank"
            >
              Ver ficha y simular crédito
            </Link>
          )}
        </Campo>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Etapa">
          <select value={c.etapa} onChange={(e) => set({ etapa: e.target.value as Etapa })} className={INPUT}>
            {ETAPAS.map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ETAPA[e]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Próximo contacto">
          <input
            type="date"
            value={c.proximoContacto ?? ""}
            onChange={(e) => set({ proximoContacto: e.target.value || null })}
            className={INPUT}
          />
        </Campo>
      </div>

      {usuarios.length > 0 && (
        <Campo etiqueta="Vendedor responsable">
          <select
            value={c.vendedorId ?? ""}
            onChange={(e) => {
              const u = usuarios.find((x) => x.id === e.target.value);
              set({ vendedorId: e.target.value || null, vendedorNombre: u?.nombre ?? "" });
            }}
            className={INPUT}
          >
            <option value="">Sin asignar</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
                {u.email ? ` · ${u.email}` : ""}
              </option>
            ))}
          </select>
        </Campo>
      )}

      <Campo etiqueta="Notas">
        <textarea
          value={c.notas}
          onChange={(e) => set({ notas: e.target.value })}
          rows={4}
          className={INPUT}
          placeholder="Qué busca, presupuesto, qué quedó pendiente…"
        />
      </Campo>

      <Historial
        interacciones={c.interacciones ?? []}
        guardando={guardando}
        onAgregar={(tipo, fecha, texto) =>
          onGuardar(
            {
              ...c,
              nombre: c.nombre.trim(),
              interacciones: [nuevaInteraccion({ tipo, fecha, texto }), ...(c.interacciones ?? [])],
            },
            true,
          )
        }
      />

      {existente && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-ink-muted">Cotizaciones</span>
            {proyecto && (
              <Link
                href={`/?p=${proyecto.id}`}
                target="_blank"
                className="text-xs text-accent hover:underline"
              >
                Nueva desde la ficha
              </Link>
            )}
          </div>
          {cotizaciones.length === 0 ? (
            <p className="text-xs text-ink-faint">
              Sin cotizaciones guardadas. Simula un crédito desde la ficha del proyecto y guárdalo para este
              cliente.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {cotizaciones.map((q) => (
                <li
                  key={q.codigo}
                  className="flex items-center justify-between gap-2 rounded-md border border-line-soft px-2 py-1"
                >
                  <span className="min-w-0 truncate">
                    {q.proyectoNombre}
                    {q.tipologiaNombre ? ` · ${q.tipologiaNombre}` : ""}
                    <span className="block text-xs text-ink-muted">
                      {q.creadaEn.slice(0, 10)} · vence {q.validaHasta}
                    </span>
                  </span>
                  <a
                    href={`/c/${q.codigo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs text-accent hover:underline"
                  >
                    Abrir
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        {existente ? (
          <button type="button" onClick={onEliminar} className="text-sm text-warn hover:underline">
            Eliminar
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={guardando || !c.nombre.trim()}
          className="rounded-md bg-ink px-4 py-1.5 text-sm font-medium text-white hover:bg-accent disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

const INPUT = "w-full rounded-md border border-line bg-panel px-2.5 py-1.5 text-sm focus:border-accent";

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-muted">{etiqueta}</span>
      {children}
    </label>
  );
}

function Historial({
  interacciones,
  guardando,
  onAgregar,
}: {
  interacciones: Interaccion[];
  guardando: boolean;
  onAgregar: (tipo: TipoInteraccion, fecha: string, texto: string) => void;
}) {
  const [tipo, setTipo] = useState<TipoInteraccion>("llamada");
  const [fecha, setFecha] = useState(hoyISO());
  const [texto, setTexto] = useState("");
  const [verTodas, setVerTodas] = useState(false);
  const ordenadas = ordenarInteracciones(interacciones);
  const visibles = verTodas ? ordenadas : ordenadas.slice(0, 5);

  const agregar = () => {
    if (!texto.trim()) return;
    onAgregar(tipo, fecha, texto.trim());
    setTexto("");
  };

  return (
    <div className="rounded-lg border border-line-soft bg-fondo/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-muted">Historial</span>
        <span className="text-xs text-ink-faint">
          {interacciones.length} {interacciones.length === 1 ? "registro" : "registros"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoInteraccion)}
          className={`${INPUT} w-auto`}
        >
          {TIPOS_MANUALES.map((t) => (
            <option key={t} value={t}>
              {ETIQUETA_INTERACCION[t]}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={`${INPUT} w-auto`}
        />
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder="Qué pasó en este contacto…"
          className={INPUT}
        />
        <button
          type="button"
          onClick={agregar}
          disabled={guardando || !texto.trim()}
          className="shrink-0 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-accent disabled:opacity-50"
        >
          Registrar
        </button>
      </div>
      {ordenadas.length > 0 && (
        <ol className="mt-3 space-y-1.5 border-l border-line pl-3">
          {visibles.map((i) => (
            <li key={i.id} className="text-sm">
              <div className="text-xs text-ink-muted">
                {i.fecha} · {ETIQUETA_INTERACCION[i.tipo]}
              </div>
              <div className={i.tipo === "etapa" ? "text-ink-muted" : ""}>{i.texto}</div>
            </li>
          ))}
        </ol>
      )}
      {ordenadas.length > 5 && (
        <button
          type="button"
          onClick={() => setVerTodas((v) => !v)}
          className="mt-2 text-xs text-accent hover:underline"
        >
          {verTodas ? "Ver menos" : `Ver las ${ordenadas.length}`}
        </button>
      )}
    </div>
  );
}

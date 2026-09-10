// Marca: emblema de Broker Capital (skyline) más el nombre del producto.

type Props = {
  /** "oro" para cabeceras oscuras, "negro" para documentos sobre blanco */
  tono?: "oro" | "negro";
  tamano?: "sm" | "lg";
};

export default function Marca({ tono = "oro", tamano = "sm" }: Props) {
  const alto = tamano === "lg" ? 28 : 22;
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tono === "oro" ? "/marca-oro.png" : "/icon.png"}
        alt=""
        width={alto}
        height={alto}
        className="shrink-0"
        style={{ height: alto, width: "auto" }}
      />
      <span
        className={`display font-bold tracking-tight ${tamano === "lg" ? "text-2xl" : "text-lg"} ${
          tono === "oro" ? "text-oro" : "text-negro"
        }`}
      >
        Pyxis
      </span>
    </span>
  );
}

import Image from "next/image";

export function Brand({
  size = 40,
  fontSize = 19,
  color = "#13233F",
  accent = "#12A5A5",
}: {
  size?: number;
  fontSize?: number;
  color?: string;
  accent?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Image
        src="/fenix-mark.png"
        alt="Sociedade Fênix"
        width={Math.round(size * 1.05)}
        height={size}
        style={{ width: Math.round(size * 1.05), height: size, objectFit: "contain" }}
      />
      <div
        className="font-display"
        style={{ fontWeight: 800, fontSize, letterSpacing: "-.02em", color }}
      >
        Sociedade <span style={{ color: accent }}>Fênix</span>
      </div>
    </div>
  );
}

export default Brand;

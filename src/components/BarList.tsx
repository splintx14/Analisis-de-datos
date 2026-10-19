import { nf } from "@/lib/format";

export default function BarList({
  items,
  total,
}: {
  items: { name: string; value: number }[];
  total: number;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="blist">
      {items.map((it, i) => (
        <li key={it.name} className="blist-row" style={{ ["--i" as string]: i }}>
          <span className="blist-name">{it.name}</span>
          <span className="blist-track">
            <span className="blist-fill" style={{ width: `${(it.value / max) * 100}%` }} />
          </span>
          <span className="blist-value">
            {nf.format(Math.round(it.value))}
            <small>{total > 0 ? `${Math.round((it.value / total) * 100)}%` : ""}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

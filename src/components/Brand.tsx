import Link from "next/link";

export default function Brand() {
  return (
    <Link href="/" className="brand" aria-label="data.insights, ir al inicio">
      <svg className="brand-mark" viewBox="0 0 34 22" width="34" height="22" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1fa393" />
            <stop offset="100%" stopColor="#e3a93f" />
          </linearGradient>
        </defs>
        <path d="M2 12h6l4-9 6 17 4-8h10" stroke="url(#brandGrad)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="brand-name">
        <b>data</b>
        <span className="brand-sep" aria-hidden="true" />
        <span>insights</span>
      </span>
    </Link>
  );
}

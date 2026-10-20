"use client";

export default function PrintButton() {
  return (
    <button type="button" className="btn btn-light btn-sm no-print" onClick={() => window.print()}>
      Imprimir / PDF
    </button>
  );
}

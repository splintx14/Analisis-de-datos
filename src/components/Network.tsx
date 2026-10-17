// Red de puntos decorativa detrás del texto principal.
const NODES: [number, number][] = [
  [40, 210], [120, 120], [215, 60], [330, 95], [430, 40], [490, 165],
  [395, 225], [300, 305], [190, 265], [90, 335], [255, 385], [475, 335],
];
const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [3, 6], [6, 5], [6, 7],
  [7, 8], [8, 1], [8, 9], [7, 10], [6, 11], [0, 9],
];
const COLORS = ["#f0bf62", "#1fa393", "#7cc4d8", "#5b7fd6", "#f0bf62", "#7cc4d8",
  "#1fa393", "#f2b5b0", "#7cc4d8", "#5b7fd6", "#1fa393", "#f0bf62"];
const SIZES = [4, 3, 3, 5, 3, 4, 3, 4, 3, 4, 3, 5];

export default function Network() {
  return (
    <svg className="network" viewBox="0 0 520 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {EDGES.map(([a, b]) => (
        <line key={`${a}-${b}`} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} stroke="rgba(16,40,58,0.13)" strokeWidth="1" />
      ))}
      {NODES.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={SIZES[i]} fill={COLORS[i]} style={{ filter: `drop-shadow(0 0 7px ${COLORS[i]})` }} />
      ))}
    </svg>
  );
}

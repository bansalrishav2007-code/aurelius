import { mockAllocation, mockLiabilityTrend } from "@/lib/mock-data";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "color-mix(in oklab, var(--card) 92%, transparent)",
  border: "1px solid color-mix(in oklab, var(--foreground) 12%, transparent)",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 12,
  boxShadow: "0 20px 50px -20px rgba(0,0,0,0.6)",
  color: "var(--foreground)",
};

export function LiabilityChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={mockLiabilityTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="proj" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="opt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="color-mix(in oklab, var(--foreground) 6%, transparent)" vertical={false} />
        <XAxis dataKey="m" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}Cr`} width={42} />
        <Tooltip
          cursor={{ stroke: "var(--gold)", strokeOpacity: 0.4, strokeDasharray: 4 }}
          contentStyle={tooltipStyle}
          formatter={(v: number, name: string) => [`₹${v.toFixed(2)} Cr`, name === "projected" ? "Pre-optimisation" : "After Auralis"]}
          labelStyle={{ color: "var(--muted-foreground)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}
        />
        <Area type="monotone" dataKey="projected" stroke="var(--primary)" strokeWidth={1.5} fill="url(#proj)" />
        <Area type="monotone" dataKey="optimised" stroke="var(--gold)" strokeWidth={1.75} fill="url(#opt)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AllocationDonut() {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <PieChart>
        <Pie
          data={mockAllocation}
          dataKey="value"
          innerRadius={62}
          outerRadius={88}
          paddingAngle={2}
          stroke="none"
        >
          {mockAllocation.map((d, i) => (
            <Cell key={i} fill={d.color} opacity={0.85} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v}%`, n]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RiskGauge({ score }: { score: number }) {
  const r = 64;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c * 0.75; // 3/4 arc
  return (
    <div className="relative h-44 w-44">
      <svg viewBox="0 0 160 160" className="-rotate-[135deg] h-full w-full">
        <circle cx="80" cy="80" r={r} fill="none" stroke="color-mix(in oklab, var(--foreground) 8%, transparent)" strokeWidth="6" strokeDasharray={`${c * 0.75} ${c}`} strokeLinecap="round" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="url(#gauge)"
          strokeWidth="6"
          strokeDasharray={`${c * 0.75} ${c}`}
          strokeDashoffset={offset - c * 0.25}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.2,0.7,0.2,1)" }}
        />
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-5xl gold-text leading-none">{score}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-2">of 100</p>
        </div>
      </div>
    </div>
  );
}

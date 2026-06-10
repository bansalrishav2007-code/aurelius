import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type DonutSlice = {
  name: string;
  value: number;
  color: string;
};

type AllocationDonutProps = {
  data: DonutSlice[];
  height?: number;
};

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: DonutSlice }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{item.name}</p>
      <p className="text-muted-foreground tabular-nums">{item.value}% of portfolio</p>
    </div>
  );
}

export function AllocationDonut({ data, height = 260 }: AllocationDonutProps) {
  const hasData = data.length > 0 && !(data.length === 1 && data[0].name === "No assets yet");

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={hasData ? 3 : 0}
            stroke="rgba(10, 14, 26, 0.6)"
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell key={`${entry.name}-${entry.color}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

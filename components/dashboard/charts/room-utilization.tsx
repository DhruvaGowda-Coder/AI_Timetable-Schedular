"use client";

import { memo, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomConstraint, TimetableVariant } from "@/lib/types";

interface RoomUtilizationChartProps {
    rooms: RoomConstraint[];
    dayCount: number;
    slotsPerDay: number;
    variant: TimetableVariant;
}

interface RoomTooltipPayload {
    name: string;
    usage: number;
    utilizationPct: number;
}

function truncateLabel(value: string, max = 12) {
    if (value.length <= max) return value;
    return `${value.slice(0, max - 3)}...`;
}

function RoomTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{ payload: RoomTooltipPayload }>;
}) {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
        <div className="rounded-md border bg-card/95 px-3 py-2 text-xs shadow-md backdrop-blur">
            <p className="font-medium text-brand-text">{data.name}</p>
            <p className="mt-1 text-brand-text-secondary">Usage: {data.usage}</p>
            <p className="text-brand-text-secondary">Utilization: {data.utilizationPct}%</p>
        </div>
    );
}

export const RoomUtilizationChart = memo(function RoomUtilizationChart({
    rooms,
    dayCount,
    slotsPerDay,
    variant,
}: RoomUtilizationChartProps) {
    const maxSlots = Math.max(0, dayCount * slotsPerDay);

    const data = useMemo(() => {
        const roomUsage = new Map<string, number>();
        variant.slots.forEach((slot) => {
            roomUsage.set(slot.room, (roomUsage.get(slot.room) || 0) + 1);
        });

        return rooms.map((room) => {
            const usage = roomUsage.get(room.name) || 0;
            const utilizationPct =
                maxSlots > 0 ? Math.min(100, Math.round((usage / maxSlots) * 100)) : 0;

            return {
            name: room.name,
            usage,
            utilizationPct,
            capacity: room.capacity,
        };
        });
    }, [rooms, variant.slots, maxSlots]);

    const peakRoom = useMemo(
        () =>
            data.reduce(
                (best, room) => (room.usage > best.usage ? room : best),
                { name: "-", usage: 0, utilizationPct: 0, capacity: 0 }
            ),
        [data]
    );

    const chartMinWidth = useMemo(() => Math.max(280, data.length * 36), [data.length]);

    return (
        <Card className="surface-card">
            <CardHeader className="pb-2">
                <CardTitle>Room Utilization</CardTitle>
                <p className="text-xs text-brand-text-secondary">
                    Most used room: {peakRoom.name} ({peakRoom.usage} slots)
                </p>
            </CardHeader>
            <CardContent>
                <div className="thin-scrollbar overflow-x-auto">
                    <div className="h-[300px]" style={{ minWidth: `${chartMinWidth}px` }}>
                        <ResponsiveContainer width="100%" height="100%" debounce={120}>
                            <BarChart data={data} margin={{ top: 10, right: 16, left: -20, bottom: 40 }}>
                                <defs>
                                    <linearGradient id="room-usage-gradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#5D9DE6" stopOpacity={0.95} />
                                        <stop offset="95%" stopColor="#346EB6" stopOpacity={0.9} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120,145,180,0.25)" />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    axisLine={false}
                                    interval={0}
                                    angle={-45}
                                    textAnchor="end"
                                    height={55}
                                    tickFormatter={(value: string) => truncateLabel(value, 15)}
                                    tick={{ fill: "#a1a1aa", fontSize: 11, dy: 10, dx: -5 }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                    tick={{ fill: "#a1a1aa", fontSize: 11, dx: -4 }}
                                />
                                <Tooltip cursor={{ fill: "rgba(79,141,214,0.08)" }} content={<RoomTooltip />} />
                                <Bar
                                    dataKey="usage"
                                    fill="url(#room-usage-gradient)"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={42}
                                    isAnimationActive={false}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground text-center">
                    Total available slots per room: {maxSlots}
                </p>
            </CardContent>
        </Card>
    );
});



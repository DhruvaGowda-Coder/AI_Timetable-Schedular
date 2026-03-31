"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FacultyConstraint, TimetableVariant } from "@/lib/types";

interface FacultyWorkloadChartProps {
    faculties: FacultyConstraint[];
    variant: TimetableVariant;
}

const MAX_VISIBLE_FACULTY_SLICES = 8;
const COLORS = [
    "#3B82F6",
    "#14B8A6",
    "#F59E0B",
    "#F97316",
    "#818CF8",
    "#84CC16",
    "#22C55E",
    "#A78BFA",
    "#06B6D4",
    "#FB7185",
];

interface FacultyTooltipPayload {
    name: string;
    value: number;
}

function FacultyTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{ payload: FacultyTooltipPayload }>;
}) {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
        <div className="rounded-md border bg-card/95 px-3 py-2 text-xs shadow-md backdrop-blur">
            <p className="font-medium text-brand-text">{data.name}</p>
            <p className="mt-1 text-brand-text-secondary">Assigned classes: {data.value}</p>
        </div>
    );
}

export const FacultyWorkloadChart = memo(function FacultyWorkloadChart({
    faculties,
    variant,
}: FacultyWorkloadChartProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const handleSliceEnter = useCallback((_data: unknown, index: number) => {
        setActiveIndex((prev) => (prev === index ? prev : index));
    }, []);
    const handleSliceLeave = useCallback(() => {
        setActiveIndex(null);
    }, []);

    const fullData = useMemo(() => {
        const facultyLoad = new Map<string, number>();
        variant.slots.forEach((slot) => {
            facultyLoad.set(slot.faculty, (facultyLoad.get(slot.faculty) || 0) + 1);
        });

        return faculties
            .map((faculty) => ({
                name: faculty.name,
                value: facultyLoad.get(faculty.name) || 0,
            }))
            .filter((d) => d.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [faculties, variant.slots]);

    const chartData = useMemo(() => {
        if (fullData.length <= MAX_VISIBLE_FACULTY_SLICES) return fullData;
        const visible = fullData.slice(0, MAX_VISIBLE_FACULTY_SLICES - 1);
        const othersValue = fullData
            .slice(MAX_VISIBLE_FACULTY_SLICES - 1)
            .reduce((sum, item) => sum + item.value, 0);
        return [...visible, { name: "Others", value: othersValue }];
    }, [fullData]);

    const totalAssignedClasses = useMemo(
        () => chartData.reduce((sum, item) => sum + item.value, 0),
        [chartData]
    );

    if (chartData.length === 0) {
        return (
            <Card className="surface-card">
                <CardHeader>
                    <CardTitle>Faculty Workload Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[300px] items-center justify-center text-sm text-brand-text-secondary">
                        Generate a variant to view faculty workload distribution.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="surface-card">
            <CardHeader className="pb-2">
                <CardTitle>Faculty Workload Distribution</CardTitle>
                <p className="text-xs text-brand-text-secondary">
                    Total assigned classes: {totalAssignedClasses}
                </p>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="46%"
                                innerRadius={68}
                                outerRadius={96}
                                fill="#4f8dd6"
                                paddingAngle={1}
                                dataKey="value"
                                isAnimationActive={false}
                                onMouseEnter={handleSliceEnter}
                                onMouseLeave={handleSliceLeave}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${entry.name}-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                        fillOpacity={
                                            activeIndex === null || activeIndex === index ? 1 : 0.45
                                        }
                                        stroke={activeIndex === index ? "rgba(255,255,255,0.95)" : "transparent"}
                                        strokeWidth={activeIndex === index ? 2 : 0}
                                        style={{
                                            transition: "fill-opacity 140ms ease, stroke-width 140ms ease",
                                        }}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                content={<FacultyTooltip />}
                                cursor={false}
                                isAnimationActive={false}
                                wrapperStyle={{ pointerEvents: "none" }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
                    {chartData.map((entry, index) => (
                        <div
                            key={`${entry.name}-${index}`}
                            className="flex cursor-default items-center gap-1.5 rounded-sm px-1 text-brand-text-secondary transition-colors"
                            onMouseEnter={() => setActiveIndex(index)}
                            onMouseLeave={handleSliceLeave}
                            style={{
                                backgroundColor:
                                    activeIndex === index ? "rgba(79, 141, 214, 0.12)" : "transparent",
                            }}
                        >
                            <span
                                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="truncate" title={`${entry.name}: ${entry.value}`}>
                                {entry.name}: {entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
});



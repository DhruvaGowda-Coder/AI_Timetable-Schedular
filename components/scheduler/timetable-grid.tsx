"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TimetableSlot } from "@/lib/types";

interface TimetableGridProps {
  days: string[];
  slotLabels: string[];
  slots: TimetableSlot[];
  animate?: boolean;
}

export function TimetableGrid({
  days,
  slotLabels,
  slots,
  animate = true,
}: TimetableGridProps) {
  const content = (
    <div className="thin-scrollbar max-h-[500px] overflow-auto rounded-md border border-slate-900/90 dark:border-slate-500/70">
      <Table className="border-collapse">
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="w-36 min-w-[140px] border border-slate-900/90 bg-slate-100/80 text-brand-text dark:border-slate-500/70 dark:bg-slate-800/65">
              Day
            </TableHead>
            {slotLabels.map((label) => (
              <TableHead
                key={label}
                className="min-w-[130px] border border-slate-900/90 bg-slate-100/80 text-brand-text dark:border-slate-500/70 dark:bg-slate-800/65"
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {days.map((day, rowIndex) => (
            <TableRow
              key={day}
              className={
                rowIndex % 2
                  ? "bg-slate-50/75 hover:bg-slate-50/75 dark:bg-slate-900/25 dark:hover:bg-slate-900/25"
                  : "hover:bg-transparent"
              }
            >
              <TableCell className="border border-slate-900/90 bg-slate-50/70 font-semibold text-brand-text dark:border-slate-500/70 dark:bg-slate-800/35">
                {day}
              </TableCell>
              {slotLabels.map((label) => {
                const slot = slots.find(
                  (s) => s.day === day && s.slotLabel === label
                );
                return (
                  <TableCell
                    key={`${day}-${label}`}
                    className="border border-slate-900/90 bg-white/95 align-top text-xs dark:border-slate-500/70 dark:bg-slate-900/20"
                  >
                    {slot ? (
                      <div>
                        <p className="font-semibold text-brand-text">
                          {slot.subject}
                        </p>
                        <p className="text-brand-text-secondary">
                          {slot.faculty}
                        </p>
                        <p className="text-muted-foreground">{slot.room}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (!animate) return content;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}



"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Info, XCircle } from "lucide-react";
import type { ConflictMessage } from "@/lib/conflict-explainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ConflictExplainerCardProps {
  messages: ConflictMessage[];
  onScrollToSection?: (section: string) => void;
}

const severityConfig = {
  error: {
    icon: XCircle,
    borderClass: "border-red-500/40",
    bgClass: "bg-red-500/5",
    iconClass: "text-red-400",
    textClass: "text-red-200/80 dark:text-red-200/80",
  },
  warning: {
    icon: AlertTriangle,
    borderClass: "border-amber-500/40",
    bgClass: "bg-amber-500/5",
    iconClass: "text-amber-400",
    textClass: "text-amber-200/80 dark:text-amber-200/80",
  },
  info: {
    icon: Info,
    borderClass: "border-blue-500/40",
    bgClass: "bg-blue-500/5",
    iconClass: "text-blue-400",
    textClass: "text-blue-200/80 dark:text-blue-200/80",
  },
};

export function ConflictExplainerCard({
  messages,
  onScrollToSection,
}: ConflictExplainerCardProps) {
  if (messages.length === 0) return null;

  const hasErrors = messages.some((m) => m.severity === "error");

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card
        className={`surface-card overflow-hidden ${
          hasErrors ? "border-red-500/30" : "border-amber-500/30"
        }`}
      >
        {/* Gradient top accent */}
        <div
          className={`h-[2px] w-full ${
            hasErrors
              ? "bg-gradient-to-r from-red-500 via-orange-500 to-amber-500"
              : "bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-400"
          }`}
        />
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-md ${
                hasErrors ? "bg-red-500/15" : "bg-amber-500/15"
              }`}
            >
              <AlertTriangle
                className={`h-3.5 w-3.5 ${
                  hasErrors ? "text-red-400" : "text-amber-400"
                }`}
              />
            </span>
            <h3 className="text-sm font-semibold text-brand-text">
              {hasErrors
                ? "Issues Found — Action Required"
                : "Suggestions to Improve Your Timetable"}
            </h3>
          </div>

          <div className="space-y-2">
            {messages.map((msg, i) => {
              const config = severityConfig[msg.severity];
              const Icon = config.icon;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-start gap-2.5 rounded-lg border ${config.borderClass} ${config.bgClass} px-3 py-2.5`}
                >
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconClass}`}
                  />
                  <p className={`flex-1 text-sm ${config.textClass}`}>
                    {msg.text}
                  </p>
                  {msg.action && onScrollToSection && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 shrink-0 gap-1 text-xs"
                      onClick={() => onScrollToSection(msg.action!.section)}
                    >
                      {msg.action.label}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}



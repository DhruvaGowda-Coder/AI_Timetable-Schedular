"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  width?: "fit-content" | "100%";
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "scale";
}

export const ScrollReveal = ({
  children,
  width = "fit-content",
  className,
  delay = 0.15,
  direction = "up",
}: ScrollRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check if user prefers reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const getInitialTransform = () => {
    switch (direction) {
      case "left": return "translateX(-24px)";
      case "right": return "translateX(24px)";
      case "scale": return "scale(0.95)";
      default: return "translateY(20px)";
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", width }} className={className}>
      <div
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0) translateX(0) scale(1)" : getInitialTransform(),
          filter: isVisible ? "blur(0px)" : "blur(6px)",
          transition: `opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, filter 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
          willChange: "opacity, transform, filter",
        }}
      >
        {children}
      </div>
    </div>
  );
};



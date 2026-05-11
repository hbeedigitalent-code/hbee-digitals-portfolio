"use client";

import { motion, useAnimation, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
}

export default function Reveal({
  children,
  delay = 0,
  direction = "up",
}: RevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const controls = useAnimation();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      controls.set("visible");
    } else if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls, prefersReducedMotion]);

  // If the user prefers reduced motion, render children immediately without any wrapper animation.
  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  // Offsets based on direction
  const hiddenOffset =
    direction === "up"
      ? { y: 32, x: 0 }
      : direction === "left"
      ? { x: -32, y: 0 }
      : { x: 32, y: 0 }; // right

  return (
    <motion.div
      ref={ref}
      variants={{
        hidden: { opacity: 0, ...hiddenOffset },
        visible: { opacity: 1, y: 0, x: 0 },
      }}
      initial="hidden"
      animate={controls}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}
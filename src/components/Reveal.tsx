"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  variant?: "fade" | "wipe" | "slide";
  delay?: number;
  duration?: number;
  direction?: "up" | "left" | "right";
}

export default function Reveal({
  children,
  variant = "fade",
  delay = 0,
  duration = 0.7,
  direction = "up",
}: RevealProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reducedMotion = useReducedMotion();

  if (reducedMotion) return <>{children}</>;

  const fadeVariants = {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } },
  };

  const wipeVariants = {
    hidden: { clipPath: "inset(100% 0% 0% 0%)", opacity: 1 },
    visible: {
      clipPath: "inset(0% 0% 0% 0%)",
      opacity: 1,
      transition: { duration, delay, ease: [0.76, 0, 0.24, 1] },
    },
  };

  const slideDir = {
    up: { hidden: { opacity: 0, y: 48 }, visible: { opacity: 1, y: 0 } },
    left: { hidden: { opacity: 0, x: -48 }, visible: { opacity: 1, x: 0 } },
    right: { hidden: { opacity: 0, x: 48 }, visible: { opacity: 1, x: 0 } },
  };

  const slideVariants = {
    hidden: slideDir[direction].hidden,
    visible: {
      ...slideDir[direction].visible,
      transition: { duration, delay, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const variants =
    variant === "wipe"
      ? wipeVariants
      : variant === "slide"
      ? slideVariants
      : fadeVariants;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}
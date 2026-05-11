"use client";

import { motion } from "framer-motion";

export default function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--primary-color)]"
      role="progressbar"
      aria-busy="true"
      aria-label="Page loading"
    >
      <motion.img
        src="/svgs/logo.svg"
        alt="Hbee Digitals logo"
        className="h-16 w-auto md:h-20"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
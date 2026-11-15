"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button, Modal } from "@/components/ui";

export function LevelUpModal({
  level,
  onClose,
}: {
  level: number | null;
  onClose: () => void;
}) {
  return (
    <Modal open={level !== null} onClose={onClose} title="">
      <div className="flex flex-col items-center py-4 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="relative flex size-28 items-center justify-center rounded-3xl border-2 border-ink bg-limey shadow-pop"
        >
          <span className="font-display text-5xl font-extrabold">{level}</span>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.span
              key={i}
              className="absolute"
              initial={{ opacity: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                x: Math.cos((i * Math.PI) / 3) * 84,
                y: Math.sin((i * Math.PI) / 3) * 84,
              }}
              transition={{ duration: 1.4, delay: 0.15 + i * 0.08, repeat: 2 }}
            >
              <Sparkles className="size-5 text-viola" />
            </motion.span>
          ))}
        </motion.div>
        <h3 className="mt-6 font-display text-3xl font-extrabold tracking-tight">
          ¡Subiste al nivel {level}!
        </h3>
        <p className="mt-2 max-w-xs text-sm font-medium text-ink-soft">
          La constancia paga. Revisa tus recompensas: puede que haya un avatar
          nuevo esperándote.
        </p>
        <Button className="mt-6" size="lg" onClick={onClose}>
          A seguir moviéndose
        </Button>
      </div>
    </Modal>
  );
}

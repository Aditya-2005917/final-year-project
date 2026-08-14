import { motion } from "framer-motion";
import * as variants from "./motionVariants";

export function FadeInUp({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      variants={variants.fadeInUp}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      variants={variants.scaleIn}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className = "" }) {
  return (
    <motion.div
      variants={variants.staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }) {
  return (
    <motion.div variants={variants.cardVariant} className={className}>
      {children}
    </motion.div>
  );
}
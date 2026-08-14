// src/components/ui/motionVariants.js

/* ========================
   BASIC FADE & SLIDE
======================== */

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  exit: { opacity: 0, transition: { duration: 0.25 } }
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }
  },
  exit: { opacity: 0, y: 12, transition: { duration: 0.25 } }
};

export const fadeInDown = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

export const fadeInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

export const fadeInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

/* ========================
   SCALE
======================== */

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

export const scaleInCenter = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 24 
    }
  }
};

/* ========================
   STAGGER CONTAINERS
======================== */

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

export const staggerFast = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
};

export const staggerSlow = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.15
    }
  }
};

/* ========================
   CARD & LIST ITEMS
======================== */

export const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

export const listItem = {
  hidden: { opacity: 0, x: -12 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  }
};

/* ========================
   SPECIAL EFFECTS
======================== */

export const popIn = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 18 
    }
  }
};

export const slideUpFade = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5, 
      ease: [0.22, 1, 0.36, 1] 
    }
  }
};

export const blurIn = {
  hidden: { opacity: 0, filter: "blur(8px)" },
  visible: { 
    opacity: 1, 
    filter: "blur(0px)",
    transition: { duration: 0.5 }
  }
};

/* ========================
   PAGE TRANSITIONS
======================== */

export const pageTransition = {
  hidden: { opacity: 0, y: 16 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    y: -12,
    transition: { duration: 0.25 }
  }
};

/* ========================
   HOVER & TAP (for buttons)
======================== */

export const buttonHover = {
  scale: 1.03,
  transition: { duration: 0.2 }
};

export const buttonTap = {
  scale: 0.97
};

export const cardHover = {
  y: -4,
  transition: { duration: 0.25 }
};
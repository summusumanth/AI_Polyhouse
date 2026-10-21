import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export default function Modal({ open, title, onClose, children, wide = false }) {
  // Esc closes, and the page behind should not scroll while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const dialog = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className={`modal${wide ? " modal-wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 28, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row-between" style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: "1.15rem" }}>{title}</h3>
              <button className="btn btn-quiet btn-icon" onClick={onClose} aria-label="Close">
                <X size={17} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /*
    Rendered into <body>, not where it is written in the tree.

    A `position: fixed` element is positioned against the viewport only while
    no ancestor establishes a containing block. backdrop-filter does exactly
    that, and the navbar uses one, so a modal opened from the navbar was
    being trapped inside the 69px header and showed as a thin strip. The same
    would happen under any ancestor with transform, filter or will-change.
    A portal puts the dialog outside all of them, wherever it is opened from.
  */
  if (typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}

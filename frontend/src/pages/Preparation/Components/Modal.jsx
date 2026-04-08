import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const Modal = ({ children, isOpen, onClose, title, hideHeader, isDark, isLoading }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-50 flex justify-center items-start overflow-y-auto w-full h-full px-3 sm:px-4 py-4 sm:py-8 ${isLoading ? 'bg-transparent' : (isDark ? 'bg-black/50' : 'bg-black/30')
            }`}
          onClick={onClose}
        >
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className={`relative mt-2 sm:mt-4 flex w-full max-w-[min(96vw,44rem)] flex-col rounded-3xl shadow-xl overflow-hidden ${isLoading ? 'bg-transparent shadow-none' : (isDark ? 'bg-black/90' : 'bg-white')
              }`}
            style={{ maxHeight: "calc(100vh - 2rem)" }}
          >
            {/* Modal Header */}
            {!hideHeader && (
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 pr-14 border-b border-gray-200 bg-inherit backdrop-blur-sm">
                <h3 className="md:text-lg font-medium text-gray-900">{title}</h3>
              </div>
            )}

            {!isLoading && (
              <button
                type="button"
                className={`${isDark ? 'text-gray-300 hover:bg-white/10 hover:text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'} bg-transparent rounded-full text-sm w-10 h-10 flex justify-center items-center absolute top-3 right-3 cursor-pointer transition-all duration-200 z-20`}
                onClick={onClose}
                aria-label="Close modal"
              >
                <svg
                  className="w-4 h-4"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 14 14"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M1 1l6 6m0 0l6 6M7 7l6-6M7 7l-6 6"
                  />
                </svg>
              </button>
            )}

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;

import React from "react";
import { motion } from "framer-motion";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";

interface PageWrapperProps {
  children: React.ReactNode;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-transparent relative flex flex-col">
      <TopBar />
      <div className="flex flex-1 pt-[60px]">
        <Sidebar />
        <main className="flex-1 pl-16 w-full min-h-[calc(100vh-60px)] overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="p-6 h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

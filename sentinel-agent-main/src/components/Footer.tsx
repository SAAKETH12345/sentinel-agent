import React from 'react';
import { Github, Linkedin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-[#030712]/95 pt-6 pb-20 sm:pb-20 px-4 sm:px-8 text-slate-400 font-mono relative z-20 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left side (or top on mobile): Copyright text */}
        <div className="text-slate-500 text-xs text-center md:text-left">
          © 2026 SentinelAgent. All rights reserved.
        </div>

        {/* Center / Right side: Developer attribution and profile links */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs">
          <span className="text-slate-300 font-medium tracking-wide">
            Developed by Saaketh Kazipeta &amp; Lalitha Subramanyam
          </span>

          <div className="flex items-center gap-4">
            {/* Saaketh Kazipeta Links */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-bold">Saaketh:</span>
              <a
                href="https://github.com/SAAKETH12345"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Saaketh Kazipeta GitHub"
                className="text-slate-400 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all duration-300"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/in/kazipeta-saaketh/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Saaketh Kazipeta LinkedIn"
                className="text-slate-400 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all duration-300"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>

            {/* Lalitha Subramanyam Links */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-bold">Lalitha:</span>
              <a
                href="https://github.com/lalithasubramanyam"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Lalitha Subramanyam GitHub"
                className="text-slate-400 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all duration-300"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/in/lalitha-subramanyam-674575262/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Lalitha Subramanyam LinkedIn"
                className="text-slate-400 hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all duration-300"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

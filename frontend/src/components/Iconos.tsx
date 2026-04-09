import React from "react";

interface IconoProps {
  className?: string;
}

export const IconoCampana: React.FC<IconoProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const IconoCampanaConPunto: React.FC<IconoProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    <circle cx="19" cy="5" r="3" fill="#e74c3c" stroke="none" />
  </svg>
);

export const IconoCheck: React.FC<IconoProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const IconoX: React.FC<IconoProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconoEstrella: React.FC<IconoProps & { filled?: boolean }> = ({ className, filled }) => (
  <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const IconoWhatsApp: React.FC<IconoProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.91-9.91-9.91zm3.66 13.97c-.2.56-1.14 1.03-1.79 1.07-.47.03-.93.07-2.27-.49-1.34-.56-2.2-1.98-2.26-2.07-.06-.09-.53-.71-.53-1.35 0-.64.34-.95.46-1.08.12-.13.26-.16.35-.16.09 0 .18.01.26.08.07.06.31.38.44.54.13.16.22.27.37.27.15 0 .25-.08.35-.27.1-.19.44-1.53.5-1.75.06-.22.03-.36-.07-.47-.08-.09-.21-.11-.3-.11-.09 0-.21.01-.33.06-.12.05-.42.21-.66.66-.24.45-.28 1.2.08 1.88.36.68 1.44 2.36 1.44 2.36s.37.59.12.92c-.25.33-.61.4-.81.4-.2 0-.37-.06-.52-.19-.2-.16-.62-.54-.88-.99-.26-.45-.45-1.07-.32-1.73.13-.66.55-1.16.55-1.16s.4-.45.73-.59c.33-.14.52-.09.67-.05.15.04.27.14.35.25.08.11.18.3.18.3s.23.66.32.93c.09.27.14.56-.04.81-.18.25-.4.34-.5.37-.1.03-.14.05-.21.12-.07.07-.01.16.02.21.03.05.1.16.24.3.19.19.48.43.89.58.52.19 1.01.16 1.32.03.31-.13.46-.34.52-.43.06-.09.1-.19.13-.31.03-.12.01-.23-.06-.32-.07-.09-.27-.24-.55-.41-.28-.17-.58-.27-.71-.41-.13-.14-.1-.26-.06-.34.04-.08.1-.15.18-.21.08-.06.32-.22.46-.31.14-.09.28-.12.4-.1.12.02.25.06.38.16.13.1.23.24.31.4.08.16.13.35.16.55.03.2.01.41-.04.61z"/>
  </svg>
);
import React from "react";

export const CinematicBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden -z-50 bg-[#07101f]">
      {/* Ocean Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url("/background.png")`,
        }}
      />

      {/* Deep Ocean Permanent Overlay Gradient */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(7, 16, 31, 0.88) 0%, rgba(7, 16, 31, 0.68) 50%, rgba(7, 16, 31, 0.92) 100%)"
        }}
      />
    </div>
  );
};
export default CinematicBackground;

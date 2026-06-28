import { useEffect, useState } from "react";

export function useCountUp(target: number, duration = 1200): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = Number(target) || 0;
    
    if (end === 0) {
      setCount(0);
      return;
    }

    const startTime = performance.now();
    let animId: number;

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic easeOut formula
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setCount(Math.floor(easeOut * end));

      if (progress < 1) {
        animId = requestAnimationFrame(update);
      } else {
        setCount(end);
      }
    };

    animId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animId);
  }, [target, duration]);

  return count;
}

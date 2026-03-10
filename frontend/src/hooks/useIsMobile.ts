import { useEffect, useState } from "react";
import { LAYOUT } from "../config/layout";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= LAYOUT.MOBILE_BREAKPOINT);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= LAYOUT.MOBILE_BREAKPOINT);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

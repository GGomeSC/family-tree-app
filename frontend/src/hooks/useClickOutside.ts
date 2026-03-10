import { RefObject, useEffect } from "react";

export function useClickOutside(ref: RefObject<HTMLElement | null>, onClickOutside: () => void) {
  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [ref, onClickOutside]);
}

import { useEffect, useState } from "react";
import { api } from "../api/client";
import { AuthState } from "../types";

export function useAuthStatus() {
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    let isMounted = true;

    api
      .me()
      .then(() => {
        if (isMounted) {
          setAuthState("authenticated");
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthState("anonymous");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    authState,
    isAuthenticated: authState === "authenticated",
    setAuthState,
  };
}

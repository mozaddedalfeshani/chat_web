"use client";

import { useEffect, useState } from "react";

/** Follows the `data-theme` attribute the theme toggle writes on `<html>`. */
export function useIsDark() {
  const [dark, setDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-theme") !== "light",
  );

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.getAttribute("data-theme") !== "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return dark;
}

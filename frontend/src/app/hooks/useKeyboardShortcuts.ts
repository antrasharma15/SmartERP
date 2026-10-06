"use client";

import { useEffect, useRef } from "react";
import { useShortcutContext, ShortcutDefinition } from "../context/ShortcutContext";

export interface ShortcutConfig {
  keys: string; // e.g. "Alt+A", "Ctrl+Enter", "F8", "Escape", "ArrowUp", "Enter"
  action: (e: KeyboardEvent) => void;
  description: string;
  category?: "Global" | "Page Actions";
}

export const useKeyboardShortcuts = (configs: ShortcutConfig[]) => {
  const { registerShortcut, unregisterShortcut } = useShortcutContext();
  
  // Use a ref to store the latest configs so that the keydown event listener
  // always has access to the newest action closures without re-subscribing.
  const configsRef = useRef<ShortcutConfig[]>(configs);

  useEffect(() => {
    configsRef.current = configs;
  });

  useEffect(() => {
    const registeredConfigs = Array.isArray(configsRef.current) ? configsRef.current : [];

    // 1. Register with global context for "?" cheat sheet display
    registeredConfigs.forEach((cfg) => {
      if (!cfg || typeof cfg.keys !== "string") return;
      registerShortcut({
        keys: cfg.keys,
        description: cfg.description || "",
        category: cfg.category || "Page Actions"
      });
    });

    // Helper to match event keys
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard against synthetic, IME, or system events without a valid key string
      if (!e || typeof e.key !== "string") return;

      const isTyping = 
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "SELECT" || 
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true";

      const currentConfigs = Array.isArray(configsRef.current) ? configsRef.current : [];

      // Parse and match each registered config
      for (const cfg of currentConfigs) {
        if (!cfg || typeof cfg.keys !== "string") continue;

        const parts = cfg.keys.toLowerCase().split("+").map(p => p.trim());
        const hasAlt = parts.includes("alt");
        const hasCtrl = parts.includes("ctrl");
        const hasShift = parts.includes("shift");
        
        // Find key literal name
        const keyName = parts.find(p => p !== "alt" && p !== "ctrl" && p !== "shift");
        if (!keyName) continue;

        const eventKey = e.key.toLowerCase();

        // Match modifiers. metaKey must always be clear: nothing here binds
        // Cmd, so Cmd+K on macOS must not fire a "Ctrl+K" or bare "k" handler.
        const altMatch = e.altKey === hasAlt;
        const ctrlMatch = e.ctrlKey === hasCtrl;
        const shiftMatch = e.shiftKey === hasShift;
        if (e.metaKey) continue;

        // Match key code
        let keyMatch = false;
        if (keyName === "enter" && eventKey === "enter") keyMatch = true;
        else if (keyName === "escape" && eventKey === "escape") keyMatch = true;
        else if (keyName === "arrowup" && eventKey === "arrowup") keyMatch = true;
        else if (keyName === "arrowdown" && eventKey === "arrowdown") keyMatch = true;
        else if (keyName === "delete" && eventKey === "delete") keyMatch = true;
        else if (keyName === "tab" && eventKey === "tab") keyMatch = true;
        else if (keyName === eventKey) keyMatch = true;

        if (altMatch && ctrlMatch && shiftMatch && keyMatch) {
          // If the user is typing, we block keyboard shortcuts, 
          // EXCEPT for form submission triggers (like Ctrl+Enter)
          if (isTyping && cfg.keys.toLowerCase() !== "ctrl+enter") {
            continue;
          }

          e.preventDefault();
          cfg.action(e);
          break; // Match found, stop processing other shortcuts in this event
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Cleanup: remove listener & unregister descriptions using captured original configs
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      // Pass the description so unmounting one page that binds "Escape" does
      // not strip every other "Escape" entry from the cheat sheet.
      registeredConfigs.forEach((cfg) => {
        if (cfg && typeof cfg.keys === "string") {
          unregisterShortcut(cfg.keys, cfg.description);
        }
      });
    };
    // stable context methods don't change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerShortcut, unregisterShortcut]);
};

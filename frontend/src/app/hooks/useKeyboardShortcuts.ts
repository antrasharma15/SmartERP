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
    const registeredConfigs = configsRef.current;

    // 1. Register with global context for "?" cheat sheet display
    registeredConfigs.forEach((cfg) => {
      registerShortcut({
        keys: cfg.keys,
        description: cfg.description,
        category: cfg.category || "Page Actions"
      });
    });

    // Helper to match event keys
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = 
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "SELECT" || 
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true";

      // Parse and match each registered config
      for (const cfg of configsRef.current) {
        const parts = cfg.keys.toLowerCase().split("+");
        const hasAlt = parts.includes("alt");
        const hasCtrl = parts.includes("ctrl");
        const hasShift = parts.includes("shift");
        
        // Find key literal name
        const keyName = parts.find(p => p !== "alt" && p !== "ctrl" && p !== "shift");
        if (!keyName) continue;

        const eventKey = e.key.toLowerCase();

        // Match modifiers
        const altMatch = e.altKey === hasAlt;
        const ctrlMatch = e.ctrlKey === hasCtrl;
        const shiftMatch = e.shiftKey === hasShift;

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
          if (isTyping && cfg.keys !== "Ctrl+Enter" && cfg.keys !== "Ctrl+enter") {
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
      registeredConfigs.forEach((cfg) => {
        unregisterShortcut(cfg.keys);
      });
    };
    // stable context methods don't change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerShortcut, unregisterShortcut]);
};

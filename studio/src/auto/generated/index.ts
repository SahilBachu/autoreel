import type * as React from "react";

// AUTO-MAINTAINED registry of per-video bespoke scene components.
// The studio agent (bot/src/lib/studio.ts) writes component files next to this and registers
// them here. AutoReel resolves {"kind":"custom","name":X} via GENERATED[X]. Keep type-safe.

export const GENERATED: Record<string, React.FC<any>> = {};

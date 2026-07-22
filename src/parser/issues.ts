// Helpers for building validation findings with a consistent shape.

import type { ValidationError, Warning } from '../schema/index.js';

interface IssueParts {
  segment?: string | null;
  field?: string | null;
  sourceLine?: number | null;
}

export function blockingError(message: string, parts: IssueParts = {}): ValidationError {
  return {
    message,
    segment: parts.segment ?? null,
    field: parts.field ?? null,
    sourceLine: parts.sourceLine ?? null,
  };
}

export function warning(message: string, parts: IssueParts = {}): Warning {
  return {
    message,
    segment: parts.segment ?? null,
    field: parts.field ?? null,
    sourceLine: parts.sourceLine ?? null,
  };
}

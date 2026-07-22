// Schema — types and constants for Settle In's class model.
//
// This mirrors docs/class-format.md § Normalized ClassDefinition. The app stores
// both the original Markdown and a normalized, immutable ClassDefinition derived
// from it. Runtime segments are the authored plan expanded one-per-teaching-unit
// (grounding, each non-bilateral pose, each side of a bilateral pose, transitions,
// savasana), with planned durations in integer seconds and cumulative offsets.

// Run events, run-state types, and event-sample types (M2). Additive extension.
export * from './run.js';

/** Class-input schema version. Only v1 is supported; a higher version is rejected intact. */
export const SUPPORTED_SCHEMA_VERSION = 1;

/** As-taught export schema version (versioned independently of the class input). */
export const EXPORT_SCHEMA_VERSION = 1;

/** For v1 the canonical class is Tuesday 19:00–20:00. */
export const CANONICAL_SCHEDULED_START_LOCAL = '19:00';
export const CANONICAL_HARD_CLOSE_LOCAL = '20:00';

/** Sides supported by schema v1. */
export type Side = 'right' | 'left';
export const SUPPORTED_SIDES: readonly Side[] = ['right', 'left'];

export type SegmentType = 'grounding' | 'pose' | 'transition' | 'savasana';

// --- Authored segments (the plan as written) -------------------------------

export interface AuthoredGrounding {
  readonly type: 'grounding';
  readonly id: string;
  readonly name: string;
  readonly durationMin: number;
  readonly themeAnchor: string;
  readonly yinPrinciples: readonly string[];
  readonly guidedSilentRatio: string;
}

export interface AuthoredPose {
  readonly type: 'pose';
  readonly id: string;
  readonly name: string;
  readonly bilateral: boolean;
  /** Present for non-bilateral poses only. */
  readonly durationMin: number | null;
  /** Present for bilateral poses only. */
  readonly durationPerSideMin: number | null;
  /** Present for bilateral poses only; exactly two distinct sides. */
  readonly sideOrder: readonly Side[] | null;
  readonly entry: string;
  readonly target: string;
  readonly settling: string;
  readonly midpoint: string;
  readonly props: string;
  readonly alternative: string;
  readonly exit: string;
  readonly notes: string;
}

export interface AuthoredTransition {
  readonly type: 'transition';
  readonly id: string;
  readonly name: string;
  readonly durationMin: number;
  readonly nextSegmentId: string;
  readonly setup: string;
  readonly alternativeOffer: string;
}

export interface AuthoredSavasana {
  readonly type: 'savasana';
  readonly id: string;
  readonly name: string;
  readonly durationMin: number;
  readonly steps: readonly string[];
  readonly wakeMessage: string;
}

export type AuthoredSegment =
  | AuthoredGrounding
  | AuthoredPose
  | AuthoredTransition
  | AuthoredSavasana;

// --- Expanded runtime segments (the plan the room runs) --------------------

export interface ExpandedSegment {
  /** Stable expanded ID, e.g. `sleeping-swan--right` for a bilateral side. */
  readonly id: string;
  /** Parent authored-segment ID. */
  readonly parentId: string;
  readonly type: SegmentType;
  /** Display name shown on screen. */
  readonly name: string;
  /** Side for bilateral side-segments; null otherwise. */
  readonly side: Side | null;
  readonly plannedDurationSec: number;
  /** Sum of all earlier expanded runtime-segment durations. */
  readonly plannedOffsetSec: number;
  /** Display and cue fields required by this segment's screen. */
  readonly cues: Readonly<Record<string, string | readonly string[]>>;
}

// --- Normalized ClassDefinition --------------------------------------------

export interface ClassDefinition {
  readonly schemaVersion: number;
  readonly classId: string;
  readonly revisionId: string;
  readonly sourceHash: string;
  readonly title: string;
  readonly date: string;
  readonly scheduledStartLocal: string;
  readonly hardCloseLocal: string;
  readonly themeLine: string;
  readonly feltSense: string;
  readonly peakPoseId: string;
  readonly props: readonly string[];
  readonly roomSetup: readonly string[];
  readonly arrival: string;
  readonly breathwork: string;
  readonly authoredSegments: readonly AuthoredSegment[];
  readonly expandedRuntimeSegments: readonly ExpandedSegment[];
  readonly plannedDurationSec: number;
  readonly originalMarkdown: string;
}

// --- Validation results ----------------------------------------------------

/**
 * A single validation finding. `segment` and `field` locate the finding in the
 * authored class; `sourceLine` is the 1-based line in the original Markdown when
 * the parser can determine it honestly, and null when it genuinely cannot.
 */
export interface ValidationIssue {
  readonly message: string;
  readonly segment: string | null;
  readonly field: string | null;
  readonly sourceLine: number | null;
}

/** Blocking errors prevent import. */
export type ValidationError = ValidationIssue;
/** Warnings never block; they protect the two-second-glance principle. */
export type Warning = ValidationIssue;

/** Human-readable summary shown before saving (docs/class-format.md § Import summary). */
export interface ImportSummary {
  readonly title: string;
  readonly date: string;
  readonly scheduledStartLocal: string;
  readonly hardCloseLocal: string;
  readonly plannedDurationSec: number;
  readonly plannedDurationMin: number;
  readonly authoredPoseCount: number;
  readonly teachingSideCount: number;
  readonly transitionCount: number;
  readonly savasanaDurationSec: number;
  readonly peakPoseName: string;
  readonly props: readonly string[];
  readonly roomSetup: readonly string[];
  readonly warningCount: number;
}

/**
 * The result of the import pipeline. On success a ClassDefinition and summary are
 * present; warnings may still be present. On failure blocking errors explain what
 * to correct, and the original source is always retained for editing or copying.
 */
export type ImportResult =
  | {
      readonly ok: true;
      readonly classDefinition: ClassDefinition;
      readonly warnings: readonly Warning[];
      readonly summary: ImportSummary;
      readonly originalMarkdown: string;
    }
  | {
      readonly ok: false;
      readonly errors: readonly ValidationError[];
      readonly warnings: readonly Warning[];
      readonly sourceHash: string | null;
      readonly originalMarkdown: string;
    };

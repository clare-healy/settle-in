// Normalization and validation.
//
// Given the parsed front matter and segment blocks, this builds the normalized
// ClassDefinition and applies every blocking rule and warning from
// docs/class-format.md (§ Sequence validation, § Copy guidance, per-section field
// rules) plus the review-ratified schedule and wake-message warnings.
//
// Blocking errors and warnings are kept separate. When any blocking error is
// present the ClassDefinition is null and duration-derived warnings are withheld,
// because a planned duration cannot be trusted until the durations parse.

import {
  type AuthoredGrounding,
  type AuthoredPose,
  type AuthoredSavasana,
  type AuthoredSegment,
  type AuthoredTransition,
  type ClassDefinition,
  type ExpandedSegment,
  type ImportSummary,
  type Side,
  type ValidationError,
  type Warning,
  CANONICAL_SCHEDULED_START_LOCAL,
  SUPPORTED_SCHEMA_VERSION,
  SUPPORTED_SIDES,
} from '../schema/index.js';
import type { SplitBlock } from './container.js';
import type { ParsedBlock } from './yaml-block.js';
import { blockingError, warning } from './issues.js';

export interface NormalizeInput {
  readonly h1Title: string;
  readonly frontMatter: ParsedBlock;
  readonly frontMatterStartLine: number;
  readonly segments: readonly { readonly split: SplitBlock; readonly parsed: ParsedBlock }[];
  readonly sourceHash: string;
  readonly originalMarkdown: string;
}

export interface NormalizeOutput {
  readonly classDefinition: ClassDefinition | null;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly Warning[];
  readonly summary: ImportSummary | null;
  /** True when schema_version is an unsupported future version (C7). */
  readonly schemaRejected: boolean;
}

const FRONT_MATTER_KEYS = [
  'schema_version', 'class_id', 'title', 'date', 'scheduled_start_local', 'hard_close_local',
  'theme_line', 'felt_sense', 'peak_pose_id', 'props', 'room_setup', 'arrival', 'breathwork',
];
const GROUNDING_KEYS = ['id', 'duration_min', 'theme_anchor', 'yin_principles', 'guided_silent_ratio'];
const POSE_KEYS = ['id', 'bilateral', 'duration_min', 'duration_per_side_min', 'side_order',
  'entry', 'target', 'settling', 'midpoint', 'props', 'alternative', 'exit', 'notes'];
const TRANSITION_KEYS = ['id', 'duration_min', 'next_segment_id', 'setup', 'alternative_offer'];
const SAVASANA_KEYS = ['id', 'duration_min', 'steps', 'wake_message'];

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const POSE_CUE_FIELDS = ['entry', 'target', 'settling', 'midpoint', 'props', 'alternative', 'exit', 'notes'] as const;

interface SegCtx {
  seg: AuthoredSegment;
  label: string;
  headingLine: number;
  fieldLines: ReadonlyMap<string, number>;
  raw: Record<string, unknown>;
}

class Collector {
  readonly errors: ValidationError[] = [];
  readonly warnings: Warning[] = [];
  error(message: string, parts: { segment?: string | null; field?: string | null; sourceLine?: number | null }): void {
    this.errors.push(blockingError(message, parts));
  }
  warn(message: string, parts: { segment?: string | null; field?: string | null; sourceLine?: number | null }): void {
    this.warnings.push(warning(message, parts));
  }
}

export function normalizeAndValidate(input: NormalizeInput): NormalizeOutput {
  const c = new Collector();
  const fm = input.frontMatter.value;
  const fmLine = (key: string): number => input.frontMatter.fieldLines.get(key) ?? input.frontMatterStartLine;

  // --- C7: unsupported future schema version is rejected intact -------------
  const rawSchema = fm['schema_version'];
  if (typeof rawSchema === 'number' && Number.isInteger(rawSchema) && rawSchema !== SUPPORTED_SCHEMA_VERSION) {
    c.error(
      `This class needs schema version ${rawSchema}. Update Settle In before importing it; the file was not changed.`,
      { segment: 'Front matter', field: 'schema_version', sourceLine: fmLine('schema_version') },
    );
    return { classDefinition: null, errors: c.errors, warnings: c.warnings, summary: null, schemaRejected: true };
  }
  if (rawSchema !== SUPPORTED_SCHEMA_VERSION) {
    c.error('schema_version is required and must be 1.', {
      segment: 'Front matter', field: 'schema_version', sourceLine: fmLine('schema_version'),
    });
  }

  // --- Front matter ---------------------------------------------------------
  const classId = reqKebab(c, fm, 'class_id', 'Front matter', fmLine('class_id'));
  const title = reqNonEmpty(c, fm, 'title', 'Front matter', fmLine('title'));
  if (title !== null && input.h1Title.trim() !== title.trim()) {
    c.error('The H1 title and the front-matter title must match exactly.', {
      segment: 'Front matter', field: 'title', sourceLine: input.frontMatterStartLine,
    });
  }
  const date = reqDate(c, fm, 'date', fmLine('date'));
  const scheduledStart = reqTime(c, fm, 'scheduled_start_local', fmLine('scheduled_start_local'));
  const hardClose = reqHardClose(c, fm, scheduledStart, fmLine('hard_close_local'));
  const themeLine = reqNonEmpty(c, fm, 'theme_line', 'Front matter', fmLine('theme_line'));
  const feltSense = reqNonEmpty(c, fm, 'felt_sense', 'Front matter', fmLine('felt_sense'));
  const peakPoseId = reqNonEmpty(c, fm, 'peak_pose_id', 'Front matter', fmLine('peak_pose_id'));
  const props = reqStringList(c, fm, 'props', 'Front matter', fmLine('props'), { allowEmpty: false });
  const roomSetup = reqStringList(c, fm, 'room_setup', 'Front matter', fmLine('room_setup'), { allowEmpty: true });
  const arrival = reqNonEmpty(c, fm, 'arrival', 'Front matter', fmLine('arrival'));
  const breathwork = reqNonEmpty(c, fm, 'breathwork', 'Front matter', fmLine('breathwork'));
  warnUnknownFields(c, fm, FRONT_MATTER_KEYS, 'Front matter', input.frontMatter.fieldLines, input.frontMatterStartLine);

  // --- Segments -------------------------------------------------------------
  const contexts: SegCtx[] = [];
  for (const entry of input.segments) {
    const ctx = validateSegment(c, entry.split, entry.parsed);
    if (ctx) contexts.push(ctx);
  }

  validateSequence(c, contexts, peakPoseId, fmLine('peak_pose_id'));

  // --- Copy, schedule, and wake warnings (independent of expansion) ---------
  applyCopyWarnings(c, contexts);
  if (date !== null) applyScheduleWarning(c, date, scheduledStart, fmLine('date'));

  // --- Expansion and duration checks (only when nothing blocks) -------------
  let classDefinition: ClassDefinition | null = null;
  let summary: ImportSummary | null = null;

  if (
    c.errors.length === 0 &&
    classId && title && date && scheduledStart && hardClose && themeLine && feltSense && peakPoseId && props && roomSetup && arrival && breathwork
  ) {
    const authored = contexts.map((ctx) => ctx.seg);
    const expanded = expandSegments(authored);
    const plannedDurationSec = expanded.reduce((sum, s) => sum + s.plannedDurationSec, 0);
    const intervalSec = timeToSeconds(hardClose) - timeToSeconds(scheduledStart);

    if (plannedDurationSec > intervalSec) {
      c.error(
        `The planned sequence is ${minutes(plannedDurationSec)} minutes, longer than the ${minutes(intervalSec)}-minute scheduled class. Shorten the plan before importing.`,
        { segment: null, field: null, sourceLine: null },
      );
    } else if (plannedDurationSec < intervalSec) {
      c.warn(
        `Planned duration is ${minutes(plannedDurationSec)} minutes, shorter than the ${minutes(intervalSec)}-minute scheduled class. The class can still be imported.`,
        { segment: null, field: null, sourceLine: null },
      );
    }

    if (c.errors.length === 0) {
      classDefinition = {
        schemaVersion: SUPPORTED_SCHEMA_VERSION,
        classId, revisionId: input.sourceHash, sourceHash: input.sourceHash,
        title, date, scheduledStartLocal: scheduledStart, hardCloseLocal: hardClose,
        themeLine, feltSense, peakPoseId,
        props, roomSetup, arrival, breathwork,
        authoredSegments: authored,
        expandedRuntimeSegments: expanded,
        plannedDurationSec,
        originalMarkdown: input.originalMarkdown,
      };
      summary = buildSummary(classDefinition, authored, expanded, c.warnings.length);
    }
  }

  return {
    classDefinition,
    errors: c.errors,
    warnings: c.warnings,
    summary,
    schemaRejected: false,
  };
}

// --- Segment validation ----------------------------------------------------

function validateSegment(c: Collector, split: SplitBlock, parsed: ParsedBlock): SegCtx | null {
  const heading = split.headingText;
  const raw = parsed.value;
  const line = (key: string): number => parsed.fieldLines.get(key) ?? split.headingLine;

  if (heading === 'Grounding') {
    return validateGrounding(c, raw, line, split.headingLine, parsed.fieldLines);
  }
  if (heading === 'Savasana') {
    return validateSavasana(c, raw, line, split.headingLine, parsed.fieldLines);
  }
  if (heading.startsWith('Pose:')) {
    const name = heading.slice('Pose:'.length).trim() || heading;
    return validatePose(c, raw, name, line, split.headingLine, parsed.fieldLines);
  }
  if (heading.startsWith('Transition:')) {
    return validateTransition(c, raw, heading, line, split.headingLine, parsed.fieldLines);
  }
  c.error(
    `Unknown segment heading "${heading}". Use Grounding, "Pose: <name>", "Transition: <name>", or Savasana.`,
    { segment: heading, field: null, sourceLine: split.headingLine },
  );
  return null;
}

function validateGrounding(
  c: Collector, raw: Record<string, unknown>, line: (k: string) => number,
  headingLine: number, fieldLines: ReadonlyMap<string, number>,
): SegCtx {
  const label = 'Grounding';
  reqExactId(c, raw, 'grounding', label, line('id'));
  const durationMin = reqPosInt(c, raw, 'duration_min', label, line('duration_min')) ?? 0;
  const themeAnchor = reqNonEmpty(c, raw, 'theme_anchor', label, line('theme_anchor')) ?? '';
  const guidedSilentRatio = reqNonEmpty(c, raw, 'guided_silent_ratio', label, line('guided_silent_ratio')) ?? '';
  const yinPrinciples = reqStringList(c, raw, 'yin_principles', label, line('yin_principles'), { allowEmpty: false, exactly: 3 }) ?? [];
  warnUnknownFields(c, raw, GROUNDING_KEYS, label, fieldLines, headingLine);

  const seg: AuthoredGrounding = {
    type: 'grounding', id: 'grounding', name: label, durationMin,
    themeAnchor, yinPrinciples, guidedSilentRatio,
  };
  return { seg, label, headingLine, fieldLines, raw };
}

function validateSavasana(
  c: Collector, raw: Record<string, unknown>, line: (k: string) => number,
  headingLine: number, fieldLines: ReadonlyMap<string, number>,
): SegCtx {
  const label = 'Savasana';
  reqExactId(c, raw, 'savasana', label, line('id'));
  const durationMin = reqPosInt(c, raw, 'duration_min', label, line('duration_min')) ?? 0;
  const steps = reqStringList(c, raw, 'steps', label, line('steps'), { allowEmpty: false, exactly: 6 }) ?? [];
  const wakeMessage = reqNonEmpty(c, raw, 'wake_message', label, line('wake_message')) ?? '';
  warnUnknownFields(c, raw, SAVASANA_KEYS, label, fieldLines, headingLine);

  const seg: AuthoredSavasana = { type: 'savasana', id: 'savasana', name: label, durationMin, steps, wakeMessage };
  return { seg, label, headingLine, fieldLines, raw };
}

function validatePose(
  c: Collector, raw: Record<string, unknown>, name: string, line: (k: string) => number,
  headingLine: number, fieldLines: ReadonlyMap<string, number>,
): SegCtx {
  const label = name;
  const id = reqKebab(c, raw, 'id', label, line('id')) ?? '';

  const bilateralRaw = raw['bilateral'];
  const bilateral = typeof bilateralRaw === 'boolean' ? bilateralRaw : false;
  if (typeof bilateralRaw !== 'boolean') {
    c.error(`${label} · bilateral must be true or false.`, { segment: label, field: 'bilateral', sourceLine: line('bilateral') });
  }

  let durationMin: number | null = null;
  let durationPerSideMin: number | null = null;
  let sideOrder: Side[] | null = null;

  if (bilateral) {
    durationPerSideMin = reqPosIntPresent(c, raw, 'duration_per_side_min', label, line('duration_per_side_min'), headingLine,
      `${label} · duration_per_side_min is required when bilateral is true.`);
    if ('duration_min' in raw) {
      c.error(
        `${label} · duration_min is not allowed for a bilateral pose. Declare it as duration_per_side_min instead, meaning that many minutes on each side.`,
        { segment: label, field: 'duration_min', sourceLine: line('duration_min') },
      );
    }
    sideOrder = reqSideOrder(c, raw, label, line('side_order'));
  } else {
    durationMin = reqPosIntPresent(c, raw, 'duration_min', label, line('duration_min'), headingLine,
      `${label} · duration_min is required when bilateral is false.`);
    if ('duration_per_side_min' in raw) {
      c.error(`${label} · duration_per_side_min is only used on bilateral poses.`, {
        segment: label, field: 'duration_per_side_min', sourceLine: line('duration_per_side_min'),
      });
    }
    if ('side_order' in raw) {
      c.error(`${label} · side_order is only used on bilateral poses.`, {
        segment: label, field: 'side_order', sourceLine: line('side_order'),
      });
    }
  }

  const cue = (field: string): string => reqNonEmpty(c, raw, field, label, line(field)) ?? '';
  const entry = cue('entry');
  const target = cue('target');
  const settling = cue('settling');
  const midpoint = cue('midpoint');
  const propsField = cue('props');
  const alternative = cue('alternative');
  const exit = cue('exit');
  const notes = cue('notes');
  warnUnknownFields(c, raw, POSE_KEYS, label, fieldLines, headingLine);

  const seg: AuthoredPose = {
    type: 'pose', id, name, bilateral, durationMin, durationPerSideMin, sideOrder,
    entry, target, settling, midpoint, props: propsField, alternative, exit, notes,
  };
  return { seg, label, headingLine, fieldLines, raw };
}

function validateTransition(
  c: Collector, raw: Record<string, unknown>, heading: string, line: (k: string) => number,
  headingLine: number, fieldLines: ReadonlyMap<string, number>,
): SegCtx {
  const label = heading;
  const id = reqKebab(c, raw, 'id', label, line('id')) ?? '';
  const durationMin = reqPosInt(c, raw, 'duration_min', label, line('duration_min')) ?? 0;
  const nextSegmentId = reqNonEmpty(c, raw, 'next_segment_id', label, line('next_segment_id')) ?? '';
  const setup = reqNonEmpty(c, raw, 'setup', label, line('setup')) ?? '';
  const alternativeOffer = reqNonEmpty(c, raw, 'alternative_offer', label, line('alternative_offer')) ?? '';
  warnUnknownFields(c, raw, TRANSITION_KEYS, label, fieldLines, headingLine);

  const seg: AuthoredTransition = { type: 'transition', id, name: heading, durationMin, nextSegmentId, setup, alternativeOffer };
  return { seg, label, headingLine, fieldLines, raw };
}

// --- Sequence validation ---------------------------------------------------

function validateSequence(c: Collector, contexts: readonly SegCtx[], peakPoseId: string | null, peakLine: number): void {
  if (contexts.length === 0) {
    c.error('A class needs a Grounding segment, at least one pose, and a Savasana segment.', { segment: null, field: null, sourceLine: null });
    return;
  }

  const segs = contexts.map((x) => x.seg);
  const first = segs[0];
  const last = segs[segs.length - 1];

  const groundingCount = segs.filter((s) => s.type === 'grounding').length;
  const savasanaCount = segs.filter((s) => s.type === 'savasana').length;
  const poses = segs.filter((s): s is AuthoredPose => s.type === 'pose');

  if (groundingCount !== 1 || first?.type !== 'grounding') {
    c.error('Grounding must be the first segment and appear exactly once.', {
      segment: 'Grounding', field: null, sourceLine: contexts[0]?.headingLine ?? null,
    });
  }
  if (savasanaCount !== 1 || last?.type !== 'savasana') {
    c.error('Savasana must be the last segment and appear exactly once.', {
      segment: 'Savasana', field: null, sourceLine: contexts[contexts.length - 1]?.headingLine ?? null,
    });
  }
  if (poses.length === 0) {
    c.error('A class needs at least one pose.', { segment: null, field: null, sourceLine: null });
  }

  // Unique IDs across all segments.
  const seen = new Map<string, number>();
  for (const ctx of contexts) {
    const id = ctx.seg.id;
    if (!id) continue;
    if (seen.has(id)) {
      c.error(`Duplicate segment id "${id}". Every segment id must be unique.`, {
        segment: ctx.label, field: 'id', sourceLine: ctx.fieldLines.get('id') ?? ctx.headingLine,
      });
    } else {
      seen.set(id, ctx.headingLine);
    }
  }

  // peak_pose_id resolves to exactly one pose.
  if (peakPoseId) {
    const matches = poses.filter((p) => p.id === peakPoseId).length;
    if (matches !== 1) {
      c.error(`peak_pose_id "${peakPoseId}" must match exactly one pose id.`, {
        segment: 'Front matter', field: 'peak_pose_id', sourceLine: peakLine,
      });
    }
  }

  // Structural alternation: Grounding, (Pose, Transition)+, Savasana, and each
  // transition leads to the pose or Savasana that follows it in source order.
  if (first?.type === 'grounding' && last?.type === 'savasana') {
    for (let k = 1; k < contexts.length - 1; k++) {
      const ctx = contexts[k];
      if (!ctx) continue;
      const expectPose = (k - 1) % 2 === 0;
      if (expectPose && ctx.seg.type !== 'pose') {
        c.error(`Expected a pose here but found "${ctx.label}". Poses and transitions must alternate between Grounding and Savasana.`, {
          segment: ctx.label, field: null, sourceLine: ctx.headingLine,
        });
      } else if (!expectPose && ctx.seg.type !== 'transition') {
        c.error(`Expected a transition after "${contexts[k - 1]?.label ?? 'the previous pose'}" but found "${ctx.label}".`, {
          segment: ctx.label, field: null, sourceLine: ctx.headingLine,
        });
      }
    }

    for (let k = 0; k < contexts.length; k++) {
      const ctx = contexts[k];
      if (!ctx || ctx.seg.type !== 'transition') continue;
      const next = contexts[k + 1];
      const nextId = next?.seg.id ?? null;
      if (!next || (next.seg.type !== 'pose' && next.seg.type !== 'savasana')) {
        c.error(`Transition "${ctx.label}" must be followed by a pose or Savasana.`, {
          segment: ctx.label, field: 'next_segment_id', sourceLine: ctx.headingLine,
        });
      } else if (ctx.seg.type === 'transition' && nextId && ctx.seg.nextSegmentId !== nextId) {
        c.error(`Transition "${ctx.label}" points to "${ctx.seg.nextSegmentId}", but the next segment is "${nextId}". next_segment_id must match the following segment.`, {
          segment: ctx.label, field: 'next_segment_id', sourceLine: ctx.fieldLines.get('next_segment_id') ?? ctx.headingLine,
        });
      }
    }
  }
}

// --- Warnings --------------------------------------------------------------

function applyCopyWarnings(c: Collector, contexts: readonly SegCtx[]): void {
  const poseContexts = contexts.filter((x) => x.seg.type === 'pose');
  if (poseContexts.length > 14) {
    c.warn('This class has more than 14 poses, which can be a lot to hold in one class.', { segment: null, field: null, sourceLine: null });
  }

  for (const ctx of contexts) {
    const s = ctx.seg;
    if (s.type === 'pose') {
      warnIfLong(c, s.name, 36, ctx.label, 'name', ctx.headingLine, 'the pose name');
      warnIfLong(c, s.midpoint, 150, ctx.label, 'midpoint', ctx.fieldLines.get('midpoint') ?? ctx.headingLine, 'the midpoint cue');
      for (const field of POSE_CUE_FIELDS) {
        warnIfLong(c, s[field], 280, ctx.label, field, ctx.fieldLines.get(field) ?? ctx.headingLine, `the ${field} cue`);
      }
    } else if (s.type === 'grounding') {
      warnIfLong(c, s.themeAnchor, 320, ctx.label, 'theme_anchor', ctx.fieldLines.get('theme_anchor') ?? ctx.headingLine, 'the theme anchor');
      warnIfLong(c, s.guidedSilentRatio, 320, ctx.label, 'guided_silent_ratio', ctx.fieldLines.get('guided_silent_ratio') ?? ctx.headingLine, 'the guided/silent note');
    } else if (s.type === 'savasana') {
      warnIfLong(c, s.wakeMessage, 90, ctx.label, 'wake_message', ctx.fieldLines.get('wake_message') ?? ctx.headingLine, 'the wake message');
    }
  }
}

function applyScheduleWarning(c: Collector, date: string, scheduledStart: string | null, dateLine: number): void {
  const isTuesday = dayOfWeekUTC(date) === 2;
  const usualStart = scheduledStart === CANONICAL_SCHEDULED_START_LOCAL;
  if (!isTuesday || !usualStart) {
    c.warn(
      'This class is not the usual Tuesday 7:00 PM class (a shifted week, a sub, or a rehearsal). It will still import.',
      { segment: 'Front matter', field: 'date', sourceLine: dateLine },
    );
  }
}

function warnIfLong(c: Collector, text: string, max: number, segment: string, field: string, line: number, phrase: string): void {
  if (typeof text === 'string' && text.length > max) {
    c.warn(`${segment} · ${phrase} is longer than ${max} characters. Consider shortening it for a quick glance.`, {
      segment, field, sourceLine: line,
    });
  }
}

// --- Expansion -------------------------------------------------------------

function expandSegments(authored: readonly AuthoredSegment[]): ExpandedSegment[] {
  const expanded: ExpandedSegment[] = [];
  let offset = 0;
  const push = (seg: Omit<ExpandedSegment, 'plannedOffsetSec'>): void => {
    expanded.push({ ...seg, plannedOffsetSec: offset });
    offset += seg.plannedDurationSec;
  };

  for (const s of authored) {
    if (s.type === 'grounding') {
      push({
        id: s.id, parentId: s.id, type: 'grounding', name: s.name, side: null,
        plannedDurationSec: s.durationMin * 60,
        cues: { themeAnchor: s.themeAnchor, yinPrinciples: s.yinPrinciples, guidedSilentRatio: s.guidedSilentRatio },
      });
    } else if (s.type === 'transition') {
      push({
        id: s.id, parentId: s.id, type: 'transition', name: s.name, side: null,
        plannedDurationSec: s.durationMin * 60,
        cues: { setup: s.setup, alternativeOffer: s.alternativeOffer, nextSegmentId: s.nextSegmentId },
      });
    } else if (s.type === 'savasana') {
      push({
        id: s.id, parentId: s.id, type: 'savasana', name: s.name, side: null,
        plannedDurationSec: s.durationMin * 60,
        cues: { steps: s.steps, wakeMessage: s.wakeMessage },
      });
    } else {
      const cues = poseCues(s);
      if (s.bilateral && s.sideOrder && s.durationPerSideMin !== null) {
        for (const side of s.sideOrder) {
          push({
            id: `${s.id}--${side}`, parentId: s.id, type: 'pose', name: s.name, side,
            plannedDurationSec: s.durationPerSideMin * 60, cues,
          });
        }
      } else {
        push({
          id: s.id, parentId: s.id, type: 'pose', name: s.name, side: null,
          plannedDurationSec: (s.durationMin ?? 0) * 60, cues,
        });
      }
    }
  }

  return expanded;
}

function poseCues(s: AuthoredPose): Readonly<Record<string, string | readonly string[]>> {
  return {
    entry: s.entry, target: s.target, settling: s.settling, midpoint: s.midpoint,
    props: s.props, alternative: s.alternative, exit: s.exit, notes: s.notes,
  };
}

// --- Summary ---------------------------------------------------------------

function buildSummary(
  def: ClassDefinition, authored: readonly AuthoredSegment[], expanded: readonly ExpandedSegment[], warningCount: number,
): ImportSummary {
  const poses = authored.filter((s): s is AuthoredPose => s.type === 'pose');
  const teachingSides = expanded.filter((s) => s.type === 'pose').length;
  const transitions = authored.filter((s) => s.type === 'transition').length;
  const savasana = expanded.find((s) => s.type === 'savasana');
  const peakPose = poses.find((p) => p.id === def.peakPoseId);
  return {
    title: def.title, date: def.date,
    scheduledStartLocal: def.scheduledStartLocal, hardCloseLocal: def.hardCloseLocal,
    plannedDurationSec: def.plannedDurationSec, plannedDurationMin: def.plannedDurationSec / 60,
    authoredPoseCount: poses.length, teachingSideCount: teachingSides, transitionCount: transitions,
    savasanaDurationSec: savasana?.plannedDurationSec ?? 0,
    peakPoseName: peakPose?.name ?? def.peakPoseId,
    props: def.props, roomSetup: def.roomSetup, warningCount,
  };
}

// --- Field accessors -------------------------------------------------------

function reqNonEmpty(c: Collector, obj: Record<string, unknown>, key: string, segment: string, line: number): string | null {
  const v = obj[key];
  if (typeof v === 'string' && v.trim().length > 0) return v;
  c.error(`${segment} · ${key} is required and must be text.`, { segment, field: key, sourceLine: line });
  return null;
}

function reqKebab(c: Collector, obj: Record<string, unknown>, key: string, segment: string, line: number): string | null {
  const v = obj[key];
  if (typeof v === 'string' && KEBAB.test(v)) return v;
  c.error(`${segment} · ${key} must be a kebab-case identifier (lowercase words joined by hyphens).`, { segment, field: key, sourceLine: line });
  return null;
}

function reqExactId(c: Collector, obj: Record<string, unknown>, expected: string, segment: string, line: number): void {
  if (obj['id'] !== expected) {
    c.error(`${segment} · id must be "${expected}".`, { segment, field: 'id', sourceLine: line });
  }
}

function reqPosInt(c: Collector, obj: Record<string, unknown>, key: string, segment: string, line: number): number | null {
  const v = obj[key];
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) return v;
  if (!(key in obj)) {
    c.error(`${segment} · ${key} is required and must be a whole number of minutes.`, { segment, field: key, sourceLine: line });
  } else {
    c.error(`${segment} · ${key} must be a positive whole number of minutes.`, { segment, field: key, sourceLine: line });
  }
  return null;
}

/** Like reqPosInt but with a caller-supplied "missing" message (for the C2 wording). */
function reqPosIntPresent(
  c: Collector, obj: Record<string, unknown>, key: string, segment: string,
  line: number, headingLine: number, missingMessage: string,
): number | null {
  const v = obj[key];
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) return v;
  if (!(key in obj)) {
    c.error(missingMessage, { segment, field: key, sourceLine: headingLine });
  } else {
    c.error(`${segment} · ${key} must be a positive whole number of minutes.`, { segment, field: key, sourceLine: line });
  }
  return null;
}

function reqDate(c: Collector, obj: Record<string, unknown>, key: string, line: number): string | null {
  const v = obj[key];
  if (typeof v === 'string' && isRealDate(v)) return v;
  c.error('Front matter · date must be a real calendar date like 2026-07-28.', { segment: 'Front matter', field: key, sourceLine: line });
  return null;
}

function reqTime(c: Collector, obj: Record<string, unknown>, key: string, line: number): string | null {
  const v = obj[key];
  if (typeof v === 'string' && HHMM.test(v)) return v;
  c.error(`Front matter · ${key} must be a 24-hour time like "19:00".`, { segment: 'Front matter', field: key, sourceLine: line });
  return null;
}

function reqHardClose(c: Collector, obj: Record<string, unknown>, scheduledStart: string | null, line: number): string | null {
  const v = obj['hard_close_local'];
  if (typeof v !== 'string' || !HHMM.test(v)) {
    c.error('Front matter · hard_close_local must be a 24-hour time like "20:00".', { segment: 'Front matter', field: 'hard_close_local', sourceLine: line });
    return null;
  }
  if (v !== '20:00') {
    c.error('Front matter · hard_close_local must be 20:00 for v1 (the studio\'s hard close).', { segment: 'Front matter', field: 'hard_close_local', sourceLine: line });
    return null;
  }
  if (scheduledStart && timeToSeconds(v) <= timeToSeconds(scheduledStart)) {
    c.error('Front matter · hard_close_local must be later than scheduled_start_local.', { segment: 'Front matter', field: 'hard_close_local', sourceLine: line });
    return null;
  }
  return v;
}

interface StringListOptions {
  allowEmpty: boolean;
  exactly?: number;
}

function reqStringList(
  c: Collector, obj: Record<string, unknown>, key: string, segment: string, line: number, opts: StringListOptions,
): string[] | null {
  const v = obj[key];
  if (!Array.isArray(v)) {
    c.error(`${segment} · ${key} must be a list.`, { segment, field: key, sourceLine: line });
    return null;
  }
  const allStrings = v.every((item) => typeof item === 'string' && item.trim().length > 0);
  if (!allStrings) {
    c.error(`${segment} · ${key} must be a list of non-empty text items.`, { segment, field: key, sourceLine: line });
    return null;
  }
  if (opts.exactly !== undefined && v.length !== opts.exactly) {
    c.error(`${segment} · ${key} must list exactly ${opts.exactly} items.`, { segment, field: key, sourceLine: line });
    return null;
  }
  if (!opts.allowEmpty && v.length === 0) {
    c.error(`${segment} · ${key} must not be empty.`, { segment, field: key, sourceLine: line });
    return null;
  }
  return v as string[];
}

function reqSideOrder(c: Collector, obj: Record<string, unknown>, segment: string, line: number): Side[] | null {
  const v = obj['side_order'];
  if (!Array.isArray(v) || v.length !== 2) {
    c.error(`${segment} · side_order must list exactly two sides: right and left.`, { segment, field: 'side_order', sourceLine: line });
    return null;
  }
  const sides = v.filter((x): x is Side => SUPPORTED_SIDES.includes(x as Side));
  if (sides.length !== 2 || sides[0] === sides[1]) {
    c.error(`${segment} · side_order must be two distinct supported sides (right and left).`, { segment, field: 'side_order', sourceLine: line });
    return null;
  }
  return sides;
}

function warnUnknownFields(
  c: Collector, obj: Record<string, unknown>, known: readonly string[], segment: string,
  fieldLines: ReadonlyMap<string, number>, fallbackLine: number,
): void {
  for (const key of Object.keys(obj)) {
    if (known.includes(key) || key.startsWith('x_')) continue;
    c.warn(`${segment} · unknown field "${key}" was ignored.`, { segment, field: key, sourceLine: fieldLines.get(key) ?? fallbackLine });
  }
}

// --- Small utilities -------------------------------------------------------

function timeToSeconds(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => Number.parseInt(x, 10));
  return (h ?? 0) * 3600 + (m ?? 0) * 60;
}

function minutes(seconds: number): number {
  return Math.round(seconds / 60);
}

function isRealDate(text: string): boolean {
  const match = ISO_DATE.exec(text);
  if (!match) return false;
  const y = Number(match[1]);
  const mo = Number(match[2]);
  const d = Number(match[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function dayOfWeekUTC(date: string): number {
  const match = ISO_DATE.exec(date);
  if (!match) return -1;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
}

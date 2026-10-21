// Schedule-only class revision support.
//
// Prep may correct an authored scheduled start before Begin Class. The stored
// class revision remains immutable: this helper produces new Markdown, which is
// then sent through the ordinary import parser, validation, hashing, and storage
// path as a distinct revision. Only the two top-level schedule fields change.

/** Replace the two required top-level schedule fields in class Markdown. */
export function reviseScheduleSource(
  source: string,
  scheduledStartLocal: string,
  hardCloseLocal: string,
): string {
  const revisedStart = replaceTopLevelField(source, 'scheduled_start_local', scheduledStartLocal);
  return replaceTopLevelField(revisedStart, 'hard_close_local', hardCloseLocal);
}

function replaceTopLevelField(source: string, field: string, value: string): string {
  const pattern = new RegExp(`^${field}\\s*:[^\\r\\n]*$`, 'm');
  if (!pattern.test(source)) throw new Error(`Cannot revise missing ${field}.`);
  return source.replace(pattern, `${field}: "${value}"`);
}

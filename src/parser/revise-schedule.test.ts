import { describe, expect, it } from 'vitest';
import { importClass } from './index.js';
import { expectOk, MINIMAL_VALID } from './test-helpers.js';
import { reviseScheduleSource } from './revise-schedule.js';

describe('schedule-only source revision', () => {
  it('changes only the two schedule fields and produces a valid new revision', async () => {
    const original = expectOk(await importClass(MINIMAL_VALID)).classDefinition;
    const revisedSource = reviseScheduleSource(MINIMAL_VALID, '18:30', '19:30');
    const revised = expectOk(await importClass(revisedSource)).classDefinition;

    expect(revised.scheduledStartLocal).toBe('18:30');
    expect(revised.hardCloseLocal).toBe('19:30');
    expect(revised.sourceHash).not.toBe(original.sourceHash);
    expect(revised.originalMarkdown).toContain('scheduled_start_local: "18:30"');
    expect(revised.originalMarkdown).toContain('hard_close_local: "19:30"');
    expect(revised.originalMarkdown.replace('18:30', '19:00').replace('19:30', '20:00')).toBe(MINIMAL_VALID);
  });

  it('supports a corrected hour that crosses midnight', async () => {
    const source = reviseScheduleSource(MINIMAL_VALID, '23:30', '00:30');
    const revised = expectOk(await importClass(source)).classDefinition;
    expect(revised.scheduledStartLocal).toBe('23:30');
    expect(revised.hardCloseLocal).toBe('00:30');
  });
});

// The run machine's public surface: the controller, its clock environment and
// result types, the queue policy, and the recovery-snapshot derivation. Pure
// orchestration over the store and the timing model — no DOM (that is src/ui).

export {
  RunController,
  QUEUE_POLICY,
  type RunClockEnv,
  type RunSnapshot,
  type ActionResult,
  type BeginResult,
} from './machine.js';
export { buildRecoverySnapshot, type RecoverySnapshot } from './recovery.js';

/**
 * Client-side prediction with server reconciliation. The client applies inputs
 * locally the instant they happen (no round-trip lag), keeping each unacknowledged
 * input. When the server confirms an authoritative state as of some input sequence
 * number, the client snaps to it and **replays** the still-unacknowledged inputs
 * on top — so a correct prediction is invisible and a wrong one self-corrects.
 *
 * `step` must be deterministic: the same (state, input) always yields the same
 * next state, on client and server alike.
 */
export interface SequencedInput {
  seq: number;
}

export class Predictor<S, I extends SequencedInput> {
  private pending: I[] = [];
  private readonly step: (state: S, input: I) => S;
  state: S;

  constructor(step: (state: S, input: I) => S, state: S) {
    this.step = step;
    this.state = state;
  }

  /** Apply an input locally now and remember it until the server acks it. */
  predict(input: I): S {
    this.pending.push(input);
    this.state = this.step(this.state, input);
    return this.state;
  }

  /**
   * Adopt the server's `authoritative` state (valid as of input `ackSeq`), then
   * replay every input newer than `ackSeq` to catch back up to "now".
   */
  reconcile(authoritative: S, ackSeq: number): S {
    this.pending = this.pending.filter((i) => i.seq > ackSeq);
    let s = authoritative;
    for (const input of this.pending) s = this.step(s, input);
    this.state = s;
    return s;
  }

  /** Number of inputs still awaiting server acknowledgement. */
  get pendingCount(): number {
    return this.pending.length;
  }
}

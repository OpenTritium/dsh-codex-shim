/**
 * Per-agent numeric session registry mapping codex's integer session ids onto
 * live shell process handles. The registry applies upstream's 64-process cap
 * and reaches quiescence when the owning agent goes away.
 * @module @opentritium/dsh-codex-shim/exec-sessions
 */

import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ShellProcess } from '@deepseek-ai/dsh-shell'

/** Upstream's maximum retained unified-exec processes per owning agent. */
export const MAX_EXEC_SESSIONS = 64

/** One live unified-exec session owned by an agent. */
export interface ExecSession {
  /** Numeric id the model passes back through `write_stdin`. */
  readonly id: number
  /** The live process handle; reads consume deltas across calls. */
  readonly proc: ShellProcess
}

/** Registry-private recency used by the bounded eviction policy. */
interface TrackedExecSession extends ExecSession {
  /** Monotonic access sequence; larger values are newer. */
  lastUsed: number
}

/**
 * Registry of live exec sessions keyed by owning agent and numeric id. The
 * first session for an agent attaches a disposal effect on that agent's own
 * context, so abandoned sessions die with their owner.
 */
export class ExecSessionRegistry {
  private readonly byAgent = new Map<Agent, Map<number, TrackedExecSession>>()
  private readonly nextId = new Map<Agent, number>()
  private readonly cleanedUp = new WeakSet<Agent>()
  private accessSequence = 0

  /**
   * Publish one live process as the agent's next numbered session.
   * @param agent - the exact owning agent.
   * @param proc - the live process handle.
   * At the upstream cap, the least-recently-used completed process is removed;
   * when every retained process is live, the least-recently-used process is
   * killed and awaited before this call settles.
   * @returns the published session after any evicted process reaches quiescence.
   */
  async register(agent: Agent, proc: ShellProcess): Promise<ExecSession> {
    this.ensureOwnerCleanup(agent)
    const id = (this.nextId.get(agent) ?? 0) + 1
    this.nextId.set(agent, id)
    const session: TrackedExecSession = { id, proc, lastUsed: ++this.accessSequence }
    const owned = this.byAgent.get(agent) ?? new Map<number, TrackedExecSession>()
    const evicted = owned.size < MAX_EXEC_SESSIONS ? undefined : this.evictionCandidate(owned)
    if (evicted !== undefined) owned.delete(evicted.id)
    owned.set(id, session)
    this.byAgent.set(agent, owned)
    if (evicted !== undefined) {
      evicted.proc.kill()
      await evicted.proc.done
      if (this.byAgent.get(agent) !== owned) {
        throw new Error('exec session owner was disposed while registering a process')
      }
    }
    return session
  }

  /**
   * Look up one of the agent's sessions.
   * @param agent - the exact owning agent.
   * @param id - the numeric session id.
   * @returns the session, or undefined when it already finished or never existed.
   */
  get(agent: Agent, id: number): ExecSession | undefined {
    const session = this.byAgent.get(agent)?.get(id)
    if (session !== undefined) session.lastUsed = ++this.accessSequence
    return session
  }

  /**
   * Drop one finished session from the registry.
   * @param agent - the exact owning agent.
   * @param id - the numeric session id.
   */
  release(agent: Agent, id: number): void {
    this.byAgent.get(agent)?.delete(id)
  }

  /** Select the oldest completed session, otherwise the oldest live session. */
  private evictionCandidate(owned: Map<number, TrackedExecSession>): TrackedExecSession {
    const sessions = [...owned.values()].sort((left, right) => left.lastUsed - right.lastUsed)
    const candidate = sessions.find((session) => session.proc.status !== 'running') ?? sessions[0]
    if (candidate === undefined) throw new Error('cannot evict from an empty exec session registry')
    return candidate
  }

  /**
   * Attach the one-per-agent disposal effect that kills every live session.
   * @param agent - the exact owning agent.
   */
  private ensureOwnerCleanup(agent: Agent): void {
    if (this.cleanedUp.has(agent)) return
    this.cleanedUp.add(agent)
    agent.ctx.effect(
      () => async () => {
        const owned = this.byAgent.get(agent)
        // The cleanup attaches only after the first register created the map, so
        // the absent-map guard only satisfies the indexer.
        /* v8 ignore start */
        if (owned === undefined) return
        /* v8 ignore stop */
        const processes = [...owned.values()].map((session) => session.proc)
        owned.clear()
        this.byAgent.delete(agent)
        this.nextId.delete(agent)
        for (const process of processes) process.kill()
        await Promise.all(processes.map((process) => process.done))
      },
      'codex-exec.ownerCleanup()',
    )
  }
}

/** Per-agent registry for Codex numeric ids and live shell processes. */

import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ShellProcess } from '@deepseek-ai/dsh-shell'

export const MAX_EXEC_SESSIONS = 64

export interface ExecSession {
  readonly id: number
  readonly proc: ShellProcess
}

interface TrackedExecSession extends ExecSession {
  lastUsed: number
}

export class ExecSessionRegistry {
  private readonly byAgent = new Map<Agent, Map<number, TrackedExecSession>>()
  private readonly nextId = new Map<Agent, number>()
  private readonly cleanedUp = new WeakSet<Agent>()
  private accessSequence = 0

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

  get(agent: Agent, id: number): ExecSession | undefined {
    const session = this.byAgent.get(agent)?.get(id)
    if (session !== undefined) session.lastUsed = ++this.accessSequence
    return session
  }

  release(agent: Agent, id: number): void {
    this.byAgent.get(agent)?.delete(id)
  }

  private evictionCandidate(owned: Map<number, TrackedExecSession>): TrackedExecSession {
    const sessions = [...owned.values()].sort((left, right) => left.lastUsed - right.lastUsed)
    const candidate = sessions.find(session => session.proc.status !== 'running') ?? sessions[0]
    if (candidate === undefined) throw new Error('cannot evict from an empty exec session registry')
    return candidate
  }

  private ensureOwnerCleanup(agent: Agent): void {
    if (this.cleanedUp.has(agent)) return
    this.cleanedUp.add(agent)
    agent.ctx.effect(
      () => async () => {
        const owned = this.byAgent.get(agent)
        /* v8 ignore start */
        if (owned === undefined) return
        /* v8 ignore stop */
        const processes = [...owned.values()].map(session => session.proc)
        owned.clear()
        this.byAgent.delete(agent)
        this.nextId.delete(agent)
        for (const process of processes) process.kill()
        await Promise.all(processes.map(process => process.done))
      },
      'codex-exec.ownerCleanup()',
    )
  }
}

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  catalogFromLiveAgents,
  visibleSessionsForWorkspace,
  workspacesWithVisibleSessions,
  type CatalogSnapshot,
} from '../src/catalog.ts'

test('visible sessions exclude archived blank and subagent', () => {
  const catalog: CatalogSnapshot = {
    complete: true,
    archivedIds: new Set(['arch']),
    sessionsById: new Map([
      ['ok', { sessionId: 'ok', title: 'OK', blank: false, running: true, updatedAt: 1 }],
      ['arch', { sessionId: 'arch', title: 'Arch', blank: false, running: false, updatedAt: 1 }],
      ['blank', { sessionId: 'blank', title: 'Blank', blank: true, running: false, updatedAt: 1 }],
      ['sub', { sessionId: 'sub', title: 'Sub', blank: false, running: false, origin: 'subagent', updatedAt: 1 }],
    ]),
    workspaces: [{
      id: 'w',
      title: 'W',
      path: '/w',
      sessionIds: ['ok', 'arch', 'blank', 'sub', 'missing'],
    }],
  }
  const rows = visibleSessionsForWorkspace(catalog, catalog.workspaces[0]!)
  assert.deepEqual(rows.map((r) => r.sessionId), ['ok'])
  assert.equal(workspacesWithVisibleSessions(catalog).length, 1)
})

test('the live-agent fallback never lists a subagent child as a session', () => {
  const followups: never[] = []
  const make = (id: string, origin?: 'subagent') => ({
    id,
    session: { header: { cwd: '/proj/x', ...(origin ? { origin } : {}) } },
    followup: (m: never) => { followups.push(m) },
  })
  const catalog = catalogFromLiveAgents([
    make('main-1') as never,
    make('child-1', 'subagent') as never,
    make('main-2') as never,
  ])
  assert.deepEqual([...catalog.sessionsById.keys()], ['main-1', 'main-2'])
  assert.deepEqual(catalog.workspaces[0]!.sessionIds, ['main-1', 'main-2'])
  assert.equal(catalog.complete, false)
})

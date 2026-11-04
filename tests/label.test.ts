import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buttonLabel,
  describeAgent,
  detailLines,
  displayLabel,
  isSubagentSession,
  readSessionCwd,
  readSessionOrigin,
  readSessionTitle,
  workspaceName,
} from '../src/label.ts'
import { SessionId } from '@deepseek-ai/dsh-session/types'

test('workspaceName takes last path segment', () => {
  assert.equal(workspaceName('D:\\gitData\\dsh-telegram-channel'), 'dsh-telegram-channel')
  assert.equal(workspaceName('/home/me/proj/app'), 'app')
})

test('readSessionCwd prefers header.cwd over meta.cwd', () => {
  assert.equal(readSessionCwd({ header: { cwd: '/real' }, meta: { cwd: '/old' } }), '/real')
  assert.equal(readSessionCwd({ meta: { cwd: '/legacy' } }), '/legacy')
})

test('readSessionTitle uses service, then events', () => {
  const session = {
    header: { cwd: '/w' },
    events: [
      { type: 'user/message', data: {} },
      { type: 'session/title', data: { title: '  修复登录  ' } },
    ],
  }
  assert.equal(readSessionTitle(undefined, session), '修复登录')
  const ctx = {
    sessionTitle: { get: () => ({ title: '来自服务' }) },
  }
  assert.equal(readSessionTitle(ctx as any, session), '来自服务')
})

test('describeAgent builds title + workspace + id tail', () => {
  const agent = {
    id: SessionId('0123456789abcdef-live'),
    session: {
      header: { cwd: 'D:/gitData/my-app' },
      events: [{ type: 'session/title', data: { title: '重构支付' } }],
    },
  }
  const parts = describeAgent(agent as any, 0)
  assert.equal(parts.title, '重构支付')
  assert.equal(parts.workspace, 'my-app')
  assert.match(detailLines(parts), /重构支付/)
  assert.match(detailLines(parts), /D:\/gitData\/my-app/)
  assert.match(buttonLabel(parts), /^1\. 重构支付/)
  assert.match(displayLabel(parts), /重构支付 · my-app/)
})

test('buttonLabel stays within 64 chars', () => {
  const longTitle = '啊'.repeat(80)
  const label = buttonLabel({
    index: 0,
    title: longTitle,
    workspace: 'ws',
    idTail: 'abc',
    sessionId: 'x',
  })
  assert.ok([...label].length <= 64)
})

test('readSessionOrigin reads the durable header, isSubagentSession narrows it', () => {
  assert.equal(readSessionOrigin({ header: { origin: 'subagent' } }), 'subagent')
  assert.equal(readSessionOrigin({ header: { cwd: '/p' } }), undefined)
  assert.equal(readSessionOrigin({ meta: { cwd: '/p' } }), undefined)
  assert.equal(readSessionOrigin(undefined), undefined)
  assert.equal(isSubagentSession({ header: { origin: 'subagent' } }), true)
  assert.equal(isSubagentSession({ header: { cwd: '/p' } }), false)
  assert.equal(isSubagentSession({}), false)
})

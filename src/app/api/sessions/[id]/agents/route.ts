import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

interface SessionAgentRow {
  agent_id: string
  agent_source: 'db' | 'file'
  created_at: string
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()

  const rows = db.prepare(
    'SELECT agent_id, agent_source, created_at FROM session_agents WHERE session_id = ? ORDER BY created_at'
  ).all(id) as SessionAgentRow[]

  return NextResponse.json({ agents: rows })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params
  const body = await req.json() as { agentId: string; agentSource?: 'db' | 'file'; action?: 'add' | 'remove' }
  const { agentId, agentSource = 'db', action = 'add' } = body

  if (!agentId) {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
  }

  const db = getDb()

  if (action === 'remove') {
    db.prepare('DELETE FROM session_agents WHERE session_id = ? AND agent_id = ?').run(sessionId, agentId)
    return NextResponse.json({ success: true })
  }

  // action === 'add'
  db.prepare(
    'INSERT OR IGNORE INTO session_agents (session_id, agent_id, agent_source) VALUES (?, ?, ?)'
  ).run(sessionId, agentId, agentSource)

  return NextResponse.json({ success: true })
}

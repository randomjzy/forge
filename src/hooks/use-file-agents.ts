'use client'

import { useState, useEffect, useCallback } from 'react'
import { GLOBAL_WORKSPACE_ID } from '@/lib/types'

interface FileAgent {
  id: string  // Same as name (filename without .md)
  name: string
  description: string
  avatar: string | null
  type: 'agent'
  source: 'file'
}

/**
 * Hook to fetch agents defined in .claude/agents/*.md files.
 * Uses the /api/workspaces/[id]/agents endpoint which returns full agent details.
 */
export function useFileAgents(workspaceId: string | null) {
  const [agents, setAgents] = useState<FileAgent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAgents = useCallback(async () => {
    if (!workspaceId) {
      setAgents([])
      setLoading(false)
      return
    }

    try {
      const wsId = workspaceId || GLOBAL_WORKSPACE_ID
      const isGlobal = wsId === GLOBAL_WORKSPACE_ID

      // Fetch from both global and project workspace, deduplicate
      const fetches = [
        fetch(`/api/workspaces/${wsId}/agents`).then(r => r.json()).catch(() => []),
      ]
      if (!isGlobal) {
        fetches.push(
          fetch(`/api/workspaces/${GLOBAL_WORKSPACE_ID}/agents`).then(r => r.json()).catch(() => [])
        )
      }

      const results = await Promise.all(fetches)
      const allAgents = results.flat()

      // Deduplicate by name, preferring non-global agents
      const agentMap = new Map<string, FileAgent>()
      for (const agent of allAgents) {
        if (!agentMap.has(agent.name)) {
          agentMap.set(agent.name, {
            id: agent.id,
            name: agent.name,
            description: agent.description || '',
            avatar: agent.avatar || null,
            type: 'agent',
            source: 'file',
          })
        }
      }

      setAgents(Array.from(agentMap.values()))
    } catch (err) {
      console.error('Failed to fetch file agents:', err)
      setAgents([])
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  return { agents, loading, refreshAgents: fetchAgents }
}

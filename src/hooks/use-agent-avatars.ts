'use client'

import { useState, useEffect, useCallback } from 'react'

interface AgentAvatar {
  agent_id: string
  avatar_path: string
}

/**
 * Hook to manage agent avatars.
 * Avatars are stored in ~/.forge/avatars/ and paths in the database.
 */
export function useAgentAvatars() {
  const [avatars, setAvatars] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  // Fetch all avatars
  const fetchAvatars = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/avatars')
      const data = (await res.json()) as AgentAvatar[]
      const map: Record<string, string> = {}
      for (const { agent_id, avatar_path } of data) {
        if (avatar_path) {
          // Expand ~ to home directory
          map[agent_id] = avatar_path.replace(/^~/, process.env.HOME || '')
        }
      }
      setAvatars(map)
    } catch (err) {
      console.error('Failed to fetch avatars:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAvatars()
  }, [fetchAvatars])

  // Upload avatar for an agent
  const uploadAvatar = useCallback(async (agentId: string, file: File): Promise<boolean> => {
    try {
      const formData = new FormData()
      formData.append('agentId', agentId)
      formData.append('file', file)

      console.log('[avatar hook] posting to /api/agents/avatars', agentId, file.name)

      const res = await fetch('/api/agents/avatars', {
        method: 'POST',
        body: formData,
      })

      console.log('[avatar hook] response status', res.status)

      if (!res.ok) {
        const data = await res.json()
        console.error('[avatar hook] upload failed:', data.error)
        return false
      }

      // Refresh avatars list
      console.log('[avatar hook] calling fetchAvatars')
      await fetchAvatars()
      console.log('[avatar hook] fetchAvatars done')
      return true
    } catch (err) {
      console.error('[avatar hook] upload error:', err)
      return false
    }
  }, [fetchAvatars])

  // Remove avatar for an agent
  const removeAvatar = useCallback(async (agentId: string): Promise<boolean> => {
    try {
      const formData = new FormData()
      formData.append('agentId', agentId)

      const res = await fetch('/api/agents/avatars', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) return false

      await fetchAvatars()
      return true
    } catch (err) {
      console.error('Avatar remove error:', err)
      return false
    }
  }, [fetchAvatars])

  // Get avatar URL for an agent
  const getAvatarUrl = useCallback((agentId: string): string | null => {
    const path = avatars[agentId]
    if (!path) return null
    return `/api/agents/avatars?agentId=${encodeURIComponent(agentId)}`
  }, [avatars])

  return {
    avatars,
    loading,
    uploadAvatar,
    removeAvatar,
    getAvatarUrl,
    refreshAvatars: fetchAvatars,
  }
}

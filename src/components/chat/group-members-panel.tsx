'use client'

import { useState, useEffect, useMemo } from 'react'
import { User, Bot, Plus, X, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/components/providers/i18n-provider'

export interface GroupMember {
  id: string
  name: string
  type: 'user' | 'secretary' | 'agent'
  avatar?: string
  isActive?: boolean
  isOnline?: boolean
  description?: string
  source?: 'db' | 'file'
}

interface GroupMembersPanelProps {
  members: GroupMember[]
  activeMemberId: string | null
  onMemberSelect: (memberId: string) => void
  onInviteAgent?: () => void
  onRemoveAgent?: (memberId: string) => void
  availableAgents?: GroupMember[]
  onAgentSelect?: (agent: GroupMember) => void
  width?: number
}

export function GroupMembersPanel({
  members,
  activeMemberId,
  onMemberSelect,
  onInviteAgent,
  onRemoveAgent,
  availableAgents = [],
  onAgentSelect,
  width = 200,
}: GroupMembersPanelProps) {
  const { t } = useI18n()
  const [agentsExpanded, setAgentsExpanded] = useState(true)
  const [showInviteMenu, setShowInviteMenu] = useState(false)

  // Separate core members from agents
  const coreMembers = members.filter(m => m.type === 'user' || m.type === 'secretary')
  const agentMembers = members.filter(m => m.type === 'agent')

  // Available agents to invite (not already in the group)
  const availableToInvite = useMemo(() => {
    const currentAgentIds = new Set(agentMembers.map(a => a.id))
    return availableAgents.filter(a => !currentAgentIds.has(a.id))
  }, [availableAgents, agentMembers])

  const getMemberIcon = (type: GroupMember['type']) => {
    switch (type) {
      case 'user':
        return <User size={14} className="text-blue-500" />
      case 'secretary':
        return <Bot size={14} className="text-indigo" />
      case 'agent':
        return <Bot size={14} className="text-green" />
    }
  }

  /** Render avatar: image URL, emoji, or default icon */
  const renderAvatar = (member: GroupMember) => {
    if (member.avatar) {
      // Check if it's an emoji
      const isEmoji = /^\p{Emoji}/u.test(member.avatar)
      if (isEmoji) {
        return (
          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 border', getMemberColor(member.type))}>
            <span className="text-[16px]">{member.avatar}</span>
          </div>
        )
      }
      // Assume it's a URL
      return (
        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 border overflow-hidden', getMemberColor(member.type))}>
          <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
        </div>
      )
    }
    // Default icon
    return (
      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 border', getMemberColor(member.type))}>
        {getMemberIcon(member.type)}
      </div>
    )
  }

  const getMemberColor = (type: GroupMember['type']) => {
    switch (type) {
      case 'user':
        return 'bg-blue-500/10 border-blue-500/20'
      case 'secretary':
        return 'bg-indigo/10 border-indigo/20'
      case 'agent':
        return 'bg-green/10 border-green/20'
    }
  }

  return (
    <div
      className="flex flex-col bg-surface border-r border-subtle shrink-0 overflow-hidden"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-10 px-3 border-b border-subtle shrink-0">
        <span className="text-[12px] font-semibold text-secondary">群聊</span>
        {onInviteAgent && availableToInvite.length > 0 && (
          <button
            onClick={() => setShowInviteMenu(!showInviteMenu)}
            className="p-1 rounded hover:bg-surface-hover transition-colors"
            title="邀请 Agent"
          >
            <Plus size={14} className="text-tertiary" />
          </button>
        )}
      </div>

      {/* Invite dropdown */}
      {showInviteMenu && availableToInvite.length > 0 && (
        <div className="px-2 py-2 border-b border-subtle bg-surface">
          <div className="text-[10px] text-muted uppercase tracking-wide mb-1.5 px-1">可邀请的 Agent</div>
          <div className="space-y-0.5">
            {availableToInvite.map(agent => (
              <button
                key={agent.id}
                onClick={() => {
                  onAgentSelect?.(agent)
                  setShowInviteMenu(false)
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-hover transition-colors text-left"
              >
                {agent.avatar ? (
                  /^\p{Emoji}/u.test(agent.avatar) ? (
                    <span className="text-[14px]">{agent.avatar}</span>
                  ) : (
                    <img src={agent.avatar} alt={agent.name} className="w-5 h-5 rounded-full object-cover" />
                  )
                ) : (
                  <Bot size={12} className="text-green shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-primary truncate">{agent.name}</div>
                  {agent.description && (
                    <div className="text-[10px] text-muted truncate">{agent.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* Core members (User + Secretary) */}
        {coreMembers.map(member => (
          <button
            key={member.id}
            onClick={() => onMemberSelect(member.id)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 transition-colors text-left',
              activeMemberId === member.id ? 'bg-elevated' : 'hover:bg-surface-hover'
            )}
          >
            {renderAvatar(member)}
            <div className="flex-1 min-w-0">
              <div className={cn(
                'text-[13px] truncate',
                activeMemberId === member.id ? 'text-primary font-semibold' : 'text-primary font-medium'
              )}>
                {member.name}
              </div>
              {member.description && (
                <div className="text-[10px] text-muted truncate">{member.description}</div>
              )}
            </div>
            {member.isOnline && (
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            )}
          </button>
        ))}

        {/* Divider */}
        {agentMembers.length > 0 && (
          <button
            onClick={() => setAgentsExpanded(!agentsExpanded)}
            className="w-full flex items-center gap-1 px-3 py-1.5 hover:bg-surface-hover transition-colors"
          >
            {agentsExpanded ? (
              <ChevronDown size={12} className="text-muted" />
            ) : (
              <ChevronRight size={12} className="text-muted" />
            )}
            <span className="text-[11px] text-muted">
              子 Agent ({agentMembers.length})
            </span>
          </button>
        )}

        {/* Agent members */}
        {agentsExpanded && agentMembers.map(member => (
          <div key={member.id} className="relative group">
            <button
              onClick={() => onMemberSelect(member.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 transition-colors text-left',
                activeMemberId === member.id ? 'bg-elevated' : 'hover:bg-surface-hover'
              )}
            >
              {renderAvatar(member)}
              <div className="flex-1 min-w-0">
                <div className={cn(
                  'text-[13px] truncate',
                  activeMemberId === member.id ? 'text-primary font-semibold' : 'text-primary font-medium'
                )}>
                  {member.name}
                </div>
                {member.description && (
                  <div className="text-[10px] text-muted truncate">{member.description}</div>
                )}
              </div>
              {member.isActive && (
                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              )}
            </button>
            {/* Remove button on hover */}
            {onRemoveAgent && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveAgent(member.id)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded bg-surface border border-subtle opacity-0 group-hover:opacity-100 transition-opacity hover:bg-coral/10 hover:border-coral/30"
              >
                <X size={10} className="text-muted hover:text-coral" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Default group members for a new chat session
 */
export function getDefaultGroupMembers(): GroupMember[] {
  return [
    {
      id: 'user',
      name: '我',
      type: 'user',
      isOnline: true,
      description: '当前用户',
    },
    {
      id: 'secretary',
      name: '秘书',
      type: 'secretary',
      isOnline: true,
      description: '主 Agent - 任务协调者',
    },
  ]
}

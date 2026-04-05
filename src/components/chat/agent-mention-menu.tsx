'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { GroupMember } from './group-members-panel'

interface AgentMentionMenuProps {
  members: GroupMember[]
  selectedIndex: number
  onSelect: (member: GroupMember) => void
  filterQuery?: string
}

export function AgentMentionMenu({
  members,
  selectedIndex,
  onSelect,
  filterQuery = '',
}: AgentMentionMenuProps) {
  // Filter agents based on query (name match)
  const filteredMembers = useMemo(() => {
    if (!filterQuery) return members
    const q = filterQuery.toLowerCase()
    return members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q)
    )
  }, [members, filterQuery])

  if (filteredMembers.length === 0) return null

  return (
    <div className="absolute left-0 bottom-full mb-1 w-[220px] bg-surface border border-subtle rounded-xl shadow-lg z-50 p-1 animate-slide-down">
      <div className="px-2.5 pt-1.5 pb-0.5">
        <span className="text-[10px] font-semibold text-muted uppercase tracking-wide">选择 Agent</span>
      </div>
      <div className="py-1">
        {filteredMembers.map((member, idx) => (
          <button
            key={member.id}
            onClick={() => onSelect(member)}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-1.5 transition-colors text-left rounded-lg mx-1',
              idx === selectedIndex ? 'bg-elevated' : 'hover:bg-surface-hover'
            )}
          >
            {member.avatar ? (
              /^\p{Emoji}/u.test(member.avatar) ? (
                <span className="text-[14px]">{member.avatar}</span>
              ) : (
                <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-full object-cover" />
              )
            ) : (
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px]',
                member.type === 'user' ? 'bg-blue-500/10 text-blue-500' :
                member.type === 'secretary' ? 'bg-indigo/10 text-indigo' :
                'bg-green/10 text-green'
              )}>
                {member.type === 'user' ? 'U' : member.type === 'secretary' ? 'S' : 'A'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className={cn(
                'text-[12px] truncate',
                idx === selectedIndex ? 'text-primary font-semibold' : 'text-primary font-medium'
              )}>
                {member.name}
              </div>
              {member.description && (
                <div className="text-[10px] text-muted truncate">{member.description}</div>
              )}
            </div>
            {idx === selectedIndex && (
              <span className="text-[10px] text-indigo">按 Enter 选中</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Hook to manage @ mention state in chat input
 */
export function useAgentMention(
  input: string,
  onMentionSelect: (memberId: string, memberName: string) => void
) {
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [mentionQuery, setMentionQuery] = useState('')

  // Detect @ trigger
  useEffect(() => {
    const atIndex = input.lastIndexOf('@')
    if (atIndex === -1) {
      setMentionMenuOpen(false)
      return
    }

    // Check if @ is at the start or after whitespace
    const isValidTrigger = atIndex === 0 || /[\s\n]$/.test(input.slice(atIndex - 1, atIndex))
    if (!isValidTrigger) {
      setMentionMenuOpen(false)
      return
    }

    // Get text after @
    const textAfterAt = input.slice(atIndex + 1)
    // If there's a space after @, close the menu
    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      setMentionMenuOpen(false)
      return
    }

    // Set query and open menu
    setMentionQuery(textAfterAt)
    setMentionMenuOpen(true)
    setMentionIndex(0)
  }, [input])

  const handleMentionSelect = useCallback((member: GroupMember) => {
    const atIndex = input.lastIndexOf('@')
    const beforeAt = input.slice(0, atIndex)
    // Replace @ with @memberName
    const newInput = `${beforeAt}@${member.name} `
    onMentionSelect(member.id, newInput)
    setMentionMenuOpen(false)
  }, [input, onMentionSelect])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, members: GroupMember[]) => {
    if (!mentionMenuOpen) return false

    const filteredMembers = mentionQuery
      ? members.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase()))
      : members

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setMentionIndex(i => Math.min(i + 1, filteredMembers.length - 1))
        return true
      case 'ArrowUp':
        e.preventDefault()
        setMentionIndex(i => Math.max(i - 1, 0))
        return true
      case 'Tab':
      case 'Enter':
        if (filteredMembers[mentionIndex]) {
          e.preventDefault()
          handleMentionSelect(filteredMembers[mentionIndex])
          return true
        }
        break
      case 'Escape':
        e.preventDefault()
        setMentionMenuOpen(false)
        return true
    }
    return false
  }, [mentionMenuOpen, mentionIndex, mentionQuery, handleMentionSelect])

  return {
    mentionMenuOpen,
    mentionIndex,
    setMentionIndex,
    mentionQuery,
    handleMentionSelect,
    handleKeyDown,
  }
}

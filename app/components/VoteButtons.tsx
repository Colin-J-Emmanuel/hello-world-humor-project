'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type VoteButtonsProps = {
  captionId: string
  userId: string
}

export default function VoteButtons({ captionId, userId }: VoteButtonsProps) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitVote(voteValue: 1 | -1) {
    if (pending) return
    setPending(true)
    setError(null)

    const supabase = createClient()
    const now = new Date().toISOString()

    const { error: insertError } = await supabase.from('caption_votes').insert({
      vote_value: voteValue,
      profile_id: userId,
      caption_id: captionId,
      created_by_user_id: userId,
      modified_by_user_id: userId,
      is_from_study: false,
      created_datetime_utc: now,
      modified_datetime_utc: now,
    })

    if (insertError) {
      // Postgres unique_violation error code is 23505
      if (insertError.code === '23505') {
        setError("You've already voted on this caption.")
      } else {
        setError(insertError.message)
      }
      setPending(false)
      return
    }

    setVoted(voteValue === 1 ? 'up' : 'down')
    setPending(false)
  }

  const baseBtn: React.CSSProperties = {
    padding: '0.3rem 0.6rem',
    fontSize: '0.9rem',
    borderRadius: 6,
    border: '1px solid #ccc',
    background: '#fff',
    cursor: pending ? 'not-allowed' : 'pointer',
    opacity: pending ? 0.6 : 1,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <button
        onClick={() => submitVote(1)}
        disabled={pending}
        style={{
          ...baseBtn,
          background: voted === 'up' ? '#e6f4ea' : '#fff',
          borderColor: voted === 'up' ? '#34a853' : '#ccc',
        }}
        aria-label="Upvote"
      >
        ▲
      </button>
      <button
        onClick={() => submitVote(-1)}
        disabled={pending}
        style={{
          ...baseBtn,
          background: voted === 'down' ? '#fce8e6' : '#fff',
          borderColor: voted === 'down' ? '#ea4335' : '#ccc',
        }}
        aria-label="Downvote"
      >
        ▼
      </button>
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'crimson', marginLeft: '0.5rem' }}>
          {error}
        </span>
      )}
    </div>
  )
}
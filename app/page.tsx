import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import VoteButtons from './components/VoteButtons'

export const revalidate = 60

type Caption = {
  id: string
  content: string | null
  like_count: number
  created_datetime_utc: string
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Gated UI: logged-out users see a login prompt instead of the feed.
  if (!user) {
    return (
      <main
        style={{
          padding: '2rem',
          maxWidth: 480,
          margin: '4rem auto',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <h1 style={{ marginBottom: '0.5rem' }}>Top Captions</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Sign in to view the top captions from The Humor Project.
        </p>
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            borderRadius: 8,
            border: '1px solid #ccc',
            background: '#fff',
            color: '#000',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Sign in
        </Link>
      </main>
    )
  }

  // Logged-in: fetch and render the captions feed.
  const { data, error } = await supabase
    .from('captions')
    .select('id, content, like_count, created_datetime_utc')
    .eq('is_public', true)
    .order('like_count', { ascending: false })
    .limit(50)

  if (error) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1>Captions</h1>
        <p style={{ color: 'crimson' }}>Error loading captions: {error.message}</p>
      </main>
    )
  }

  const captions = (data ?? []) as Caption[]

  return (
    <main
      style={{
        padding: '2rem',
        maxWidth: 720,
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Top Captions</h1>
          <p style={{ color: '#666', margin: 0 }}>
            {captions.length} captions, ranked by likes.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            {user.email}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.85rem',
                borderRadius: 6,
                border: '1px solid #ccc',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          display: 'grid',
          gap: '0.75rem',
        }}
      >
        {captions.map((c) => (
          <li
            key={c.id}
            style={{
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <span style={{ fontSize: '1.05rem', flex: 1 }}>
              {c.content ?? '(no content)'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span
                style={{
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  color: '#444',
                  fontSize: '0.9rem',
                }}
              >
                ♥ {c.like_count}
              </span>
              <VoteButtons captionId={c.id} userId={user.id} />
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
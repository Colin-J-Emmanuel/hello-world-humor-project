import { supabase } from '@/lib/supabaseClient';

export const revalidate = 60; // re-fetch from Supabase at most once a minute

type Caption = {
  id: string;
  content: string | null;
  like_count: number;
  created_datetime_utc: string;
};

export default async function HomePage() {
  const { data, error } = await supabase
    .from('captions')
    .select('id, content, like_count, created_datetime_utc')
    .eq('is_public', true)
    .order('like_count', { ascending: false })
    .limit(50);

  if (error) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1>Captions</h1>
        <p style={{ color: 'crimson' }}>Error loading captions: {error.message}</p>
      </main>
    );
  }

  const captions = (data ?? []) as Caption[];

  return (
    <main style={{ padding: '2rem', maxWidth: 720, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Top Captions</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        {captions.length} captions from The Humor Project, ranked by likes.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
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
            <span style={{ fontSize: '1.05rem' }}>{c.content ?? '(no content)'}</span>
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
          </li>
        ))}
      </ul>
    </main>
  );
}

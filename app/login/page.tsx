'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error('Error signing in:', error.message)
    }
  }

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
      <h1 style={{ marginBottom: '0.5rem' }}>Welcome</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Sign in to view top captions from The Humor Project.
      </p>
      <button
        onClick={handleGoogleLogin}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: '#fff',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Sign in with Google
      </button>
    </main>
  )
}
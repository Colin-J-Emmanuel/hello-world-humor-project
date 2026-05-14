'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Caption = {
  id?: string
  content?: string
  text?: string
  caption?: string
  [key: string]: unknown
}

const API_BASE = 'https://api.almostcrackd.ai'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [captions, setCaptions] = useState<Caption[] | null>(null)
  const [pending, setPending] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setCaptions(null)
    setError(null)
    setStatus('')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(f ? URL.createObjectURL(f) : null)
  }

  async function getAccessToken(): Promise<string> {
    const supabase = createClient()
    const { data, error } = await supabase.auth.getSession()
    if (error) throw new Error(error.message)
    const token = data.session?.access_token
    if (!token) throw new Error('Not signed in. Go back and sign in first.')
    return token
  }

  async function runPipeline() {
    if (!file) {
      setError('Please choose an image first.')
      return
    }

    setPending(true)
    setError(null)
    setCaptions(null)

    try {
      const token = await getAccessToken()
      const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }

      // ----- Step 1: presigned URL -----
      setStatus('Step 1/4: Generating presigned upload URL…')
      const presignedRes = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ contentType: file.type }),
      })
      if (!presignedRes.ok) {
        throw new Error(`Step 1 failed: ${presignedRes.status} ${await presignedRes.text()}`)
      }
      const { presignedUrl, cdnUrl } = await presignedRes.json()

      // ----- Step 2: PUT bytes to S3 -----
      setStatus('Step 2/4: Uploading image bytes…')
      const putRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) {
        throw new Error(`Step 2 failed: ${putRes.status} ${await putRes.text()}`)
      }

      // ----- Step 3: register image URL -----
      setStatus('Step 3/4: Registering image with pipeline…')
      const registerRes = await fetch(`${API_BASE}/pipeline/upload-image-from-url`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
      })
      if (!registerRes.ok) {
        throw new Error(`Step 3 failed: ${registerRes.status} ${await registerRes.text()}`)
      }
      const { imageId } = await registerRes.json()

      // ----- Step 4: generate captions -----
      setStatus('Step 4/4: Generating captions…')
      const captionsRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ imageId }),
      })
      if (!captionsRes.ok) {
        throw new Error(`Step 4 failed: ${captionsRes.status} ${await captionsRes.text()}`)
      }
      const captionsJson = await captionsRes.json()

      // The API returns an array of caption records — be defensive about shape
      const captionsArray: Caption[] = Array.isArray(captionsJson)
        ? captionsJson
        : Array.isArray(captionsJson?.captions)
          ? captionsJson.captions
          : []

      setCaptions(captionsArray)
      setStatus('Done.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('')
    } finally {
      setPending(false)
    }
  }

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
          <h1 style={{ marginBottom: '0.25rem' }}>Upload an image</h1>
          <p style={{ color: '#666', margin: 0 }}>
            Pick an image and we&apos;ll generate captions for it.
          </p>
        </div>
        <Link
          href="/"
          style={{
            padding: '0.4rem 0.75rem',
            fontSize: '0.85rem',
            borderRadius: 6,
            border: '1px solid #ccc',
            background: '#fff',
            color: '#111',
            textDecoration: 'none',
          }}
        >
          ← Back to feed
        </Link>
      </header>

      <section style={{ marginBottom: '1.5rem' }}>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
          onChange={handleFileChange}
          disabled={pending}
        />
        <button
          onClick={runPipeline}
          disabled={!file || pending}
          style={{
            marginLeft: '0.75rem',
            padding: '0.5rem 1rem',
            fontSize: '0.95rem',
            borderRadius: 6,
            border: '1px solid #111',
            background: pending ? '#999' : '#111',
            color: '#fff',
            cursor: pending ? 'not-allowed' : 'pointer',
          }}
        >
          {pending ? 'Working…' : 'Generate captions'}
        </button>
      </section>

      {previewUrl && (
        <section style={{ marginBottom: '1.5rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Selected"
            style={{
              maxWidth: '100%',
              maxHeight: 480,
              borderRadius: 8,
              border: '1px solid #e5e5e5',
            }}
          />
        </section>
      )}

      {status && !error && (
        <p style={{ color: '#666', fontStyle: 'italic' }}>{status}</p>
      )}

      {error && (
        <p
          style={{
            color: '#a00',
            background: '#fee',
            padding: '0.75rem',
            borderRadius: 6,
            border: '1px solid #f5b5b5',
          }}
        >
          {error}
        </p>
      )}

      {captions && captions.length > 0 && (
        <section>
          <h2 style={{ marginBottom: '0.75rem' }}>Generated captions</h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.5rem' }}>
            {captions.map((c, i) => (
              <li
                key={c.id ?? i}
                style={{
                  border: '1px solid #e5e5e5',
                  borderRadius: 8,
                  padding: '0.75rem 1rem',
                  background: '#fafafa',
                }}
              >
                {c.content ?? c.text ?? c.caption ?? JSON.stringify(c)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {captions && captions.length === 0 && (
        <p style={{ color: '#666' }}>
          The API returned no captions for this image.
        </p>
      )}
    </main>
  )
}
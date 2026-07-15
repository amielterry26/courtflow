import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const BLANK = {
  title: '', category: '', difficulty: '', description: '', instructions: '', reps_or_time: '', video_url: '',
}

export default function DrillForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(BLANK)
  const [videoFile, setVideoFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef()

  useEffect(() => {
    if (isEdit) {
      supabase.from('drills').select('*').eq('id', id).single().then(({ data }) => {
        if (data) setForm(data)
      })
    }
  }, [id, isEdit])

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function handleVideoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 200 * 1024 * 1024) {
      setError('Video is too large (max 200 MB). Trim it shorter or compress before uploading.')
      return
    }
    setError('')
    setVideoFile(file)
  }

  async function uploadVideo(drillId) {
    const ext = videoFile.name.split('.').pop()
    const path = `drills/${drillId}/video.${ext}`
    const { error } = await supabase.storage
      .from('drill-videos')
      .upload(path, videoFile, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('drill-videos').getPublicUrl(path)
    return publicUrl
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = { ...form }

    if (isEdit) {
      if (videoFile) {
        setUploading(true)
        try {
          payload.video_url = await uploadVideo(id)
        } catch {
          setError('Video upload failed. Try again.')
          setSaving(false)
          setUploading(false)
          return
        }
        setUploading(false)
      }
      const { error } = await supabase.from('drills').update(payload).eq('id', id)
      if (error) { setError(error.message); setSaving(false); return }
      navigate(`/drills/${id}`)
    } else {
      // Create drill first to get ID, then upload video
      const { data: newDrill, error: insertError } = await supabase.from('drills').insert(payload).select().single()
      if (insertError) { setError(insertError.message); setSaving(false); return }

      if (videoFile) {
        setUploading(true)
        try {
          const videoUrl = await uploadVideo(newDrill.id)
          await supabase.from('drills').update({ video_url: videoUrl }).eq('id', newDrill.id)
        } catch {
          // Non-fatal — drill was created, video just didn't upload
        }
        setUploading(false)
      }
      navigate(`/drills/${newDrill.id}`)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this drill?')) return
    await supabase.from('drills').delete().eq('id', id)
    navigate('/drills')
  }

  const videoSrc = videoFile ? URL.createObjectURL(videoFile) : form.video_url

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        {isEdit
          ? <Link to={`/drills/${id}`} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">← Back</Link>
          : <Link to="/drills" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">← Back</Link>
        }
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{isEdit ? 'Edit Drill' : 'New Drill'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
          <Field label="Title *" value={form.title} onChange={set('title')} required />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category *</label>
              <select required value={form.category} onChange={set('category')}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select</option>
                {['warmup','recovery','strength & conditioning','defense','footwork','finishing','shooting','ball handling','live action'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Difficulty *</label>
              <select required value={form.difficulty} onChange={set('difficulty')}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <Field label="Reps / Time (e.g. 3×10 or 2 mins)" value={form.reps_or_time} onChange={set('reps_or_time')} />
          <TextArea label="Description" value={form.description} onChange={set('description')} />
          <TextArea label="Instructions" value={form.instructions} onChange={set('instructions')} rows={5} />
        </div>

        {/* Video */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Demo Video</h2>

          {videoSrc ? (
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden bg-zinc-900 aspect-video">
                <video src={videoSrc} controls playsInline className="w-full h-full object-contain" />
              </div>
              <button
                type="button"
                onClick={() => { setVideoFile(null); setForm(f => ({ ...f, video_url: '' })) }}
                className="text-xs text-red-400 hover:text-red-500"
              >
                Remove video
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-400 text-sm hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              {videoFile ? videoFile.name : 'Tap to upload video'}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoSelect}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pb-6">
          <button type="submit" disabled={saving}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50">
            {uploading ? 'Uploading video...' : saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create drill'}
          </button>
          {isEdit && (
            <button type="button" onClick={handleDelete}
              className="px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 text-red-600 dark:text-red-400 font-medium transition-colors">
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>
      <input type={type} required={required} value={value ?? ''} onChange={onChange}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}

function TextArea({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</label>
      <textarea value={value ?? ''} onChange={onChange} rows={rows}
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
    </div>
  )
}

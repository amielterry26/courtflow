import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CATEGORY_LABELS = {
  warmup: 'Warm-Up',
  recovery: 'Recovery',
  'strength & conditioning': 'Strength & Conditioning',
  defense: 'Defense',
  footwork: 'Footwork',
  finishing: 'Finishing',
  shooting: 'Shooting',
  'ball handling': 'Ball Handling',
  'live action': 'Live Action',
  IQ: 'Basketball IQ',
}

const DIFF_COLORS = {
  beginner: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  intermediate: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  advanced: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
}

export default function DrillDetail() {
  const { id } = useParams()
  const [drill, setDrill] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('drills').select('*').eq('id', id).single().then(({ data }) => {
      setDrill(data)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">Loading...</div>
  if (!drill) return <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">Drill not found.</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <Link to="/drills" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-sm">← Back</Link>
        <Link
          to={`/drills/${id}/edit`}
          className="text-sm text-blue-600 dark:text-blue-400 font-medium"
        >
          Edit
        </Link>
      </div>

      {/* Title + badges */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">{drill.title}</h1>
        <div className="flex flex-wrap gap-2">
          {drill.category && (
            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-3 py-1 rounded-full font-medium">
              {CATEGORY_LABELS[drill.category] ?? drill.category}
            </span>
          )}
          {drill.difficulty && (
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${DIFF_COLORS[drill.difficulty]}`}>
              {drill.difficulty}
            </span>
          )}
          {drill.reps_or_time && (
            <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-medium">
              {drill.reps_or_time}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {drill.description && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <h2 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">Description</h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{drill.description}</p>
        </div>
      )}

      {/* Instructions */}
      {drill.instructions && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <h2 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">Instructions</h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{drill.instructions}</p>
        </div>
      )}

      {/* Video */}
      {drill.video_url && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <h2 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-3">Demo Video</h2>
          <div className="rounded-xl overflow-hidden bg-zinc-900 aspect-video">
            <video src={drill.video_url} controls playsInline className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}

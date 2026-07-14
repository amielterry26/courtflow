import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Intake() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [newShareLink, setNewShareLink] = useState(null)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    supabase
      .from('intake_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSubmissions(data ?? [])
        setLoading(false)
      })
  }, [])

  async function approve(sub) {
    setNewShareLink(null)
    const { data: newAthlete, error } = await supabase.from('athletes').insert({
      first_name: sub.child_name.split(' ')[0] ?? sub.child_name,
      last_name: sub.child_name.split(' ').slice(1).join(' ') || '',
      age: sub.age,
      grade: sub.grade,
      school: sub.school,
      team: sub.team,
      skill_level: sub.skill_level,
      goals: sub.goals,
      strengths: sub.strengths,
      weaknesses: sub.weaknesses,
      parent_name: sub.parent_name,
      parent_phone: sub.parent_phone,
      parent_email: sub.parent_email,
      status: 'active',
    }).select().single()

    if (!error && newAthlete) {
      await supabase.from('intake_submissions').update({ reviewed: true }).eq('id', sub.id)
      setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, reviewed: true } : s))
      const link = `${window.location.origin}/athlete/${newAthlete.share_token}`
      setNewShareLink({ name: sub.child_name, url: link })
      setLinkCopied(false)
    }
  }

  async function dismiss(id) {
    await supabase.from('intake_submissions').update({ reviewed: true }).eq('id', id)
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, reviewed: true } : s))
  }

  const pending = submissions.filter(s => !s.reviewed)
  const reviewed = submissions.filter(s => s.reviewed)

  const intakeUrl = `${window.location.origin}/intake/form`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Intake</h1>
      </div>

      {/* Newly approved athlete share link */}
      {newShareLink && (
        <div className="bg-green-50 dark:bg-green-950 rounded-2xl border border-green-200 dark:border-green-800 p-4 mb-4">
          <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">
            ✓ {newShareLink.name} added as athlete
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 break-all font-mono mb-3">{newShareLink.url}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(newShareLink.url)
                setLinkCopied(true)
              }}
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              {linkCopied ? '✓ Copied!' : 'Copy parent link'}
            </button>
            <button
              onClick={() => setNewShareLink(null)}
              className="text-xs text-green-600 dark:text-green-400 px-3 py-1.5"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Share link */}
      <div className="bg-blue-50 dark:bg-blue-950 rounded-2xl border border-blue-100 dark:border-blue-900 p-4 mb-5">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Parent intake form link</p>
        <p className="text-xs text-blue-600 dark:text-blue-400 break-all mb-3 font-mono">{intakeUrl}</p>
        <button
          onClick={() => navigator.clipboard.writeText(intakeUrl)}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          Copy link
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400 text-sm">Loading...</div>
      ) : (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                Pending ({pending.length})
              </p>
              <div className="space-y-3">
                {pending.map(s => (
                  <SubmissionCard key={s.id} sub={s} onApprove={approve} onDismiss={dismiss} />
                ))}
              </div>
            </div>
          )}

          {pending.length === 0 && (
            <div className="text-center py-10 text-zinc-400 dark:text-zinc-600 mb-6">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">No pending submissions</p>
            </div>
          )}

          {/* Reviewed */}
          {reviewed.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
                Reviewed ({reviewed.length})
              </p>
              <div className="space-y-2">
                {reviewed.map(s => (
                  <div key={s.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 px-4 py-3 opacity-60">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{s.child_name}</p>
                    <p className="text-xs text-zinc-400">{s.parent_name} · {new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SubmissionCard({ sub, onApprove, onDismiss }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{sub.child_name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {sub.parent_name} · {new Date(sub.created_at).toLocaleDateString()}
            </p>
          </div>
          {sub.skill_level && (
            <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full capitalize">
              {sub.skill_level}
            </span>
          )}
        </div>

        <button onClick={() => setExpanded(e => !e)} className="text-xs text-blue-500 mt-2">
          {expanded ? 'Show less ▲' : 'Show details ▼'}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2 text-sm border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <InfoRow label="Age / Grade" value={[sub.age, sub.grade ? `Grade ${sub.grade}` : null].filter(Boolean).join(' · ')} />
            <InfoRow label="School / Team" value={[sub.school, sub.team].filter(Boolean).join(' / ')} />
            <InfoRow label="Parent phone" value={sub.parent_phone} />
            <InfoRow label="Parent email" value={sub.parent_email} />
            <InfoRow label="Goals" value={sub.goals} />
            <InfoRow label="Strengths" value={sub.strengths} />
            <InfoRow label="Weaknesses" value={sub.weaknesses} />
          </div>
        )}
      </div>

      <div className="flex border-t border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => onApprove(sub)}
          className="flex-1 py-2.5 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
        >
          ✓ Approve → Athlete
        </button>
        <button
          onClick={() => onDismiss(sub.id)}
          className="flex-1 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-l border-zinc-100 dark:border-zinc-800 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <span className="text-zinc-400 dark:text-zinc-500">{label}: </span>
      <span className="text-zinc-700 dark:text-zinc-300">{value}</span>
    </div>
  )
}

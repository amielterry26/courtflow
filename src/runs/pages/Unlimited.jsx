import { Link, useSearchParams } from 'react-router-dom'
import { getMe } from '../lib/me'
import { basePath } from '../lib/division'
import { membershipLink, useSettings } from '../lib/pay'
import SiteHeader from '../components/SiteHeader'

// Unlimited membership page — the Stripe subscription lives behind the button
export default function Unlimited({ division }) {
  const settings = useSettings(division)
  const me = getMe(division)
  const link = settings ? membershipLink(settings, me?.player_id) : ''
  const youth = division === 'youth'
  const [params] = useSearchParams()
  const subscribed = params.has('subscribed')

  return (
    <div className="min-h-screen overflow-x-clip bg-court text-fg">
      <SiteHeader division={division} page="unlimited" />

      <main className="mx-auto max-w-xl px-4 pb-16 pt-10 sm:pt-16">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-hoop">
          <span className="h-px w-6 bg-hoop" /> {youth ? 'Youth · HS/MS' : 'Membership'}
        </p>
        <h1 className="mt-3 font-display text-[64px] font-black uppercase leading-[0.85] tracking-tight sm:text-[88px]">
          Unlimited<br /><span className="text-hoop">Runs.</span>
        </h1>

        {subscribed && (
          <div className="mt-6 rounded-2xl border border-good/30 bg-good/10 p-4 text-good">
            <p className="font-display text-2xl font-extrabold uppercase">You're Unlimited 🏀</p>
            <p className="text-sm">Thanks for subscribing. Next time you join a run, just pick your name. Nothing to pay.</p>
          </div>
        )}

        <div className="card mt-8 overflow-hidden">
          <div className="border-b border-line p-6">
            <p className="font-display text-6xl font-black leading-none">
              {settings ? `$${Number(settings.member_price)}` : '—'}<span className="text-2xl text-muted">/month</span>
            </p>
            <ul className="mt-5 space-y-2.5 text-[15px]">
              {[
                youth ? 'Every youth run, as many as you want' : 'Every run, as many as you want',
                'Nothing to pay at the door. Pick your name and you’re in',
                'See who else is running',
                'Cancel anytime',
              ].map(t => (
                <li key={t} className="flex gap-3"><span className="font-bold text-hoop">✓</span>{t}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-3 p-6">
            {link ? (
              <a href={link} target="_blank" rel="noopener noreferrer" className="btn-primary w-full py-4 text-lg">
                Subscribe with Stripe
              </a>
            ) : (
              <button disabled className="btn-primary w-full py-4 text-lg">Sign-ups open soon</button>
            )}
            <p className="text-center text-xs text-muted">
              Secure checkout by Stripe. Use the same phone number you signed up with and you're marked Unlimited right away.
            </p>
            {settings?.stripe_portal_url && (
              <a href={settings.stripe_portal_url} target="_blank" rel="noopener noreferrer"
                className="block text-center text-sm text-muted underline underline-offset-2">
                Already a member? Manage or cancel
              </a>
            )}
          </div>
        </div>

        <Link to={`${basePath(division)}/`} className="btn-ghost mt-6 w-full">← Back to the runs</Link>
      </main>
    </div>
  )
}

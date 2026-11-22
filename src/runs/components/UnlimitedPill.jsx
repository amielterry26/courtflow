import { Link } from 'react-router-dom'
import { basePath } from '../lib/division'
import { useSettings } from '../lib/pay'

// Floating "Unlimited runs" button, bottom center
export default function UnlimitedPill({ division }) {
  const settings = useSettings(division)
  if (!settings) return null
  return (
    <Link to={`${basePath(division)}/unlimited`}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-hoop px-5 py-3 font-display text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_10px_30px_-8px_rgb(var(--hoop))] transition hover:bg-hoop-dark">
      <span className="text-xl leading-none">♾</span>
      Unlimited runs · ${Number(settings.member_price)}/mo
    </Link>
  )
}

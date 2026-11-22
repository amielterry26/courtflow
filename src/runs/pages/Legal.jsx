import { Link } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'
import SmsConsent from '../components/SmsConsent'

// Privacy Policy, Terms & Conditions and SMS opt-in pages (required for carrier A2P registration)
const BRAND = 'CourtFlow Hoops'
const TEXT_NUMBER = '(725) 543-9054'
const UPDATED = 'November 21, 2026'

function Page({ title, children }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-court text-fg">
      <SiteHeader division="adult" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-10">
        <h1 className="font-display text-5xl font-black uppercase leading-none tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted">{BRAND} · Last updated {UPDATED}</p>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-fg/85 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:uppercase [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
        <p className="mt-10 text-sm text-muted">
          <Link to="/privacy" className="underline">Privacy Policy</Link> · <Link to="/terms" className="underline">Terms &amp; Conditions</Link> · <Link to="/" className="underline">Back to the runs</Link>
        </p>
      </main>
    </div>
  )
}

export function Privacy() {
  return (
    <Page title="Privacy Policy">
      <p>{BRAND} runs invite-only pickup basketball runs in Las Vegas. This policy explains what we collect on runs.courtflowhoops.com and how we use it.</p>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Your first and last name and mobile phone number, when you request to join or sign up through an invite link</li>
          <li>Which runs you sign up for and how you chose to pay</li>
          <li>Whether you agreed to receive text messages</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To manage run rosters and approve players</li>
          <li>To text you about runs you signed up for (approval, reminders) if you opted in</li>
          <li>To track payments for runs and memberships</li>
        </ul>
      </section>
      <section>
        <h2>Sharing</h2>
        <p><b>We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.</b> Your information is only shared with the service providers that run this site (database hosting, text message delivery and payment processing) to provide the service. Other players on a run may see your first name and last initial on that run's roster.</p>
      </section>
      <section>
        <h2>Text messages</h2>
        <p>If you opt in, {BRAND} texts you from {TEXT_NUMBER} about runs you signed up for. Reply STOP to opt out at any time, or HELP for help. See our <Link to="/terms" className="underline">Terms &amp; Conditions</Link>.</p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>Text HELP to {TEXT_NUMBER} to ask us to update or delete your information.</p>
      </section>
    </Page>
  )
}

export function Terms() {
  return (
    <Page title="Terms & Conditions">
      <p>These terms cover use of runs.courtflowhoops.com and {BRAND} pickup runs.</p>
      <section>
        <h2>Runs</h2>
        <p>Runs are invite only. Spots are first come, first served, and runs may be changed or cancelled. Players take part at their own risk and agree to play respectfully.</p>
      </section>
      <section>
        <h2>Payments &amp; membership</h2>
        <p>Drop-in runs are paid per run. The Unlimited membership is a monthly subscription billed through Stripe and can be cancelled anytime through the customer portal link on the site.</p>
      </section>
      <section>
        <h2>SMS Terms</h2>
        <ul>
          <li><b>Program:</b> {BRAND} run notifications. Messages include join approvals and day-before run reminders with time and location.</li>
          <li><b>How you opt in:</b> by checking the text message box when requesting to join or signing up on runs.courtflowhoops.com. Opting in is not required to play.</li>
          <li><b>Frequency:</b> message frequency varies, typically a few messages per run you sign up for.</li>
          <li><b>Message and data rates may apply.</b></li>
          <li><b>Opt out:</b> reply STOP to {TEXT_NUMBER} at any time. You'll get one confirmation text and no more messages.</li>
          <li><b>Help:</b> reply HELP to {TEXT_NUMBER}.</li>
          <li>Carriers are not liable for delayed or undelivered messages.</li>
        </ul>
      </section>
      <section>
        <h2>Privacy</h2>
        <p>See our <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
      </section>
    </Page>
  )
}

// Public page showing exactly how people opt in to texts (for the carrier registration form)
export function SmsOptIn() {
  return (
    <Page title="Text Messages">
      <p>{BRAND} sends text messages from {TEXT_NUMBER} only to players who opt in. Players opt in on this website when they request to join a run or sign up through an invite link: after entering their name and phone number, they can check the box below. It is unchecked by default and not required to play.</p>
      <div className="card p-4">
        <p className="label">What players see on the sign-up form</p>
        <div className="mt-2 grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <input className="input" placeholder="First name" disabled />
          <input className="input" placeholder="Last name" disabled />
        </div>
        <input className="input mt-3" placeholder="Phone" disabled />
        <div className="mt-3"><SmsConsent checked={false} onChange={() => {}} /></div>
      </div>
      <section>
        <h2>Messages we send</h2>
        <ul>
          <li>"You're approved for CourtFlow Hoops runs, Josh 🏀 Tap to lock in your spot for Sun 11/23: [link] Reply STOP to opt out."</li>
          <li>"🏀 Josh, you're on for the CourtFlow Hoops run tomorrow, Sun 11/23 · 9–11 AM. Impact Basketball, 4640 W Sunset Rd… Directions: [link]. You're paid ✅ See you on the court!"</li>
        </ul>
      </section>
      <p>Reply STOP to opt out or HELP for help. Message and data rates may apply. Message frequency varies.</p>
    </Page>
  )
}

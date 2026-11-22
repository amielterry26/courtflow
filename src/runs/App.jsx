import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Unlimited from './pages/Unlimited'
import Invite from './pages/Invite'
import Admin from './pages/admin/Admin'
import { Privacy, Terms, SmsOptIn } from './pages/Legal'

// key={division} so switching Adult ↔ Youth starts each page fresh
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home key="adult" division="adult" />} />
        <Route path="/unlimited" element={<Unlimited key="adult" division="adult" />} />
        <Route path="/youth" element={<Home key="youth" division="youth" />} />
        <Route path="/youth/unlimited" element={<Unlimited key="youth" division="youth" />} />
        <Route path="/invite/:token" element={<Invite />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/sms" element={<SmsOptIn />} />
      </Routes>
    </BrowserRouter>
  )
}

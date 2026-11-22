import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Invite from './pages/Invite'
import Admin from './pages/admin/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/invite/:token" element={<Invite />} />
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Today from './pages/Today'
import Athletes from './pages/Athletes'
import AthleteDetail from './pages/AthleteDetail'
import AthleteForm from './pages/AthleteForm'
import Drills from './pages/Drills'
import DrillForm from './pages/DrillForm'
import Sessions from './pages/Sessions'
import SessionDetail from './pages/SessionDetail'
import SessionForm from './pages/SessionForm'
import Intake from './pages/Intake'
import IntakeForm from './pages/IntakeForm'
import AthletePublicView from './pages/AthletePublicView'
import WeeklySchedule from './pages/WeeklySchedule'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/intake/form" element={<IntakeForm />} />
            <Route path="/athlete/:token" element={<AthletePublicView />} />

            {/* Protected trainer routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Today />} />
                    <Route path="/schedule" element={<WeeklySchedule />} />

                    <Route path="/athletes" element={<Athletes />} />
                    <Route path="/athletes/new" element={<AthleteForm />} />
                    <Route path="/athletes/:id" element={<AthleteDetail />} />
                    <Route path="/athletes/:id/edit" element={<AthleteForm />} />

                    <Route path="/drills" element={<Drills />} />
                    <Route path="/drills/new" element={<DrillForm />} />
                    <Route path="/drills/:id" element={<DrillForm />} />

                    <Route path="/sessions" element={<Sessions />} />
                    <Route path="/sessions/new" element={<SessionForm />} />
                    <Route path="/sessions/:id" element={<SessionDetail />} />
                    <Route path="/sessions/:id/edit" element={<SessionForm />} />

                    <Route path="/intake" element={<Intake />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AdminDashboard from './pages/AdminDashboard'
import UploadPage from './pages/UploadPage'
import DisplayPage from './pages/DisplayPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/upload/:roomCode" element={<UploadPage />} />
        <Route path="/display/:roomCode" element={<DisplayPage />} />
      </Routes>
    </Router>
  )
}

export default App

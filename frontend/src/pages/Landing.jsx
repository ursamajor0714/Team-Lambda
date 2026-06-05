// [React 전환] 기존 templaters/landing.html 대체
import { Link } from 'react-router-dom'
import logo from '../assets/Logo.png'

export default function Landing() {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
      <Link to="/home" style={{ display: 'inline-block' }}>
  <img src={logo} alt="Logo" width="700px" />
</Link>
<div style={{ display: 'inline-block', textAlign: 'left' }}>
  <h1>
    <span style={{ background: 'linear-gradient(90deg, #f97316, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>keunho Yu</span><br/>
    <span style={{ background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Jinhwi Im</span><br/>
    <span style={{ background: 'linear-gradient(90deg, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>seoyoung Kim</span>
  </h1>
</div>

    </div>
  )
}

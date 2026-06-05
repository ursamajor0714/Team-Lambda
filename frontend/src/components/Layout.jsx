import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/Symbol.png'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate('/')
  }

  const [stats, setStats] = useState(null)
  const [dark, setDark] = useState(false)

  const toggleDark = () => {
    setDark(d => {
      document.body.classList.toggle('dark', !d)
      return !d
    })
  }

  useEffect(() => {
    api.postList({ page: 1 }).then(setStats)
  }, [])

  return (
    <>
      <nav className="nav" style={{ position: 'relative' }}>
        <div className="stats" style={{ fontSize: 13, color: '#666' }}>
          {stats && (
            <>
              <span>오늘 글 {stats.today_posts}</span>
              <span>오늘 댓글 {stats.today_comments}</span>
              <span>오늘 방문자 {stats.today_visitors}</span>
            </>
          )}
        </div>
        <Link to="/home" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <img src={logo} alt="logo" height="45" />
        </Link>
        <div className="spacer" />
        <button className="btn" onClick={toggleDark}>{dark ? '🌞' : '🌙'}</button>
        {user ? (
          <>
            <span>{user.username}님</span>
            <Link to="/change-password" className="btn">비밀번호 변경</Link>
            <button className="btn" onClick={onLogout}>로그아웃</button>
          </>
        ) : (
          <>
            <Link to="/login">로그인</Link>
            <Link to="/register">회원가입</Link>
          </>
        )}
      </nav>

      {/* 메인 레이아웃 구조 수정 */}
      <div className="container" style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginTop: 20 }}>
        
{/* Layout.jsx 내 사이드바 부분 */}
<aside className="sticky-sidebar">
  <div style={{ padding: '0 16px 12px', fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', letterSpacing: '0.05em' }}>
    MENU
  </div>
  <ul className="sidebar-menu">
    <li><Link to="/home" className="sidebar-link">🏠 전체보기</Link></li>
    <li><Link to="/home?tag=%23일상" className="sidebar-link">🌱 일상</Link></li>
    <li><Link to="/home?tag=%23개그" className="sidebar-link">😂 개그</Link></li>
    <li><Link to="/home?tag=%23정보공유" className="sidebar-link">ℹ️ 정보공유</Link></li>
    <li><Link to="/home?tag=%23여행" className="sidebar-link">✈️ 여행</Link></li>
    <li><Link to="/home?tag=%23요리" className="sidebar-link">🍳 요리</Link></li>
    <li><Link to="/home?tag=%23기타" className="sidebar-link">📦 기타</Link></li>
    
    <div className="sidebar-divider" />
    
    <li><Link to="/popular" className="sidebar-link">🔥 인기글</Link></li>
    <li><Link to="/notice" className="sidebar-link">📢 공지사항</Link></li>
  </ul>
</aside>

        {/* 페이지별 콘텐츠가 표시되는 영역 */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <Outlet />
        </main>

      </div>
    </>
  )
}

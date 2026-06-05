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
            {user.is_admin && (
              <Link to="/admin" className="btn">관리자</Link>
            )}
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
      <div className="container">
        <Outlet />
      </div>
    </>
  )
}

// 로그인 페이지
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
      navigate('/home')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 320, margin: '40px auto' }}>
      <h2>로그인</h2>
      <div className="field">
        <label className="label">아이디</label>
        <input className="input" value={username} onChange={e => setUsername(e.target.value)} />
      </div>
      <div className="field">
        <label className="label">비밀번호</label>
        <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }}>로그인</button>
    </form>
  )
}

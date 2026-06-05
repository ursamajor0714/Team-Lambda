// [React 전환] 기존 templaters/register.html + views.register + forms.CustomRegisterForm 대체
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password1, setPassword1] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await register(username, password1, password2)
      navigate('/home')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 320, margin: '40px auto' }}>
      <h2>회원가입</h2>
      <div className="field">
        <label className="label">아이디 (영문/숫자, 13자 이하)</label>
        <input className="input" value={username} onChange={e => setUsername(e.target.value)} />
      </div>
      <div className="field">
        <label className="label">비밀번호</label>
        <input type="password" className="input" value={password1} onChange={e => setPassword1(e.target.value)} />
      </div>
      <div className="field">
        <label className="label">비밀번호 확인</label>
        <input type="password" className="input" value={password2} onChange={e => setPassword2(e.target.value)} />
      </div>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }}>가입</button>
    </form>
  )
}

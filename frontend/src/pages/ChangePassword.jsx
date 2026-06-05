import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function ChangePassword() {
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    api.ensureCsrf()
  }, [])
  const [success, setSuccess] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await api.changePassword(currentPassword, newPassword, newPassword2)
      setSuccess('비밀번호가 변경되었습니다!')
      setTimeout(() => navigate('/home'), 1500)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h2>비밀번호 변경</h2>
      <div className="field">
        <label className="label">현재 비밀번호</label>
        <input className="input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
      </div>
      <div className="field">
        <label className="label">새 비밀번호</label>
        <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
      </div>
      <div className="field">
        <label className="label">새 비밀번호 확인</label>
        <input className="input" type="password" value={newPassword2} onChange={e => setNewPassword2(e.target.value)} />
      </div>
      {error && <div className="error">{error}</div>}
      {success && <div style={{ color: 'green', fontSize: 13, marginTop: 8 }}>{success}</div>}
      <button className="btn btn-primary">변경</button>
    </form>
  )
}
똥똥

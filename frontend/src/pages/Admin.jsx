// =============================================================================
// pages/Admin.jsx — 관리자 유저 관리 화면
// -----------------------------------------------------------------------------
// 📌 이 화면이 하는 일:
//   유저 목록을 표로 보여주고, 각 유저별로
//   아이디변경 / 비번초기화 / 정지 / 정지해제 / 관리자지정 / 계정삭제 를 한다.
//
// 📌 보안 메모:
//   맨 위 useEffect의 "가드"가 관리자 아닌 사람을 홈으로 쫓아낸다.
//   하지만 이건 화면용 1차 방어일 뿐이고, 진짜 방어는 백엔드(requireAdmin)가 한다.
//   (디자인은 최소화했다. 동작 먼저 확인하고 나중에 꾸미면 된다.)
// =============================================================================

import { useEffect, useState } from 'react'
import { useNavigate, Link  } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export default function Admin() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

  // 🔒 가드: 로딩이 끝났는데 관리자가 아니면 홈으로 보낸다.
  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) navigate('/home')
  }, [loading, user, navigate])

  // 유저 목록 새로고침
  const reload = () => {
    api
      .adminUsers()
      .then((d) => setUsers(d.users))
      .catch((e) => setError(e.message))
  }
  useEffect(() => {
    reload()
  }, [])

  // 공통 처리: API 호출 → 알림 → 목록 새로고침
  const run = async (promise) => {
    try {
      const res = await promise
      if (res && res.detail) alert(res.detail)
      reload()
    } catch (e) {
      alert(e.message)
    }
  }

  const onBan = (u) => {
    const days = Number(prompt(`${u.username} 정지 일수 (1 / 3 / 7 / 15 / 30)`))
    if (!days) return
    run(api.adminBan(u.id, days))
  }

  const onChangeName = (u) => {
    const name = prompt('새 아이디 (영문/숫자 13자 이하)', u.username)
    if (!name || name === u.username) return
    run(api.adminChangeUsername(u.id, name))
  }

  const onResetPw = (u) => {
    if (!confirm(`${u.username} 비밀번호를 '0000'으로 초기화할까요?`)) return
    run(api.adminResetPassword(u.id, '0000'))
  }

  const onDelete = (u) => {
    if (!confirm(`${u.username} 계정을 정말 삭제할까요? (되돌릴 수 없음)`)) return
    run(api.adminDeleteUser(u.id))
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>관리자 · 유저 관리</h2>
      <Link to="/admin/deleted-posts" className="btn" style={{ marginBottom: 16, display: 'inline-block' }}>🗑️ 삭제된 글 관리</Link>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>아이디</th>
            <th>관리자</th>
            <th>상태</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.username}</td>
              <td>{u.is_super ? '⭐ 오너' : u.is_admin ? '✅ 관리자' : ''}</td>
              <td>
                {u.is_banned ? `정지중 (~${u.banned_until})` : '정상'}
              </td>
              <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {u.is_super ? (
                  // 오너(king) 행은 아무도 건드릴 수 없게 버튼을 숨긴다.
                  <span style={{ color: '#888' }}>오너 계정 (보호됨)</span>
                ) : (
                  <>
                    <button onClick={() => onChangeName(u)}>아이디변경</button>
                    <button onClick={() => onResetPw(u)}>비번초기화</button>
                    {u.is_banned ? (
                      <button onClick={() => run(api.adminUnban(u.id))}>
                        정지해제
                      </button>
                    ) : (
                      <button onClick={() => onBan(u)}>정지</button>
                    )}
                    {/* 권한 주고 뺏기는 오너(king)만 가능 → 오너일 때만 버튼 노출 */}
                    {user?.is_super && (
                      <button
                        onClick={() => run(api.adminSetRole(u.id, u.is_admin ? 0 : 1))}
                      >
                        {u.is_admin ? '관리자해제' : '관리자지정'}
                      </button>
                    )}
                    <button onClick={() => onDelete(u)} style={{ color: 'red' }}>
                      계정삭제
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

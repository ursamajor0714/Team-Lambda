// =============================================================================
// pages/DeletedPosts.jsx — 삭제된 글 관리 (관리자 전용)
// =============================================================================

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export default function DeletedPosts() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [error, setError] = useState('')

  // 🔒 관리자 아니면 홈으로
  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) navigate('/home')
  }, [loading, user, navigate])

  const reload = () => {
    api.adminDeletedPosts()
      .then(d => setPosts(d.posts))
      .catch(e => setError(e.message))
  }

  useEffect(() => { reload() }, [])

  const onRestore = async (id) => {
    if (!confirm('이 글을 복구할까요?')) return
    try {
      const res = await api.adminRestorePost(id)
      if (res.detail) alert(res.detail)
      reload()
    } catch (e) {
      alert(e.message)
    }
  }

  const onPermanentDelete = async (id) => {
    if (!confirm('완전 삭제하면 되돌릴 수 없어요. 정말 삭제할까요?')) return
    try {
      const res = await api.adminPermanentDelete(id)
      if (res.detail) alert(res.detail)
      reload()
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <button className="btn" onClick={() => navigate('/admin')}>← 관리자 페이지</button>
        <h2 style={{ margin: 0 }}>삭제된 글 관리</h2>
        <span style={{ color: '#888', fontSize: 13 }}>총 {posts.length}개</span>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {posts.length === 0 ? (
        <p style={{ color: '#888' }}>삭제된 글이 없어요.</p>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 60 }}>ID</th>
              <th>제목</th>
              <th style={{ width: 100 }}>작성자</th>
              <th style={{ width: 140 }}>작성일</th>
              <th style={{ width: 160 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.title}</td>
                <td>{p.user}</td>
                <td>{new Date(p.date).toLocaleString()}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn" onClick={() => onRestore(p.id)}>복구</button>
                  <button className="btn" style={{ color: 'red' }} onClick={() => onPermanentDelete(p.id)}>완전삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
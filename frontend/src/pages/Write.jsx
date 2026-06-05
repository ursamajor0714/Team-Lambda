import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext' // 1. useAuth 임포트 추가

const TAGS = ['#일상', '#개그', '#정보공유', '#여행', '#요리', '#기타']

export default function Write() {
  const navigate = useNavigate()
  const { user } = useAuth() // 2. 로그인 유저 정보 가져오기
  
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tag, setTag] = useState('#기타')
  const [isNotice, setIsNotice] = useState(false)
  const [error, setError] = useState('')

  // 3. 관리자 여부 확인 (아이디가 'admin'인 경우만 true)
  const isAdmin = user && user.username === 'admin'

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { id } = await api.postCreate(title, content, tag, isNotice) 
      navigate(`/post/${id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h2>글쓰기</h2>
      
      {/* 4. isAdmin이 true일 때만 체크박스 노출 */}
      {isAdmin && (
        <div className="field" style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input 
              type="checkbox" 
              checked={isNotice} 
              onChange={e => setIsNotice(e.target.checked)}
              style={{ width: 18, height: 18 }} 
            />
            <span>📢 이 글을 공지사항으로 등록합니다</span>
          </label>
        </div>
      )}

      <div className="field">
        <label className="label">제목</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} maxLength={30} />
        {title.length >= 25 && <div className="error">제목은 30자 이내로 작성해주세요. ({title.length}/30)</div>}
      </div>
      
      <div className="field">
        <label className="label">태그</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TAGS.map(t => (
            <button key={t} type="button" className={`btn ${tag === t ? 'btn-primary' : ''}`} onClick={() => setTag(t)}>{t}</button>
          ))}
        </div>
      </div>
      
      <div className="field">
        <label className="label">내용</label>
        <textarea className="textarea" value={content} onChange={e => setContent(e.target.value)} />
      </div>
      
      {error && <div className="error">{error}</div>}
      <button className="btn btn-primary">작성</button>
    </form>
  )
}

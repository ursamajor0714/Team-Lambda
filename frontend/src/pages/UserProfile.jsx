import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'

export default function UserProfile() {
  const { username } = useParams()
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('posts')

  useEffect(() => {
    api.userProfile(username).then(setData)
  }, [username])

  if (!data) return <p>로딩중...</p>

  return (
    <div className="card">

      {/* 헤더 */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <img
          src={data.avatar || '/default-avatar.svg'}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            objectFit: 'cover'
          }}
        />
        <div>
          <h2>{data.username}</h2>
          <p style={{ color: '#888', fontSize: 13 }}>
            글 {data.postCount} · 댓글 {data.commentCount}
          </p>
        </div>
      </div>

      {/* 탭 버튼 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn" onClick={() => setTab('posts')}>작성글</button>
        <button className="btn" onClick={() => setTab('likes')}>좋아요</button>
        <button className="btn" onClick={() => setTab('comments')}>댓글</button>
        <button className="btn" onClick={() => setTab('guest')}>방명록</button>
      </div>

      {/* 내용 영역 */}
      <div style={{ marginTop: 20 }}>

        {tab === 'posts' && (
          <ul>
            {data.posts.map(p => (
              <li key={p.id}>{p.title}</li>
            ))}
          </ul>
        )}

        {tab === 'likes' && (
          <p>좋아요한 글 리스트 (API 추가 필요)</p>
        )}

        {tab === 'comments' && (
          <p>댓글 리스트 (API 추가 필요)</p>
        )}

        {tab === 'guest' && (
          <p>방명록 (추후 구현)</p>
        )}

      </div>
    </div>
  )
}
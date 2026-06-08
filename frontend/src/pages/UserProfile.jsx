import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

function PostsTab({ username }) {
  const [posts, setPosts] = useState(null)
  useEffect(() => {
    api.userProfile(username).then(d => setPosts(d.posts))
  }, [username])
  if (!posts) return <p>로딩중...</p>
  if (posts.length === 0) return <p style={{ color: '#888' }}>작성한 글이 없어요.</p>
  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {posts.map(p => (
        <li key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
          <a href={`/post/${p.id}`}>{p.title}</a>
          <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{new Date(p.date).toLocaleDateString()}</span>
        </li>
      ))}
    </ul>
  )
}

// ── 삭제된 글 탭 ──────────────────────────────────────────────────────
function DeletedPostsTab({ username }) {
  const [posts, setPosts] = useState(null)

  const load = () => api.myDeletedPosts(username).then(d => setPosts(d.posts))

  useEffect(() => { load() }, [username])

  if (!posts) return <p>로딩중...</p>
  if (posts.length === 0) return <p style={{ color: '#888' }}>삭제된 글이 없어요.</p>

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {posts.map(p => (
        <li key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee', color: '#aaa' }}>
          <span style={{ textDecoration: 'line-through' }}>{p.title}</span>
          <span style={{ fontSize: 12, marginLeft: 8 }}>{new Date(p.date).toLocaleDateString()}</span>
        </li>
      ))}
    </ul>
  )
}

// ── 댓글 탭 ───────────────────────────────────────────────────────────
function CommentTab({ username }) {
  const [comments, setComments] = useState(null)

  useEffect(() => {
    api.userComments(username).then(d => setComments(d.comments))
  }, [username])

  if (!comments) return <p>로딩중...</p>
  if (comments.length === 0) return <p style={{ color: '#888' }}>작성한 댓글이 없어요.</p>

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {comments.map(c => (
        <li key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
          <a href={`/post/${c.post_id}`} style={{ fontSize: 13, color: '#888' }}>{c.post_title}</a>
          <div>{c.content}</div>
          <span style={{ color: '#aaa', fontSize: 12 }}>{new Date(c.date).toLocaleDateString()}</span>
        </li>
      ))}
    </ul>
  )
}

// ── 방명록 탭 ─────────────────────────────────────────────────────────
function GuestbookTab({ username }) {
  const { user } = useAuth()
  const [entries, setEntries] = useState(null)
  const [input, setInput] = useState('')

  const load = () => api.guestbookList(username).then(d => setEntries(d.entries))

  useEffect(() => { load() }, [username])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    await api.guestbookWrite(username, input)
    setInput('')
    load()
  }

  const onDelete = async (id) => {
    await api.guestbookDelete(username, id)
    load()
  }

  if (!entries) return <p>로딩중...</p>

  return (
    <div>
      {user && (
        <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input className="input" value={input} onChange={e => setInput(e.target.value)} placeholder="방명록을 남겨보세요" />
          <button className="btn btn-primary" style={{ width: 60 }}>작성</button>
        </form>
      )}
      {entries.length === 0 && <p style={{ color: '#888' }}>아직 방명록이 없어요.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {entries.map(e => (
          <li key={e.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 13 }}>{e.author}</strong>
              <span style={{ color: '#aaa', fontSize: 12 }}>{new Date(e.date).toLocaleDateString()}</span>
            </div>
            <div style={{ marginTop: 4 }}>{e.content}</div>
            {user && (user.username === e.author || user.username === username) && (
              <button className="btn" style={{ fontSize: 12, marginTop: 4 }} onClick={() => onDelete(e.id)}>삭제</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────
export default function UserProfile() {
  const { username } = useParams()
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('posts')
  // 메인 컴포넌트 안에서 user 가져오기
  const { user } = useAuth()
  const isMe = user?.username === username
  const [showPwForm, setShowPwForm] = useState(false) 
  const [pwForm, setPwForm] = useState({ current: '', next: '', next2: '' }) 
  const [pwMsg, setPwMsg] = useState('') 

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
          style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }}
        />
        <div>
          <h2>{data.username}</h2>
          <p style={{ color: '#888', fontSize: 13 }}>
            글 {data.postCount} · 댓글 {data.commentCount}
          </p>
          {isMe && (
            <button className="btn" style={{ fontSize: 12, marginTop: 4 }} onClick={() => { setShowPwForm(v => !v); setPwMsg('') }}>
              🔑 비밀번호 변경
            </button>)}
        </div>
      </div>

      {/* 비밀번호 변경 폼 */}
      {isMe && showPwForm && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300 }}>
          <input className="input" type="password" placeholder="현재 비밀번호" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
          <input className="input" type="password" placeholder="새 비밀번호" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
          <input className="input" type="password" placeholder="새 비밀번호 확인" value={pwForm.next2} onChange={e => setPwForm(f => ({ ...f, next2: e.target.value }))} />
          <button className="btn btn-primary" onClick={async () => {
            try {
              const res = await api.changePassword(pwForm.current, pwForm.next, pwForm.next2)
              setPwMsg(res.detail || '변경되었습니다.')
              setPwForm({ current: '', next: '', next2: '' })
            } catch (e) {
              setPwMsg(e.message)
            }
          }}>변경</button>
          {pwMsg && <p style={{ fontSize: 13, color: '#888' }}>{pwMsg}</p>}
        </div>
      )}

      {/* 탭 버튼 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn" onClick={() => setTab('posts')}>작성글</button>
        <button className="btn" onClick={() => setTab('likes')}>좋아요</button>
        <button className="btn" onClick={() => setTab('comments')}>댓글</button>
        <button className="btn" onClick={() => setTab('guest')}>방명록</button>
        {isMe && <button className="btn" onClick={() => setTab('deleted')}>🗑️ 삭제된 글</button>}
      </div>

      {/* 내용 영역 */}
      <div style={{ marginTop: 20 }}>

      {tab === 'posts' && <PostsTab username={username} />}

        {tab === 'comments' && <CommentTab username={username} />}
        {tab === 'guest' && <GuestbookTab username={username} />}
        {tab === 'likes' && <CommentTab username={username} />}
        {isMe && tab === 'deleted' && <DeletedPostsTab username={username} />}

      </div>
    </div>
  )
}

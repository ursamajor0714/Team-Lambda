import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function PostDetail() {
  const { pk } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [commentInput, setCommentInput] = useState('')
  const [shareMsg, setShareMsg] = useState(false)
  const [replyInput, setReplyInput] = useState({})
const [showReply, setShowReply] = useState({})
const [bestId, setBestId] = useState(null)

const load = () => api.postDetail(pk).then(data => {
  setPost(data)
  const best = [...data.comments].sort((a, b) => ((b.likes||0)-(b.hates||0)) - ((a.likes||0)-(a.hates||0)))[0]
  setBestId(best && best.likes > 0 ? best.id : null)
})

  useEffect(() => { load() }, [pk])

  const onLike = async () => {
    const { likes } = await api.likePost(pk)
    setPost({ ...post, likes })
  }

  const onHate = async () => {
    if (!user) { alert('싫어요는 로그인 후 이용 가능합니다.'); return }
    try {
      const { hates } = await api.hatePost(pk)
      setPost({ ...post, hates })
    } catch (e) {
      alert(e.message)
    }
  }

  const onComment = async (e) => {
    e.preventDefault()
    if (!commentInput.trim()) return
    await api.commentCreate(pk, commentInput)
    setCommentInput('')
    load()
  }

  const onDelete = async () => {
    if (!confirm('삭제하시겠습니까?')) return
    try {
      await api.postDelete(pk)
      navigate('/home')
    } catch (e) {
      alert(e.message)
    }
  }

  const onShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setShareMsg(true)
    setTimeout(() => setShareMsg(false), 2000)
  }

  const onCommentLike = async (cid, type) => {
    const { likes, hates } = await api.commentLike(pk, cid, type)
    setPost({
      ...post,
      comments: post.comments.map(c => ({
        ...c,
        likes: c.id === cid ? likes : c.likes,
        hates: c.id === cid ? hates : c.hates,
        replies: c.replies.map(r => r.id === cid ? { ...r, likes, hates } : r)
      }))
    })
    await load()
  }
  
  const onReply = async (e, parentId) => {
    e.preventDefault()
    if (!replyInput[parentId]?.trim()) return
    await api.commentCreate(pk, replyInput[parentId], parentId)
    setReplyInput({ ...replyInput, [parentId]: '' })
    load()
  }

  // 댓글/대댓글 삭제 (본인 또는 관리자만 버튼이 보인다)
  const onDeleteComment = async (cid) => {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return
    try {
      await api.commentDelete(pk, cid)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  // 이 댓글을 지울 수 있는 사람인가? (로그인했고, 본인 댓글이거나 관리자)
  const canDeleteComment = (c) =>
    user && (user.is_admin || user.username === c.user)

  if (!post) return <p>불러오는 중…</p>

  return (
    <article>
      {shareMsg && (
        <div style={{
  position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
  background: '#e0e0e0', color: '#222', padding: '12px 24px', borderRadius: 8,pointerEvents: 'none',
  userSelect: 'none',
  animation: 'fadeout 2s forwards', zIndex: 9999
}}>
    링크가 저장되었습니다! 이제 Ctrl + v 로 공유하세요!
  </div>
)}



      {/* 1. 게시글 정보 */}
      <div className="post-header"><h2 style={{ textAlign: 'center' }}>{post.title}</h2>

      {/* 2. 유저 정보 (좋아요/싫어요 버튼 포함) - 기존엔 아래쪽에 있던 버튼을 여기로 이동 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', fontSize: 13, marginBottom: 16 }}>
  <span>{post.user} · {new Date(post.date).toLocaleString()}</span>
  <div style={{ display: 'flex', gap: 8 }}>
    <button className="btn" onClick={() => window.location.href=`/home?query=${post.user}&search_type=user`}>글검색</button>
    <button className="btn" onClick={onShare}>공유</button>
    <button className="btn">신고</button>
    <button className="btn" onClick={onLike}>👍 {post.likes}</button>
    <button className="btn" onClick={onHate}>👎 {post.hates}</button>
  </div>
</div>
</div>

      {/* 3. 게시글 내용 */}
      <div className="post-content">{post.content}</div>


{/* 4. 댓글 목록 */}
<div className="post-comments"><h3>댓글 ({post.comments.length})</h3>
<ul style={{ listStyle: 'none', padding: 0 }}>
  {(bestId ? [post.comments.find(c => c.id === bestId), ...post.comments.filter(c => c.id !== bestId)] : post.comments).map((c, index) => (
    <li key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
      <strong>{c.user}</strong>
      {index === 0 && bestId && <span style={{ color: '#2563eb', fontSize: 12, marginLeft: 6 }}>⭐ Best</span>}
      · <span style={{ color: '#888', fontSize: 12 }}>{new Date(c.date).toLocaleString()}</span>
      <div>{c.content}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="btn" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => onCommentLike(c.id, 'like')}>👍 {c.likes}</button>
        <button className="btn" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => onCommentLike(c.id, 'hate')}>👎 {c.hates}</button>
        <button className="btn" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => setShowReply({ ...showReply, [c.id]: !showReply[c.id] })}>답글</button>
        {canDeleteComment(c) && (
          <button className="btn" style={{ fontSize: 12, padding: '2px 8px', color: 'red' }} onClick={() => onDeleteComment(c.id)}>삭제</button>
        )}
      </div>

      {/* 대댓글 목록 */}
      {c.replies && c.replies.length > 0 && (
        <ul style={{ listStyle: 'none', padding: '0 0 0 24px', marginTop: 8 }}>
          {c.replies.map(r => (
            <li key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
              <strong>{r.user}</strong> · <span style={{ color: '#888', fontSize: 12 }}>{new Date(r.date).toLocaleString()}</span>
              <div>{r.content}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => onCommentLike(r.id, 'like')}>👍 {r.likes}</button>
                <button className="btn" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => onCommentLike(r.id, 'hate')}>👎 {r.hates}</button>
                {canDeleteComment(r) && (
                  <button className="btn" style={{ fontSize: 12, padding: '2px 8px', color: 'red' }} onClick={() => onDeleteComment(r.id)}>삭제</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 대댓글 작성칸 */}
      {showReply[c.id] && (
        <form onSubmit={e => onReply(e, c.id)} style={{ display: 'flex', gap: 8, marginTop: 8, paddingLeft: 24 }}>
          <button className="btn btn-primary" style={{ width: '60px' }}>작성</button>
          <input className="input" value={replyInput[c.id] || ''} onChange={e => setReplyInput({ ...replyInput, [c.id]: e.target.value })} placeholder="답글을 입력하세요" />
        </form>
      )}
    </li>
  ))}
</ul>

      {/* 5. 댓글 작성칸 - 기존과 동일 */}
      <form onSubmit={onComment} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <button className="btn btn-primary" style={{ width: '60px' }}>작성</button>
        <input className="input" value={commentInput} onChange={e => setCommentInput(e.target.value)} placeholder="댓글을 입력하세요" />
      </form>
      </div>

      {/* 6. 이전/다음글 - 기존엔 좋아요 아래에 있었는데 댓글 작성칸 아래로 이동 */}
      <div className="post-footer">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    {post.next_post
      ? <Link to={`/post/${post.next_post.id}`}><span>다음글</span></Link>
      : <span>다음글</span>}
    <span style={{ flex: 1, textAlign: 'center' }}>{post.next_post && <Link to={`/post/${post.next_post.id}`}>{post.next_post.title}</Link>}</span>
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    {post.prev_post
      ? <Link to={`/post/${post.prev_post.id}`}><span>이전글</span></Link>
      : <span>이전글</span>}
    <span style={{ flex: 1, textAlign: 'center' }}>{post.prev_post && <Link to={`/post/${post.prev_post.id}`}>{post.prev_post.title}</Link>}</span>
  </div>
</div>

      {/* 7. 목록 버튼, 삭제버튼 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
  <button className="btn" onClick={() => navigate('/home')}>목록</button>
  {user && (user.username === post.user || user.is_admin) && (
    <>
      <button className="btn" onClick={() => navigate(`/post/${pk}/edit`)}>수정</button>
      <button className="btn" onClick={onDelete}>삭제</button>
    </>

  )}
</div>
</div>
    </article>
  )
}

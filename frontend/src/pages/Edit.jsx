import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'

const TAGS = ['#일상', '#개그', '#정보공유', '#여행', '#요리', '#기타']

export default function Edit() {
  const { pk } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tag, setTag] = useState('#기타')
  const [error, setError] = useState('')

  useEffect(() => {
    api.postDetail(pk).then(post => {
      setTitle(post.title)
      setContent(post.content)
      setTag(post.tag || '#기타')
    })
  }, [pk])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.postUpdate(pk, title, content, tag)
      navigate(`/post/${pk}`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h2>글 수정</h2>
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
      <button className="btn btn-primary">수정</button>
    </form>
  )
}

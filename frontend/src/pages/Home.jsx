import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import Footer from '../components/Footer'

export default function Home() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const query = params.get('query') || ''
  const searchType = params.get('search_type') || 'title'
  const searchPeriod = params.get('search_period') || 'all'
  const page = parseInt(params.get('page') || '1', 10)
  const pageSize = parseInt(params.get('page_size') || '20', 10)
  const tag = params.get('tag') || ''


  useEffect(() => {
    setLoading(true)
    api.postList({ query, search_type: searchType, search_period: searchPeriod, page, page_size: pageSize, tag, })
      .then(setData)
      .finally(() => setLoading(false))
  }, [query, searchType, searchPeriod, page, pageSize, tag,])

  const onSearch = (e) => {
    e.preventDefault()
    const f = new FormData(e.target)
    setParams({
      query: f.get('query') || '',
      search_type: f.get('search_type'),
      search_period: f.get('search_period'),
      page: '1',
    })
  }

  const onPageSize = (size) => {
    setParams({ ...Object.fromEntries(params), page: '1', page_size: String(size) })
  }

  if (loading || !data) return <p>불러오는 중…</p>

  return (
    <>
    
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
  <span>게시글표시</span>
  <select className="select" style={{ width: 80 }} value={pageSize} onChange={e => onPageSize(Number(e.target.value))}>
    <option value={20}>20</option>
    <option value={50}>50</option>
    <option value={100}>100</option>
  </select>
  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
  {['', '#일상', '#개그', '#정보공유', '#여행', '#요리', '#기타'].map(t => (
    <button key={t} className={`btn ${tag === t ? 'btn-primary' : ''}`}
      onClick={() => setParams({ ...Object.fromEntries(params), page: '1', tag: t })}>
      {t || '전체'}
    </button>
  ))}
</div>
</div>
      <table>
        <thead>
          <tr>
            <th style={{ width: 60 }}>번호</th>
            <th>제목</th>
            <th style={{ width: 100 }}>작성자</th>
            <th style={{ width: 60 }}>조회</th>
            <th style={{ width: 60 }}>👍</th>
            <th style={{ width: 60 }}>👎</th>
            <th style={{ width: 80 }}>작성일</th>
          </tr>
        </thead>
        <tbody>
          {data.posts.map(p => {
            const date = new Date(p.date)
            const now = new Date()
            const isToday = date.toDateString() === now.toDateString()
            const dateStr = isToday
              ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
              : `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`

            return (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>
  <Link to={`/post/${p.id}`}>{p.title.length > 30 ? p.title.slice(0, 30) + '...' : p.title} ({p.comment_count})</Link>
  {p.tag && p.tag !== '#기타' && <span style={{ fontSize: 11, color: '#2563eb', marginLeft: 4 }}>{p.tag}</span>}
</td>
                <td>{p.user}</td>
                <td>{p.views}</td>
                <td>{p.likes}</td>
                <td>{p.hates}</td>
                <td>{dateStr}</td>
              </tr>
            )
          })}
          {data.posts.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center' }}>글이 없습니다.</td></tr>}
        </tbody>
      </table>

      <div className="pagination" style={{ position: 'relative' }}>
      <Link to="/write" className="btn btn-primary" style={{ position: 'absolute', left: 0 }}>글쓰기</Link>
        <button className="btn" disabled={page <= 1}
          onClick={() => setParams({ ...Object.fromEntries(params), page: String(page - 1) })}>이전</button>
        <span style={{ padding: '6px 12px' }}>{page}</span>
        <button className="btn" disabled={!data.has_next}
          onClick={() => setParams({ ...Object.fromEntries(params), page: String(page + 1) })}>다음</button>

      </div>

      <form onSubmit={onSearch} style={{ display: 'flex', gap: 8, marginBottom: 12, marginTop: 20 }}>
        <select name="search_type" defaultValue={searchType} className="select" style={{ width: 120 }}>
          <option value="title">제목</option>
          <option value="content">내용</option>
          <option value="title_content">제목+내용</option>
          <option value="user">작성자</option>
        </select>
        <select name="search_period" defaultValue={searchPeriod} className="select" style={{ width: 120 }}>
          <option value="all">전체기간</option>
          <option value="today">오늘</option>
          <option value="week">일주일</option>
          <option value="month">한달</option>
        </select>
        <input name="query" defaultValue={query} placeholder="검색어" className="input" />
        <button className="btn btn-primary">검색</button>
      </form>
      <Footer/>
    </>
  )
}

안녕하세요

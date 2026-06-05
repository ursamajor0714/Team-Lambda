import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import Footer from '../components/Footer'

export default function Notice() {
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
    // 공지사항 데이터만 불러오도록 api.postList에 특정 필터(예: is_notice 등)를 추가하거나 별도 API 사용
    api.postList({ query, search_type: searchType, search_period: searchPeriod, page, page_size: pageSize, tag, is_notice: true })
      .then(setData)
      .finally(() => setLoading(false))
  }, [query, searchType, searchPeriod, page, pageSize, tag])

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 상단 헤더 영역 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <h2 style={{ margin: 0, marginRight: 'auto' }}>📢 공지사항</h2>
        <select className="select" style={{ width: 80 }} value={pageSize} onChange={e => onPageSize(Number(e.target.value))}>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* 태그 필터링 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['', '#중요', '#업데이트', '#이벤트', '#안내'].map(t => (
          <button key={t} className={`btn ${tag === t ? 'btn-primary' : ''}`}
            onClick={() => setParams({ ...Object.fromEntries(params), page: '1', tag: t })}>
            {t || '전체'}
          </button>
        ))}
      </div>

      {/* 테이블 목록 */}
      <table>
        <thead>
          <tr>
            <th style={{ width: 60 }}>번호</th>
            <th>제목</th>
            <th style={{ width: 100 }}>작성자</th>
            <th style={{ width: 60 }}>조회</th>
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
                  <Link to={`/post/${p.id}`}>{p.title}</Link>
                  {p.tag && <span style={{ fontSize: 11, color: '#2563eb', marginLeft: 4 }}>{p.tag}</span>}
                </td>
                <td>{p.user}</td>
                <td>{p.views}</td>
                <td>{dateStr}</td>
              </tr>
            )
          })}
          {data.posts.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center' }}>공지사항이 없습니다.</td></tr>}
        </tbody>
      </table>

      {/* 페이징 (글쓰기 버튼 제거됨) */}
      <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
        <button className="btn" disabled={page <= 1}
          onClick={() => setParams({ ...Object.fromEntries(params), page: String(page - 1) })}>이전</button>
        <span style={{ padding: '6px 12px' }}>{page}</span>
        <button className="btn" disabled={!data.has_next}
          onClick={() => setParams({ ...Object.fromEntries(params), page: String(page + 1) })}>다음</button>
      </div>

      {/* 검색 폼 */}
      <form onSubmit={onSearch} style={{ display: 'flex', gap: 8, marginBottom: 12, marginTop: 20 }}>
        <select name="search_type" defaultValue={searchType} className="select" style={{ width: 120 }}>
          <option value="title">제목</option>
          <option value="content">내용</option>
        </select>
        <input name="query" defaultValue={query} placeholder="공지사항 검색" className="input" />
        <button className="btn btn-primary">검색</button>
      </form>
      <Footer />
    </div>
  )
}

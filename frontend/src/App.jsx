// [React 전환] 기존 myapp/urls.py 의 페이지 라우팅을 React Router로 옮긴 것.
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Home from './pages/Home'
import PostDetail from './pages/PostDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Write from './pages/Write'
import Edit from './pages/Edit'
import UserProfile from './pages/UserProfile'
import ChangePassword from './pages/ChangePassword'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      {/* 랜딩은 네비게이션 없이 단독 화면 */}
      <Route path="/" element={<Landing />} />

      {/* 나머지는 공통 레이아웃 안에서 */}
      <Route element={<Layout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/post/:pk" element={<PostDetail />} />
        <Route path="/write" element={<Write />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/post/:pk/edit" element={<Edit />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/user/:username" element={<UserProfile />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
    </Routes>
  )
}

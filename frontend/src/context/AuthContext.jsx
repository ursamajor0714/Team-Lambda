// 로그인 상태를 앱 전체에서 공유하기 위한 Context.
//   한번 로그인 정보를 받아서 컨텍스트에 들고 다닌다.
import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)        // { username } or null
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 앱 로딩 시 1회: CSRF 토큰 확보 + 현재 로그인 상태 조회
    ;(async () => {
      try {
        await api.ensureCsrf()
        const me = await api.me()
        if (me.is_authenticated)
          setUser({
            username: me.username,
            is_admin: !!me.is_admin,
            is_super: !!me.is_super,
          })
      } catch (e) {
        console.error('초기 인증 조회 실패', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const login = async (username, password) => {
    await api.login(username, password)
    // 로그인 응답엔 is_admin이 없으므로, me를 다시 불러 관리자/오너 여부까지 받아온다.
    const me = await api.me()
    setUser({
      username: me.username,
      is_admin: !!me.is_admin,
      is_super: !!me.is_super,
    })
  }

  const logout = async () => {
    await api.logout()
    setUser(null)
  }

  const register = async (username, password1, password2) => {
    const res = await api.register(username, password1, password2)
    setUser({ username: res.username, is_admin: false, is_super: false })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

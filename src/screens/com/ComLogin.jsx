import { useState } from 'react'
import { tran } from '@teammoca/react-tran'
import './ComLogin.css'

// 로그인 화면 — MOCA /ui/com/COM_LOGIN.html 대응.
// 셸(App.jsx)이 부팅 시 tran.sessionCheck() 로 세션을 확인하고, 미로그인이면 이 화면만 보여준다.
// 서버 계정은 H2 T_MEMBER — 데모 계정 moca/moca (MOCA LoginController 참고).
//
// props
//   onSuccess : 로그인 성공 시 (user) 로 호출 — 셸이 세션 상태를 갱신한다
function ComLogin({ onSuccess }) {
  const [id, setId] = useState('moca')
  const [pw, setPw] = useState('moca')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      const { ok, message, user } = await tran.login(id, pw)
      if (ok) onSuccess?.(user)
      else setMsg(message || '로그인에 실패했습니다.')
    } catch (err) {
      setMsg(`통신 오류: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="com-login">
      <form className="com-login-box" onSubmit={submit}>
        <div className="com-login-logo">
          <svg className="com-login-mark" viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="19" fill="#1f66f2" />
            <ellipse cx="20" cy="20" rx="12" ry="5" fill="none" stroke="#fff" strokeWidth="2.2" transform="rotate(30 20 20)" />
            <ellipse cx="20" cy="20" rx="12" ry="5" fill="none" stroke="#fff" strokeWidth="2.2" transform="rotate(-30 20 20)" />
            <circle cx="20" cy="20" r="2.6" fill="#fff" />
          </svg>
          <span>MOCA React</span>
        </div>
        <div className="com-login-sub">MOCA 서버(8080) 세션으로 로그인합니다</div>
        <input
          className="com-login-input"
          placeholder="아이디"
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoFocus
        />
        <input
          className="com-login-input"
          type="password"
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <button className="com-login-btn" type="submit" disabled={busy}>
          {busy ? '로그인중…' : '로그인'}
        </button>
        {msg && <div className="com-login-msg">{msg}</div>}
        <div className="com-login-divider" />
        <div className="com-login-hint">데모 계정 <b>moca</b> / <b>moca</b></div>
      </form>
    </div>
  )
}

export default ComLogin

import { MocaReactLayout } from '@teammoca/react-layout'
import ComTitle from './com/ComTitle'
import './Notice.css'

const notices = [
  { id: 1, title: 'moca_react 프로젝트 오픈', date: '2026-08-13', writer: '관리자' },
  { id: 2, title: 'MDI 화면 구조 적용 안내', date: '2026-08-13', writer: '관리자' },
  { id: 3, title: '신규 컴포넌트 등록 가이드', date: '2026-08-12', writer: '개발팀' },
]

function Notice({ menuInfo }) {
  return (
    // 화면 골격 표준: 루트 div(패딩) → MocaReactLayout → ComTitle + 내용 (moca-react-screen 스킬)
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto">
        <ComTitle menu={menuInfo} />
        <ul className="notice-list">
          {notices.map((n) => (
            <li key={n.id} className="notice-item">
              <span className="notice-title">{n.title}</span>
              <span className="notice-meta">{n.writer} · {n.date}</span>
            </li>
          ))}
        </ul>
      </MocaReactLayout>
    </div>
  )
}

export default Notice

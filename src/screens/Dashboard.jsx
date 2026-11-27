import { MocaReactLayout } from '@teammoca/react-layout'
import ComTitle from './com/ComTitle'
import './Dashboard.css'

const stats = [
  { label: '전체 사원', value: '5명' },
  { label: '부서 수', value: '4개' },
  { label: '이번 달 신규', value: '1명' },
  { label: '평균 연령', value: '33세' },
]

function Dashboard({ menuInfo }) {
  return (
    // 화면 골격 표준: 루트 div(패딩) → MocaReactLayout → ComTitle + 내용 (moca-react-screen 스킬)
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto">
        <ComTitle menu={menuInfo} />
        <div className="dashboard">
          <div className="stat-grid">
            {stats.map((s) => (
              <div className="stat-card" key={s.label}>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="dashboard-note">
            moca_react MDI 데모 대시보드입니다. 새 컴포넌트는
            <code> src/screens/registry.jsx </code>에 등록하면 메뉴에 자동으로 나타납니다.
          </p>
        </div>
      </MocaReactLayout>
    </div>
  )
}

export default Dashboard

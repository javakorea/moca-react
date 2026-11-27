import { MocaReactGrid } from '@teammoca/react-grid'
import { MocaReactLayout } from '@teammoca/react-layout'
import ComTitle from './com/ComTitle'

// 가상 스크롤 데모 — 10만 행을 만들어도 DOM 에는 보이는 구간만 그려진다
const depts = ['개발팀', '기획팀', '디자인팀', '영업팀', '인사팀']
const sampleData = Array.from({ length: 100000 }, (_, i) => ({
  id: i + 1,
  name: `사원${i + 1}`,
  dept: depts[i % depts.length],
  salary: (3000 + (i % 50) * 100) * 1000, // 숫자 그대로 — 표시 서식은 컬럼의 format 이 맡는다
  joined: `${2010 + (i % 15)}-${String((i % 12) + 1).padStart(2, '0')}-01`,
  // 행상태 데모 — 편집 기능이 붙기 전까지는 데이터에 심어서 표시를 확인한다 (C:신규 U:수정 D:삭제)
  _status: i % 17 === 1 ? 'C' : i % 17 === 2 ? 'U' : i % 17 === 3 ? 'D' : '',
}))

// 'id'(번호) 컬럼은 두지 않는다 — 그리드가 기본으로 붙이는 특수컬럼 행번호와 같은 값이라
// 같은 숫자가 두 줄 나온다(2026-08-19). 데이터에는 남아 있으니 필요하면 다시 세우면 된다
const columns = [
  // 이름은 폭을 주지 않는다 — "남은 폭을 흡수하는 칸"이 되어, 넓은 화면에서는 넓어지고
  // 좁은 화면에서도 고정폭 컬럼을 줄인 만큼 몫이 커진다. 고정폭은 내용이 들어갈 만큼만:
  // 부서 4자 · 연봉 "3,000,000" · 입사일 "2010-01-01" + 정렬·필터 버튼 자리(약 33px)
  { key: 'name', title: '이름' },
  { key: 'dept', title: '부서', width: 110 },
  // 연봉은 **숫자로 들고 format 으로 콤마를 찍는다** — 콤마 박힌 문자열로 두면 정렬이 문자
  // 비교로 떨어져 "900,000 > 1,000,000" 이 된다(자릿수가 다른 순간 틀린다)
  { key: 'salary', title: '연봉(원)', width: 130, align: 'right',
    format: (v) => Number(v).toLocaleString() },
  { key: 'joined', title: '입사일', width: 124 },
]

function GridTest({ menuInfo }) {
  return (
    // 화면 골격 표준: 루트 div(패딩) → MocaReactLayout → ComTitle + 내용 (moca-react-screen 스킬)
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto">
        <ComTitle menu={menuInfo} />
        {/* 행높이(rowHeightSelect)·찾기(search)는 그리드 자체 기능 — 툴바에 나타난다.
            선택한 행 번호와 검색 결과는 그리드가 자기 푸터 왼쪽에 표시하므로
            화면이 따로 줄을 만들어 보여주지 않는다(2026-08-19) */}
        {/* 정렬·필터(sortable/filterable)는 그리드에 한 번 주면 데이터 컬럼 전부에 붙는다.
            이름 컬럼은 고유값이 10만이라 필터를 열면 "쓸 수 없다"고 알려준다 — 상한 가드를
            일부러 보이는 자리에 뒀다(실제 화면이라면 그 컬럼만 filterable={false} 로 끈다). */}
        <MocaReactGrid columns={columns} data={sampleData} label="대용량 데이터"
          rowHeightSelect search sortable filterable />
      </MocaReactLayout>
    </div>
  )
}

export default GridTest

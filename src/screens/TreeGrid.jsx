import { MocaReactGrid } from '@teammoca/react-grid'
import { MocaReactLayout } from '@teammoca/react-layout'
import { useSelect } from '@teammoca/react-tran'
import ComTitle from './com/ComTitle'

// 트리그리드 (메뉴 계층) — **실 데이터**: MOCA 서버(8080)의 selectDemoMenuDemoList 로
// H2 DB 의 TDEMO_MENU_DEMO 를 조회한다. SQL 이 계층순으로 정렬해 내려주므로
// (ORDER BY 부모 SORT_ORDER, 최상위 우선, SORT_ORDER) 평면 목록 + DEPTH 만으로 트리가 된다
// — MOCA celltype="tree" 와 같은 계약(PATH 는 정렬 수단이고, 정렬만 보장되면 필요 없다).
const columns = [
  // 트리 컬럼 — cellType/levelKey/labelKey/treeKey = MOCA data-m-celltype/levelid/labelid/treeid
  { key: 'TREE', title: '메뉴', cellType: 'tree', levelKey: 'DEPTH', labelKey: 'MENU_NM', treeKey: 'MENU_ID', width: 260 },
  { key: 'MENU_ID', title: '메뉴ID', width: 90, align: 'center' },
  { key: 'DEPTH', title: 'DEPTH', width: 60, align: 'center' },
  { key: 'PARENT_NM', title: '상위메뉴', width: 120 },
  { key: 'MENU_URL', title: 'URL' },
  { key: 'USE_YN', title: '사용', width: 50, align: 'center' },
  { key: 'REG_DT', title: '등록일', width: 96, align: 'center' },
]

function TreeGrid({ menuInfo }) {
  const { rows, loading, error, reload } = useSelect('selectDemoMenuDemoList')

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto">
        <ComTitle menu={menuInfo} onRefresh={reload} />
        <MocaReactGrid
          label={`메뉴 트리${loading ? ' (조회중…)' : error ? ` (실패: ${error.message})` : ''}`}
          columns={columns}
          data={rows}
          search
          rowStatus={false}
          delCheck={false}
        />
      </MocaReactLayout>
    </div>
  )
}

export default TreeGrid

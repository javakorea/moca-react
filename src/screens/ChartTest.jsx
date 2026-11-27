import { useEffect, useMemo, useState } from 'react'
import { MocaReactLayout } from '@teammoca/react-layout'
import { MocaReactEchart } from '@teammoca/react-echart'
import { useSelect } from '@teammoca/react-tran'
import ComTitle from './com/ComTitle'

// 대시보드 차트 — MOCA demo 위젯 3종의 React 판. **실 데이터**:
// MOCA 서버(8080) 공용 쿼리 API 로 H2 DB 를 조회한다(SQL 은 서버 매퍼).
//   selectDashSalesMonthly : TERP_SALES 월별 매출/목표 (WGT_SALES_STATUS)
//   selectDashDeptMember   : TERP_DEPT 부서별 인원   (WGT_DEPT_STATUS)
//   selectDashVisitWeekly  : TERP_VISIT_LOG 방문자·신규가입
// option 문법은 ECharts 제품 API 그대로 — 색만 테마에 맞춰 분기한다.

// OS 다크 감지 — 차트 안 색상(축·그리드·툴팁)을 테마에 맞춘다
const useOsDark = () => {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dark
}

function ChartTest({ menuInfo }) {
  const dark = useOsDark()

  // 세 쿼리를 각각 조회 — 화면 하나가 여러 데이터를 쓰는 전형(MOCA 는 위젯마다 tran.exe)
  const sales = useSelect('selectDashSalesMonthly')
  const depts = useSelect('selectDashDeptMember')
  const visits = useSelect('selectDashVisitWeekly')
  const reloadAll = () => { sales.reload(); depts.reload(); visits.reload() }

  // 팔레트 — 다크는 MOCA demo 위젯 원본 값, 라이트는 Warm Paper 대응
  const P = useMemo(() => (dark
    ? { text: '#8fa8bc', sub: '#748899', grid: '#1e2f3d', tipBg: '#1a2a37', tipText: '#e2e8f0', cyan: '#00F0FF', orange: '#FFA040', series: ['#00F0FF', '#22D3A0', '#FFA040', '#A855F7', '#FF6868', '#40F8FF', '#FADB14'] }
    : { text: '#6b6455', sub: '#8a8272', grid: '#e7e0d4', tipBg: '#fffdf9', tipText: '#4a463c', cyan: '#0f9ba8', orange: '#d97a1e', series: ['#0f9ba8', '#22a07a', '#d97a1e', '#8b5cf6', '#d95f57', '#0ea5b7', '#ca8a04'] }
  ), [dark])

  // ① 월별 매출 — 막대(매출) + 점선 라인(목표). 원 단위 → 만원 (MOCA 위젯과 동일 가공)
  const salesOpt = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', backgroundColor: P.tipBg, borderColor: P.grid,
      textStyle: { color: P.tipText, fontSize: 12 },
      valueFormatter: (v) => `${Number(v).toLocaleString()}만원`,
    },
    legend: { data: ['매출', '목표'], top: 2, right: 6, textStyle: { color: P.text, fontSize: 11 } },
    grid: { top: 34, bottom: 24, left: 58, right: 16 },
    xAxis: { type: 'category', data: sales.rows.map((r) => `${r.SALE_MONTH}월`), axisLabel: { color: P.text, fontSize: 11 }, axisLine: { lineStyle: { color: P.grid } }, axisTick: { show: false } },
    yAxis: { type: 'value', name: '만원', nameTextStyle: { color: P.sub, fontSize: 10 }, axisLabel: { color: P.text, fontSize: 10, formatter: (v) => v.toLocaleString() }, splitLine: { lineStyle: { color: P.grid } } },
    series: [
      { name: '매출', type: 'bar', data: sales.rows.map((r) => Math.round(Number(r.SALE_AMT) / 10000)), barMaxWidth: 36, itemStyle: { color: P.cyan, borderRadius: [4, 4, 0, 0] } },
      { name: '목표', type: 'line', data: sales.rows.map((r) => Math.round(Number(r.TARGET_AMT) / 10000)), itemStyle: { color: P.orange }, lineStyle: { type: 'dashed', width: 2, color: P.orange }, symbol: 'circle', symbolSize: 6 },
    ],
  }), [P, sales.rows])

  // ② 부서별 인원 — 도넛
  const deptOpt = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', confine: true, formatter: '{b}: {c}명 ({d}%)', backgroundColor: P.tipBg, borderColor: P.grid, textStyle: { color: P.tipText, fontSize: 12 } },
    legend: { orient: 'vertical', right: 8, top: 'center', textStyle: { color: P.text, fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
    color: P.series,
    series: [{
      type: 'pie', radius: ['42%', '68%'], center: ['36%', '50%'], avoidLabelOverlap: false,
      label: { show: false }, labelLine: { show: false },
      emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold', color: P.tipText } },
      data: depts.rows.map((r) => ({ name: r.DEPT_NM, value: Number(r.MEM_CNT) })),
    }],
  }), [P, depts.rows])

  // ③ 주간 방문자 — 부드러운 라인 2종
  const visitOpt = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: P.tipBg, borderColor: P.grid, textStyle: { color: P.tipText, fontSize: 12 } },
    legend: { data: ['방문자', '신규가입'], top: 2, right: 6, textStyle: { color: P.text, fontSize: 11 } },
    grid: { top: 34, bottom: 24, left: 44, right: 16 },
    xAxis: { type: 'category', data: visits.rows.map((r) => r.VISIT_DATE), boundaryGap: false, axisLabel: { color: P.text, fontSize: 11 }, axisLine: { lineStyle: { color: P.grid } }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: P.text, fontSize: 10 }, splitLine: { lineStyle: { color: P.grid } } },
    series: [
      { name: '방문자', type: 'line', smooth: true, data: visits.rows.map((r) => Number(r.VISIT_CNT)), itemStyle: { color: P.cyan }, areaStyle: { opacity: 0.08 }, symbol: 'circle', symbolSize: 5 },
      { name: '신규가입', type: 'line', smooth: true, data: visits.rows.map((r) => Number(r.NEW_MEM_CNT)), itemStyle: { color: P.series[1] }, symbol: 'circle', symbolSize: 5 },
    ],
  }), [P, visits.rows])

  const state = (q) => (q.loading ? ' (조회중…)' : q.error ? ` (실패: ${q.error.message})` : '')

  return (
    <div style={{ height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <MocaReactLayout layout="vfit:auto:auto">
        <ComTitle menu={menuInfo} onRefresh={reloadAll} />
        <MocaReactLayout layout="h6:4">
          <div className="cht-card"><div className="cht-title">📊 월별 매출 현황 (만원){state(sales)}</div><MocaReactEchart option={salesOpt} /></div>
          <div className="cht-card"><div className="cht-title">🍩 부서별 인원 분포{state(depts)}</div><MocaReactEchart option={deptOpt} /></div>
        </MocaReactLayout>
        <div className="cht-card"><div className="cht-title">📈 주간 방문자 추이{state(visits)}</div><MocaReactEchart option={visitOpt} /></div>
      </MocaReactLayout>

      <style>{`
        .cht-card { display: flex; flex-direction: column; height: 100%; box-sizing: border-box;
          border: 1px solid #e7e0d4; border-radius: 8px; padding: 10px 12px; background: #fffdf9; }
        .cht-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
        .cht-card > .mre { flex: 1; min-height: 0; }
        /* 모바일(≤768px): 칸이 내용 높이로 풀리는데 차트(캔버스)는 내재 높이가 없어
           card(height:100%) → 0 → 차트도 0 이 되어 아무것도 안 보였다(2026-08-19 실측).
           카드마다 높이를 주고 세로로 쌓아 스크롤한다 — 3개를 한 화면에 나눠 넣으면
           각 200px 미만이라 축 라벨이 뭉갠다(mrl-fill 로 "남은 높이 나누기"를 쓰지 않는 이유). */
        @media (max-width: 768px) {
          .cht-card { height: auto; min-height: 260px; }
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) .cht-card { border-color: #1e2f3d; background: #10161d; }
        }
        :root[data-theme="dark"] .cht-card { border-color: #1e2f3d; background: #10161d; }
      `}</style>
    </div>
  )
}

export default ChartTest

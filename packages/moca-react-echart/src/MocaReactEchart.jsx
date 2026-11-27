import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as echarts from 'echarts'
import './MocaReactEchart.css'

// MOCA React Echart — Apache ECharts 를 감싼 차트 컴포넌트 (MOCA plugins/echart.js 이식)
//
// 외부 솔루션 연동 규칙(MOCA 동일): 화면은 이 컴포넌트에 option 만 넘긴다.
// option 의 문법은 ECharts 제품 API 그대로다 — 래퍼는 option 내용을 해석하지 않고
// 인스턴스 관리(생성·리사이즈·해제)만 담당한다. option 이상의 제품 API(dispatchAction,
// on 등)가 필요하면 ref.getChart(cb)/getChartObj() 로 실제 echarts 인스턴스를 받아
// 직접 쓴다.
//
// - 자동 리사이즈 : ResizeObserver 로 자기 크기 변화를 관찰해 chart.resize() —
//   레이아웃 pane 비율 변경(setRatio)·MDI 분할·창 크기·모바일 세로스택 전환을
//   화면 코드 없이 추종한다 (MOCA 동일).
// - 테마 : theme="auto"(기본) 면 OS 라이트/다크를 따라간다(다크 = echarts 내장 'dark'
//   테마 — MOCA 앱 기조). 테마가 바뀌면 인스턴스를 재생성한다(echarts 테마는 init 시점
//   고정이라 재생성이 유일한 방법). 문자열을 주면 그 echarts 테마명 고정, null 은 기본 테마.
// - 해제 : 언마운트 시 ResizeObserver 해제 + chart.dispose() (MOCA destroy 대응 —
//   React 에선 자동이라 화면 코드가 부를 일이 없다).
//
// props
//   option : ECharts option 객체 — 바뀔 때마다 전체 교체(notMerge) 적용 (MOCA setValue
//            동일). null/undefined 면 차트를 비운다(clear)
//   merge  : true 면 전체 교체 대신 병합(setOption 기본 동작) — 부분 갱신용 (기본 false)
//   theme  : 'auto'(기본 — OS 다크면 'dark') | echarts 테마명 | null(기본 테마)
//   height : 차트 높이(px). 생략하면 부모를 100% 채운다(레이아웃 pane 안에서는 생략)
//
// ref (imperative — MOCA 메서드 대응)
//   getChart(cb)  : echarts 인스턴스를 콜백으로 넘긴다. 제품 API 직접 사용 진입점
//   getChartObj() : 인스턴스 즉시 반환 (마운트 전이면 null)
//   resize()      : 수동 리사이즈 (자동 추종 외에 즉시 반영이 필요할 때)
//   clear()       : 차트 비우기

const MocaReactEchart = forwardRef(function MocaReactEchart(
  { option, merge = false, theme = 'auto', height, className },
  ref,
) {
  const elRef = useRef(null)
  const chartRef = useRef(null)

  // OS 다크 감지 — theme="auto" 일 때만 소비
  const [osDark, setOsDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  useEffect(() => {
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setOsDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [theme])

  const resolvedTheme = theme === 'auto' ? (osDark ? 'dark' : undefined) : theme ?? undefined

  // 인스턴스 생성/해제 — 테마가 바뀌면 재생성(echarts 테마는 init 시점 고정).
  // 숨김(0×0) 상태로 마운트돼도 표시되는 순간 ResizeObserver 가 resize() 로 살린다
  useEffect(() => {
    const chart = echarts.init(elRef.current, resolvedTheme)
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(elRef.current)
    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [resolvedTheme])

  // option 반영 — 전체 교체(notMerge)가 기본 (MOCA setValue 동일). 재생성 직후에도 재적용
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    if (!option) {
      chart.clear()
      return
    }
    chart.setOption(option, !merge)
  }, [option, merge, resolvedTheme])

  useImperativeHandle(ref, () => ({
    getChart(cb) {
      if (chartRef.current && cb) cb(chartRef.current)
      return chartRef.current
    },
    getChartObj() {
      return chartRef.current
    },
    resize() {
      chartRef.current?.resize()
    },
    clear() {
      chartRef.current?.clear()
    },
  }))

  return (
    <div
      ref={elRef}
      className={`mre${className ? ` ${className}` : ''}`}
      style={height != null ? { height } : undefined}
    />
  )
})

export default MocaReactEchart

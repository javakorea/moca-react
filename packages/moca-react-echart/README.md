# @teammoca/react-echart

MOCA React Echart — Apache ECharts 를 감싼 차트 컴포넌트.
MOCA 프레임워크 echart 컴포넌트(plugins/echart.js)의 React 구현체.

## 설치

```bash
npm install @teammoca/react-echart echarts
```

React 18 이상, echarts 5 이상이 필요하다 (peerDependencies).

## 사용법

```jsx
import { MocaReactEchart } from '@teammoca/react-echart'

const option = {
  xAxis: { type: 'category', data: ['1월', '2월', '3월'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [120, 200, 150] }],
}

<MocaReactEchart option={option} />   // 부모를 100% 채운다
```

화면은 **option 만 넘긴다** — option 문법은 [ECharts 제품 API](https://echarts.apache.org/option.html)
그대로다. 래퍼는 내용을 해석하지 않고 인스턴스 관리(생성·리사이즈·해제)만 담당한다.

## Props

| prop | 기본값 | 설명 |
|---|---|---|
| `option` | (필수) | ECharts option 객체. 바뀔 때마다 전체 교체(notMerge). `null` 이면 차트 비움 |
| `merge` | `false` | `true` 면 병합 적용 — 시리즈 데이터만 갈아끼우는 부분 갱신용 |
| `theme` | `'auto'` | OS 다크면 echarts 내장 `'dark'` 테마. 문자열 = 테마명 고정, `null` = 기본 테마 |
| `height` | (없음) | 차트 높이(px). 생략하면 부모 100% — 높이 0 이면 안 보이니 부모 높이 확인 |

## ref API

- `getChart(cb)` — echarts 인스턴스를 콜백으로. 제품 API(dispatchAction·on 등) 직접 사용 진입점
- `getChartObj()` — 인스턴스 즉시 반환 (마운트 전 null)
- `resize()` — 수동 리사이즈 (크기 변화는 자동 추종되므로 보통 불필요)
- `clear()` — 차트 비우기

## 주요 동작

- **자동 리사이즈**: ResizeObserver 가 자기 크기 변화를 관찰해 `chart.resize()` —
  레이아웃 비율 변경·화면 분할·창 크기·모바일 스택 전환을 화면 코드 없이 추종.
- **테마 전환**: 테마가 바뀌면 인스턴스를 재생성한다(echarts 테마는 init 시점 고정).
- **해제**: 언마운트 시 자동 dispose.

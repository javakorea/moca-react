# MOCA React

업무 화면에 필요한 React 컴포넌트 모음입니다. [MOCA](https://github.com/javakorea/moca-engine) 웹표준 UI/UX 프레임워크의 그리드·레이아웃·MDI·팝업 등을 React 컴포넌트로 옮겼습니다. **MIT 라이선스.**

- 🌐 데모: <https://teammoca.co.kr/system/react/index.html>
- 🛠 MOCA React Studio(브라우저 웹 IDE): <https://teammoca.co.kr/system/react/studio.html>
- 📖 문서: [가이드](https://teammoca.co.kr/system/react/docs/moca-react-guide.html) · [API](https://teammoca.co.kr/system/react/docs/moca-react-api.html)

## 패키지

| 패키지 | 하는 일 |
|---|---|
| `@teammoca/react-grid` | 가상 스크롤 · 컬럼 리사이징 · 행상태/행번호/삭제체크 · 셀 편집 · 다단 헤더 · 엑셀 내보내기 |
| `@teammoca/react-layout` | 방향(v/h) + 비율 토큰 하나로 화면을 반응형 분할 |
| `@teammoca/react-mdi` | 좌우 화면분할 · 탭 드래그 이동(상태 보존) MDI 탭 셸 |
| `@teammoca/react-popup` | 화면을 모달로 띄우고 결과를 받는 팝업 |
| `@teammoca/react-msgbox` | alert · error · confirm · 필수값 안내 · 진행 모달 (await 로 받음) |
| `@teammoca/react-input-calendar` | 연·연월·일자·일시 입력칸 + 달력 팝업 |
| `@teammoca/react-schedule-calendar` | 월간 일정 달력(연속일정 · 공휴일 표기) |
| `@teammoca/react-search-combo` | 타이핑으로 목록을 좁혀 고르는 검색형 콤보 |
| `@teammoca/react-floating-button` | 화면 위 떠 있는 액션 버튼(FAB), 드래그 이동 |
| `@teammoca/react-echart` | Apache ECharts 차트 래퍼 |
| `@teammoca/react-tran` | MOCA 공용 쿼리 API(queryId 기반 select/save) 통신 레이어 + React 훅 |

각 패키지 사용법은 `packages/<이름>/README.md` 에 있습니다.

## 실행

```bash
npm install
npm run dev      # 데모 앱 (http://localhost:5173)
npm run build    # dist/ 생성
```

데모 화면의 조회·저장은 MOCA 서버(Spring Boot, `localhost:8080`)의 `/common/*` API 를 부릅니다(`vite.config.js` 프록시). 서버 없이도 컴포넌트 화면은 열리지만, 데이터 조회는 실패합니다.

## 후원

MOCA는 개인이 만들고 있습니다. 도움이 되셨다면 후원으로 개발을 이어 갈 수 있게 해 주세요.

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=githubsponsors)](https://github.com/sponsors/javakorea)

→ <https://github.com/sponsors/javakorea>

## 라이선스

[MIT](LICENSE) © teammoca

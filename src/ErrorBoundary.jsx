import { Component } from 'react'

// 화면(탭) 단위 오류 격리 — MOCA frame 이 자식 화면 오류를 부모와 분리하던 역할의 React 대응.
// 탭 하나의 화면이 렌더링 중 죽어도 앱 전체(셸·다른 탭)는 살아 있고, 그 탭에만
// 오류 안내가 표시된다. Error Boundary 는 React 규칙상 클래스 컴포넌트로만 만들 수 있다.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // 개발 편의 — 콘솔에 컴포넌트 스택까지 남긴다
    console.error('[ErrorBoundary] 화면 렌더링 오류:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100%', gap: 10, padding: 20, boxSizing: 'border-box', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <b>화면 렌더링 중 오류가 발생했습니다</b>
          <code style={{ fontSize: 12, opacity: 0.7, wordBreak: 'break-all' }}>
            {String(this.state.error?.message ?? this.state.error)}
          </code>
          <button
            type="button"
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #c4ccd5', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
            onClick={() => this.setState({ error: null })}
          >
            다시 시도
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary

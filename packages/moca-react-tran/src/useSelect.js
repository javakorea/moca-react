import { useCallback, useEffect, useRef, useState } from 'react'
import tran from './tran.js'

// useSelect — queryId 조회를 화면에서 선언적으로 쓰는 훅.
// MOCA 는 onpageload 에서 tran.exe 를 부르고 콜백에서 setValue 했지만, React 는
// "이 화면은 이 데이터를 쓴다"고 선언하고 로딩/오류 상태를 함께 받는다.
//
//   const { rows, loading, error, reload } = useSelect('selectTdemoSaleDtlList', { REGION_NM })
//
// - params 가 바뀌면 자동 재조회한다(검색조건 변경 = 재조회). 값 비교는 JSON 직렬화 기준이라
//   매 렌더 새 객체를 넘겨도 내용이 같으면 재조회하지 않는다.
// - reload() 는 같은 조건으로 다시 조회(새로고침 버튼용).
// - enabled: false 면 조회를 미룬다(로그인 전 등).
// - 언마운트/조건 변경 시 이전 응답은 버린다(늦게 온 응답이 새 결과를 덮지 않게).
export function useSelect(queryId, params, { enabled = true } = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const [nonce, setNonce] = useState(0)

  const key = JSON.stringify(params ?? {}) // 내용 기반 의존성
  const seqRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    const seq = ++seqRef.current
    setLoading(true)
    setError(null)
    tran
      .select(queryId, JSON.parse(key))
      .then((list) => {
        if (seq !== seqRef.current) return // 늦게 온 응답 폐기
        setRows(list)
        setLoading(false)
      })
      .catch((e) => {
        if (seq !== seqRef.current) return
        setError(e)
        setRows([])
        setLoading(false)
      })
  }, [queryId, key, enabled, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { rows, loading, error, reload }
}

import { createRoot } from 'react-dom/client'
import Studio from './Studio.jsx'
import './studio.css'

// StrictMode 는 쓰지 않는다 — 개발 모드에서 효과가 두 번 돌며 편집기(Monaco)를 두 번 만들었다 지운다
createRoot(document.getElementById('studio-root')).render(<Studio />)

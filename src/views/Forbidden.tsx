import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'

/**
 * 403 禁止访问页面
 */
export default function Forbidden() {
  const navigate = useNavigate()

  const handleBackHome = () => {
    navigate('/')
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您无权访问该页面。"
        extra={
          <Button type="primary" onClick={handleBackHome}>
            返回首页
          </Button>
        }
      />
    </div>
  )
}

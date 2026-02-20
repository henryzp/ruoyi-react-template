import { Card, Typography } from 'antd'

const { Title } = Typography

export default function TestPage() {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>测试页面</Title>
      <Card>
        <p>这是一个测试页面，包含在 Layout 布局中，有左侧菜单栏。</p>
      </Card>
    </div>
  )
}

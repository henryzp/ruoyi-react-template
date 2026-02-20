import { Card, Col, Row, Statistic } from 'antd'
import { ArrowUpOutlined } from '@ant-design/icons'
import { useEffect } from 'react'

/**
 * 首页组件
 *
 * 说明：权限获取逻辑已移至路由守卫 Guard.tsx 中处理
 * 这样无论用户在哪个页面刷新，都能正确获取权限信息
 */
export default function HomePage() {

  useEffect(() => {
    console.log('2222232421');
  }, []);

  return (
    <div>
      <h2>首页</h2>
      <Row gutter={16}>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="总用户数"
              value={1128}
              prefix={<ArrowUpOutlined />}
              suffix="人"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="今日访问"
              value={93}
              suffix="次"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="在线用户"
              value={9}
              suffix="人"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic
              title="系统消息"
              value={12}
              suffix="条"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

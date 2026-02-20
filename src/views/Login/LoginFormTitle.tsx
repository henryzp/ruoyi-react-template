import { Typography } from 'antd'

const { Title } = Typography

interface LoginFormTitleProps {
  title: string
}

/**
 * 登录表单标题组件
 */
export function LoginFormTitle({ title }: LoginFormTitleProps) {
  return (
    <div className="login-form-title">
      <Title level={2}>{title}</Title>
    </div>
  )
}

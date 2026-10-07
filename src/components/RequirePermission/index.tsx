import { Button, Result, Spin } from 'antd';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { usePermission } from '@/hooks/usePermission';
import type { RequirePermissionProps } from './types';

const RequirePermission = ({ rule, children }: RequirePermissionProps) => {
  const location = useLocation();
  const { allowed, pending, error, reload } = usePermission(rule);
  if (pending) return <Spin fullscreen />;
  if (error) {
    return (
      <Result
        status="error"
        title="权限信息加载失败"
        extra={<Button onClick={() => reload()}>重新加载</Button>}
      />
    );
  }
  if (!allowed)
    return <Navigate to="/403" replace state={{ from: location.pathname }} />;
  return children ?? <Outlet />;
};

export default RequirePermission;

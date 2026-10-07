import { Button, Result } from 'antd';
import { Component } from 'react';

import type { ErrorBoundaryProps, ErrorBoundaryState } from './types';

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    if (import.meta.env.DEV) {
      console.error('页面渲染异常', error);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Result
        status="error"
        title="页面出现异常"
        subTitle="请刷新页面后重试"
        extra={
          <Button type="primary" onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        }
      />
    );
  }
}

export default ErrorBoundary;

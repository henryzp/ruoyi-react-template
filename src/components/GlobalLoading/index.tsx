import { Spin } from 'antd';

const GlobalLoading = () => {
  return (
    <div
      aria-hidden="true"
      className="global-loading-wrapper"
      id="global-loading-wrapper"
    >
      <Spin size="large" />
    </div>
  );
};

export default GlobalLoading;

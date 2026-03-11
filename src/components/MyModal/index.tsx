import { Modal, type ModalProps } from "antd";

/**
 * 自定义 Modal 组件
 * 默认禁用点击蒙层关闭，并居中显示
 * children 自动包裹在可滚动容器中
 */
export default (props: ModalProps) => {
  const { children, ...restProps } = props;

  return (
    <Modal maskClosable={false} centered {...restProps}>
      <div style={{ maxHeight: 500, overflow: "auto", paddingTop: 20 }}>
        {children}
      </div>
    </Modal>
  );
};

import { Modal, type ModalProps } from "antd";

interface MyModalProps extends ModalProps {
  /** 内容区最大高度（像素），不传入则无高度限制 */
  contentMaxHeight?: number;
}

/** 内容区基础样式 */
const CONTENT_BASE_STYLE = { paddingTop: 20 };

/**
 * 自定义 Modal 组件
 * 默认禁用点击蒙层关闭，并居中显示
 * children 自动包裹在容器中，可选择性添加高度限制
 */
export default (props: MyModalProps) => {
  const { children, contentMaxHeight, ...restProps } = props;

  // 只有传入 contentMaxHeight 时才应用高度限制和滚动
  const contentStyle = contentMaxHeight
    ? { ...CONTENT_BASE_STYLE, maxHeight: contentMaxHeight, overflow: "auto" }
    : CONTENT_BASE_STYLE;

  return (
    <Modal mask={{ closable: false }} centered destroyOnHidden {...restProps}>
      <div style={contentStyle}>{children}</div>
    </Modal>
  );
};

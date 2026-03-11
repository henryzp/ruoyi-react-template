# Ant Design API 迁移规范

## 概述

本文档记录了 Ant Design 组件 API 的废弃属性和新属性的使用规范，避免重复使用过时的 API。

## Card 组件

### 废弃的属性

| 旧属性 | 新属性 | 迁移方式 |
|--------|--------|----------|
| `bordered` | `variant` | `bordered={false}` → `variant="borderless"` |
| `bodyStyle` | `styles.body` | `bodyStyle={{...}}` → `styles={{ body: {...} }}` |
| `headStyle` | `styles.header` | `headStyle={{...}}` → `styles={{ header: {...} }}` |

### 示例

```tsx
// ❌ 错误写法（已废弃）
<Card
  bordered={false}
  bodyStyle={{ padding: 20 }}
  headStyle={{ color: 'red' }}
>
  内容
</Card>

// ✅ 正确写法
<Card
  variant="borderless"
  styles={{
    body: { padding: 20 },
    header: { color: 'red' }
  }}
>
  内容
</Card>
```

### variant 属性值

| 值 | 说明 | 对应旧属性 |
|---|---|---|
| `outlined` | 带边框（默认） | `bordered={true}` |
| `borderless` | 无边框 | `bordered={false}` |
| `filled` | 填充样式（新增） | - |

## Modal 组件规范

### 自定义弹窗 - 统一使用 MyModal

项目中**所有自定义内容的弹窗**（如表单弹窗、详情弹窗等）必须统一使用 `@/components/MyModal` 组件。

```tsx
// ❌ 错误写法 - 直接使用 Modal
import { Modal } from 'antd';

<Modal open={visible} title="标题" onOk={handleOk} onCancel={handleCancel}>
  <Form>...</Form>
</Modal>

// ✅ 正确写法 - 使用 MyModal
import MyModal from '@/components/MyModal';

<MyModal open={visible} title="标题" onOk={handleOk} onCancel={handleCancel}>
  <Form>...</Form>
</MyModal>
```

### Modal 静态方法（可继续使用）

简单的确认对话框可以继续使用 Modal 的静态方法：

```tsx
// ✅ 可以使用
Modal.confirm({
  title: '确认删除',
  content: '确定要删除这条数据吗？',
  onOk: async () => {
    // 确认后的操作
  },
});
```

### MyModal 特性

- 禁用点击蒙层关闭（`maskClosable={false}`）
- 默认居中显示（`centered`）
- 支持内容区最大高度限制（`contentMaxHeight` 属性）
- 自动销毁隐藏内容（`destroyOnHidden`）

## 其他常见组件

### Input / Select / TreeSelect 等

| 旧属性 | 新属性 |
|--------|--------|
| `bordered` | `variant` |

### 示例

```tsx
// ❌ 错误写法
<Input bordered={false} />
<Select bordered={false} />

// ✅ 正确写法
<Input variant="borderless" />
<Select variant="borderless" />
```

## 常见错误汇总

### 1. Card 组件

**错误信息**: `Warning: [antd: Card] 'bodyStyle' is deprecated. Please use 'styles.body' instead.`

**解决方案**:
```diff
- <Card bodyStyle={{ padding: 20 }}>
+ <Card styles={{ body: { padding: 20 } }}>
```

### 2. Card bordered 属性

**错误信息**: `Warning: [antd: Card] 'bordered' is deprecated. Please use 'variant' instead.`

**解决方案**:
```diff
- <Card bordered={false}>
+ <Card variant="borderless">
```

### 3. Input/Select bordered 属性

**错误信息**: `Warning: [antd: Input] 'bordered' is deprecated. Please use 'variant' instead.`

**解决方案**:
```diff
- <Input bordered={false} />
- <Select bordered={false} />
+ <Input variant="borderless" />
+ <Select variant="borderless" />
```

## 检查清单

在代码审查时，请检查以下内容：

- [ ] 自定义弹窗是否使用了 `MyModal` 而非直接使用 `Modal`
- [ ] Card 组件是否使用了 `bodyStyle` → 应改为 `styles.body`
- [ ] Card 组件是否使用了 `headStyle` → 应改为 `styles.header`
- [ ] Card 组件是否使用了 `bordered` → 应改为 `variant`
- [ ] Input/Select 等组件是否使用了 `bordered` → 应改为 `variant`

## 参考资料

- [Ant Design 官方文档 - Card 组件](https://ant.design/components/card)
- [Ant Design v5 到 v6 迁移指南](https://ant.design/docs/react/migration-v6)

## 更新日志

| 日期 | 更新内容 |
|------|----------|
| 2026-03-11 | 添加 Modal 组件规范，要求统一使用 MyModal 组件 |
| 2026-03-11 | 初始版本，记录 Card、Input、Select 组件的 API 变更 |

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
| 2026-03-11 | 初始版本，记录 Card、Input、Select 组件的 API 变更 |

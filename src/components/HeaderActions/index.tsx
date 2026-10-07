import { LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import {
  App,
  Avatar,
  Badge,
  Button,
  Dropdown,
  Space,
  type MenuProps,
} from 'antd';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';
import type { HeaderActionsProps, UtilityItem } from './types';
import './index.less';

// 预留未读数，当前暂不展示
const utilityItems: UtilityItem[] = [
  { key: 'ai', icon: '🤖', label: 'AI助手' },
  { key: 'message', icon: '💬', label: '消息', badge: 4, showBadge: false },
  { key: 'admin', icon: '⚙️', label: '后台管理' },
];

const HeaderActions = ({
  adminPath = '/admin',
  roleLabel = '管理员',
  showUtilities = false,
}: HeaderActionsProps) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const userInfo = useAuthStore((state) => state.userInfo);
  const menus = userInfo?.menus ?? [];
  const userName = userInfo?.nickname || 'admin';
  const hasAdminMenu = menus.some(
    (menu) => menu.menuScope === 1 && menu.visible === true,
  );
  const profileItems: MenuProps['items'] = [
    { icon: <SettingOutlined />, key: 'settings', label: '个性化设置' },
    { type: 'divider' },
    {
      danger: true,
      icon: <LogoutOutlined />,
      key: 'logout',
      label: '退出登录',
    },
  ];
  const handleProfileAction: MenuProps['onClick'] = async ({ key }) => {
    if (key === 'logout') {
      try {
        await useAuthStore.getState().logout();
      } finally {
        useAuthStore.getState().clearAuth();
        navigate('/login', { replace: true });
      }
      return;
    }
    message.info('个性化设置功能开发中');
  };
  const handleUtilityClick = (item: UtilityItem) => {
    if (item.key === 'admin') {
      if (!hasAdminMenu) {
        message.warning('暂无后台管理权限');
        return;
      }
      navigate(adminPath);
      return;
    }
    message.info(`${item.label}功能开发中`);
  };
  return (
    <div className="header-actions">
      {showUtilities ? (
        <>
          <Space size={4}>
            {utilityItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className="header-utility-item"
                onClick={() => handleUtilityClick(item)}
              >
                <Badge
                  count={item.showBadge ? item.badge : 0}
                  size="small"
                  offset={[2, -2]}
                >
                  <span aria-hidden="true" className="header-utility-icon">
                    {item.icon}
                  </span>
                </Badge>
                <span>{item.label}</span>
              </button>
            ))}
          </Space>
          <div className="header-profile-divider" />
        </>
      ) : null}
      <Dropdown
        menu={{ items: profileItems, onClick: handleProfileAction }}
        placement="bottomRight"
        trigger={['click']}
      >
        <Button className="header-profile-button" type="text">
          <Avatar size={32}>骅</Avatar>
          <span className="header-profile-copy">
            <strong>{userName}</strong>
            <span>{roleLabel}</span>
          </span>
        </Button>
      </Dropdown>
    </div>
  );
};
export default HeaderActions;

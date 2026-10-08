import { Form, Input, Button, Checkbox, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useRef, useState } from "react";
import type { LoginDto } from "@/types/auth";
import { useAuthStore } from "@/store/authStore";
import { getSafeRedirectPath } from "@/utils/authRedirect";
import CaptchaVerify from "./CaptchaVerify";
import styles from "./index.module.scss";

const { Title } = Typography;

interface LoginForm {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * 登录页面
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, loading } = useAuthStore();
  const [form] = Form.useForm();
  const captchaEnabled = import.meta.env.VITE_APP_CAPTCHA_ENABLE === "true";
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const pendingLogin = useRef<LoginForm | null>(null);

  const submitLogin = async (
    values: LoginForm,
    captchaVerification?: string,
  ) => {
    try {
      const loginData: LoginDto = {
        username: values.username,
        password: values.password,
        rememberMe: values.rememberMe ?? true,
        ...(captchaVerification ? { captchaVerification } : {}),
      };

      await login(loginData);

      // 记住我功能
      if (values.rememberMe) {
        localStorage.setItem(
          "loginForm",
          JSON.stringify({
            username: values.username,
            password: values.password,
            rememberMe: values.rememberMe,
          }),
        );
      } else {
        localStorage.removeItem("loginForm");
      }

      const stateFrom = (location.state as { from?: unknown } | null)?.from;
      const stateRedirect =
        typeof stateFrom === "string"
          ? stateFrom
          : stateFrom && typeof stateFrom === "object"
            ? `${(stateFrom as { pathname?: string }).pathname ?? ""}${(stateFrom as { search?: string }).search ?? ""}${(stateFrom as { hash?: string }).hash ?? ""}`
            : null;
      navigate(
        getSafeRedirectPath(searchParams.get("redirectUrl") || stateRedirect),
        { replace: true, state: null },
      );
    } catch (error) {
      console.error("登录失败:", error);
    }
  };

  const handleSubmit = async (values: LoginForm) => {
    if (captchaEnabled) {
      if (captchaOpen) return;
      pendingLogin.current = values;
      setCaptchaOpen(true);
      return;
    }
    await submitLogin(values);
  };

  const handleCaptchaCancel = () => {
    pendingLogin.current = null;
    setCaptchaOpen(false);
  };

  const handleCaptchaSuccess = async (captchaVerification: string) => {
    const values = pendingLogin.current;
    pendingLogin.current = null;
    setCaptchaOpen(false);
    if (!values) return;
    await submitLogin(values, captchaVerification);
  };

  // 组件挂载时恢复记住我的登录信息
  const initialValues = (() => {
    const savedForm = localStorage.getItem("loginForm");
    if (savedForm) {
      try {
        return JSON.parse(savedForm);
      } catch {
        return {};
      }
    }
    return { rememberMe: true };
  })();

  return (
    <>
      <div className={styles.loginContainer}>
        <div className={styles.loginContent}>
          <div className={styles.loginFormCard}>
            <div className={styles.loginFormTitle}>
              <Title level={2}>用户登录</Title>
            </div>
            <Form
              form={form}
              name="login"
              initialValues={initialValues}
              onFinish={handleSubmit}
              autoComplete="off"
              size="large"
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: "请输入用户名" }]}
                className={styles.loginFormItem}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="用户名"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: "请输入密码" }]}
                className={styles.loginFormItem}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                  size="large"
                  onPressEnter={() => form.submit()}
                />
              </Form.Item>

              <Form.Item className={styles.loginFormItem}>
                <div className={styles.loginRemember}>
                  <Form.Item name="rememberMe" valuePropName="checked" noStyle>
                    <Checkbox>记住我</Checkbox>
                  </Form.Item>
                </div>
              </Form.Item>

              <Form.Item className={styles.loginFormItem}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                  className={styles.loginButton}
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
      {captchaEnabled ? (
        <CaptchaVerify
          open={captchaOpen}
          onCancel={handleCaptchaCancel}
          onSuccess={handleCaptchaSuccess}
        />
      ) : null}
    </>
  );
}

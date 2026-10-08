import {
  CheckOutlined,
  CloseOutlined,
  LoadingOutlined,
  ReloadOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Button, Modal, Spin } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import { checkCaptcha, getCaptcha } from "@/api/captcha";
import type { CaptchaData } from "@/api/captcha";
import {
  CAPTCHA_IMAGE_WIDTH,
  CAPTCHA_PIECE_WIDTH,
  CAPTCHA_SLIDER_SIZE,
  encryptCaptchaValue,
  toCaptchaPoint,
} from "@/utils/captcha";
import styles from "./CaptchaVerify.module.scss";

interface CaptchaVerifyProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (captchaVerification: string) => void;
}

type Result = "success" | "error" | null;

const getResultIcon = (result: Exclude<Result, null>): ReactNode => {
  if (result === "success") return <CheckOutlined />;
  return <CloseOutlined />;
};

const CaptchaVerify = ({ open, onCancel, onSuccess }: CaptchaVerifyProps) => {
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; offset: number } | null>(null);
  const offsetRef = useRef(0);
  const sessionRef = useRef(0);
  const checkingRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
  }, []);

  const refresh = useCallback(async () => {
    const session = ++sessionRef.current;
    clearTimers();
    dragRef.current = null;
    checkingRef.current = false;
    setLoading(true);
    setChecking(false);
    setCaptcha(null);
    setOffset(0);
    offsetRef.current = 0;
    setResult(null);

    const { data, err } = await getCaptcha({
      data: { captchaType: "blockPuzzle" },
    });
    if (session !== sessionRef.current || !open) return;
    setLoading(false);
    if (err || data?.repCode !== "0000" || !data.repData) {
      setResult("error");
      return;
    }
    setCaptcha(data.repData);
  }, [clearTimers, open]);

  useEffect(() => {
    if (!open) {
      sessionRef.current += 1;
      clearTimers();
      dragRef.current = null;
      checkingRef.current = false;
      setCaptcha(null);
      setLoading(false);
      setChecking(false);
      setResult(null);
      setOffset(0);
      offsetRef.current = 0;
      return;
    }
    refresh();
    return clearTimers;
  }, [clearTimers, open, refresh]);

  useEffect(
    () => () => {
      sessionRef.current += 1;
      clearTimers();
    },
    [clearTimers],
  );

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const track = trackRef.current;
    const imageWidth = imageRef.current?.clientWidth || CAPTCHA_IMAGE_WIDTH;
    if (!drag || !track) return;
    const next = Math.max(
      0,
      Math.min(
        track.clientWidth -
          (imageWidth * CAPTCHA_PIECE_WIDTH) / CAPTCHA_IMAGE_WIDTH,
        drag.offset + event.clientX - drag.x,
      ),
    );
    offsetRef.current = next;
    setOffset(next);
  };

  const handleUp = async (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const captchaData = captcha;
    if (!drag || !captchaData || checkingRef.current) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const session = sessionRef.current;
    const pointJson = toCaptchaPoint(
      offsetRef.current,
      imageRef.current?.clientWidth || CAPTCHA_IMAGE_WIDTH,
    );
    checkingRef.current = true;
    setChecking(true);
    let data: Awaited<ReturnType<typeof checkCaptcha>>["data"];
    let err: Awaited<ReturnType<typeof checkCaptcha>>["err"];
    try {
      const encryptedPoint = await encryptCaptchaValue(
        pointJson,
        captchaData.secretKey,
      );
      if (session !== sessionRef.current || !open) return;
      ({ data, err } = await checkCaptcha({
        data: {
          captchaType: "blockPuzzle",
          pointJson: encryptedPoint,
          token: captchaData.token,
        },
      }));
    } catch {
      if (session !== sessionRef.current || !open) return;
      checkingRef.current = false;
      setChecking(false);
      setResult("error");
      return;
    }
    if (session !== sessionRef.current || !open) return;
    checkingRef.current = false;
    setChecking(false);
    const ok = !err && data?.repCode === "0000";
    const timer = window.setTimeout(async () => {
      timersRef.current = timersRef.current.filter((item) => item !== timer);
      if (session !== sessionRef.current || !open) return;
      if (!ok) {
        await refresh();
        return;
      }
      try {
        const verification = await encryptCaptchaValue(
          `${captchaData.token}---${pointJson}`,
          captchaData.secretKey,
        );
        if (session === sessionRef.current && open) onSuccess(verification);
      } catch {
        if (session !== sessionRef.current || !open) return;
        checkingRef.current = false;
        setChecking(false);
        setResult("error");
      }
    }, 450);
    timersRef.current.push(timer);
    setResult(ok ? "success" : "error");
  };

  const handleCancel = () => {
    sessionRef.current += 1;
    clearTimers();
    dragRef.current = null;
    checkingRef.current = false;
    onCancel();
  };

  const sliderStatus = checking ? "checking" : (result ?? "idle");
  const statusText = {
    checking: "正在验证…",
    success: "验证成功",
    error: "验证失败，请重试",
    idle: "向右滑动完成验证",
  }[sliderStatus];
  const statusIcon = {
    checking: <LoadingOutlined spin />,
    idle: null,
    success: getResultIcon("success"),
    error: getResultIcon("error"),
  }[sliderStatus];

  return (
    <Modal
      centered
      destroyOnHidden
      footer={null}
      mask={{ closable: false }}
      open={open}
      rootClassName={styles.modal}
      title="请完成安全验证"
      width={464}
      onCancel={handleCancel}
    >
      <div className={styles.content}>
        <div ref={imageRef} className={styles.image}>
          {loading ? (
            <Spin />
          ) : captcha ? (
            <>
              <img
                alt="拼图验证码"
                src={`data:image/png;base64,${captcha.originalImageBase64}`}
              />
              <div className={styles.piece} style={{ left: offset }}>
                <img
                  alt="拼图滑块"
                  src={`data:image/png;base64,${captcha.jigsawImageBase64}`}
                />
              </div>
            </>
          ) : (
            <span className={result === "error" ? styles.error : undefined}>
              验证码加载失败
            </span>
          )}
          <Button
            aria-label="刷新验证码"
            className={styles.refresh}
            disabled={loading || checking || result === "success"}
            icon={<ReloadOutlined />}
            type="text"
            onClick={() => refresh()}
          />
        </div>
        <div ref={trackRef} className={styles.track} data-status={sliderStatus}>
          <div
            className={styles.progress}
            style={{
              transform: `scaleX(${Math.min((offset + CAPTCHA_SLIDER_SIZE) / CAPTCHA_IMAGE_WIDTH, 1)})`,
            }}
          />
          <span
            className={`${styles.trackText} ${result === "error" ? styles.error : ""} ${result === "success" ? styles.success : ""}`}
          >
            {statusIcon}
            {statusText}
          </span>
          <div
            className={styles.slider}
            style={{ left: offset }}
            onPointerDown={(event) => {
              if (
                !loading &&
                !checkingRef.current &&
                result === null &&
                captcha
              ) {
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = { x: event.clientX, offset };
              }
            }}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
          >
            {statusIcon ?? <RightOutlined />}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CaptchaVerify;

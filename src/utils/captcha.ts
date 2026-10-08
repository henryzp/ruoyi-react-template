export const CAPTCHA_IMAGE_WIDTH = 400;
export const CAPTCHA_API_IMAGE_WIDTH = 310;
export const CAPTCHA_PIECE_WIDTH = Math.floor(
  (CAPTCHA_IMAGE_WIDTH * 47) / CAPTCHA_API_IMAGE_WIDTH,
);
export const CAPTCHA_SLIDER_SIZE = 40;

export const toCaptchaPoint = (
  renderedOffset: number,
  renderedImageWidth = CAPTCHA_IMAGE_WIDTH,
) => {
  const pixelOffset = Math.trunc(renderedOffset);
  return JSON.stringify({
    x: (pixelOffset * CAPTCHA_API_IMAGE_WIDTH) / renderedImageWidth,
    y: 5.0,
  });
};

export const encryptCaptchaValue = async (
  value: string,
  secretKey?: string,
): Promise<string> => {
  if (!secretKey) return value;
  const CryptoJS = await import('crypto-js');
  return CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(value),
    CryptoJS.enc.Utf8.parse(secretKey),
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 },
  ).toString();
};

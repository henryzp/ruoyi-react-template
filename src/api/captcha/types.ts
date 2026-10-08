export interface CaptchaData {
  originalImageBase64: string;
  jigsawImageBase64: string;
  token: string;
  secretKey?: string;
}

export interface CaptchaResponse {
  repCode: string;
  repMsg?: string;
  success?: boolean;
  repData?: CaptchaData | null;
}

export interface CaptchaGetRequest {
  captchaType: 'blockPuzzle';
}

export interface CaptchaCheckRequest extends CaptchaGetRequest {
  pointJson: string;
  token: string;
}

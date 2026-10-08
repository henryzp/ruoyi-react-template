import { makeRequest } from '@/request';
import type {
  CaptchaCheckRequest,
  CaptchaGetRequest,
  CaptchaResponse,
} from './types';

export const getCaptcha = makeRequest<CaptchaResponse, CaptchaGetRequest>({
  url: '/system/captcha/get',
  method: 'POST',
  rawResponse: true,
});

export const checkCaptcha = makeRequest<CaptchaResponse, CaptchaCheckRequest>({
  url: '/system/captcha/check',
  method: 'POST',
  rawResponse: true,
});

export type {
  CaptchaCheckRequest,
  CaptchaData,
  CaptchaGetRequest,
  CaptchaResponse,
} from './types';

const errors: string[] = [];

export const resetErrors = () => {
  errors.length = 0;
};

export const getErrors = () => [...errors];

export const message = {
  error: (content?: unknown) => {
    errors.push(String(content ?? ""));
  },
  success: () => undefined,
  warning: () => undefined,
  info: () => undefined,
};

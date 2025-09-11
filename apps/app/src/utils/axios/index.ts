import type { AxiosStatic } from 'axios';
// eslint-disable-next-line no-restricted-imports
import axios from 'axios';

import { createCustomAxios } from './create-custom-axios';

// eslint-disable-next-line no-restricted-imports
export * from 'axios';

// Expose Axios class to allow class inheritance
const customAxiosStatic = Object.assign(createCustomAxios(), {
  create: createCustomAxios,
  Axios: axios.Axios,

  // Expose Cancel & CancelToken
  Cancel: axios.Cancel,

  CancelToken: axios.CancelToken,

  isCancel: axios.isCancel,
  VERSION: axios.VERSION,

  // Expose all/spread
  all: axios.all,
  spread: axios.spread,

  // Expose isAxiosError
  isAxiosError: axios.isAxiosError,
}) satisfies AxiosStatic;

export default customAxiosStatic;

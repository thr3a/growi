import express from 'express';
import CertifyOrigin from '~/server/middlewares/certify-origin';

function createApiRouter() {
  const r = express.Router();
  r.use(CertifyOrigin);
  return r;
}

export {
  createApiRouter,
};

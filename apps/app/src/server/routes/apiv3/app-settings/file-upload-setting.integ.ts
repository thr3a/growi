import express from 'express';
import mockRequire from 'mock-require';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import type Crowi from '~/server/crowi';
import { configManager } from '~/server/service/config-manager';
import type { S2sMessagingService } from '~/server/service/s2s-messaging/base';

// Mock middlewares using mock-require BEFORE importing the router
const mockActivityId = '507f1f77bcf86cd799439011';

// Mock the dependencies that login-required.js and admin-required.js need
mockRequire.stopAll();

mockRequire('~/server/middlewares/access-token-parser', {
  accessTokenParser: () => (_req: any, _res: any, next: any) => next(),
});

mockRequire('../../../middlewares/login-required', () => (_req: any, _res: any, next: any) => next());
mockRequire('../../../middlewares/admin-required', () => (_req: any, _res: any, next: any) => next());

mockRequire('../../../middlewares/add-activity', {
  generateAddActivityMiddleware: () => (_req: any, res: any, next: any) => {
    res.locals = res.locals || {};
    res.locals.activity = { _id: mockActivityId };
    next();
  },
});

describe('file-upload-setting route', () => {
  let app: express.Application;
  let crowiMock: Crowi;

  beforeAll(async() => {

    // Initialize configManager
    const s2sMessagingServiceMock = mock<S2sMessagingService>();
    configManager.setS2sMessagingService(s2sMessagingServiceMock);
    await configManager.loadConfigs();

    // Mock crowi instance
    crowiMock = mock<Crowi>({
      event: vi.fn().mockReturnValue({
        emit: vi.fn(),
      }),
      setUpFileUpload: vi.fn().mockResolvedValue(undefined),
      fileUploaderSwitchService: {
        publishUpdatedMessage: vi.fn(),
      },
    });

    // Setup express app
    app = express();
    app.use(express.json());

    // Mock apiv3 response methods
    app.use((_req, res, next) => {
      res.apiv3 = (data: any) => res.json(data);
      res.apiv3Err = (error: any, statusCode = 500) => res.status(statusCode).json({ error });
      next();
    });

    // Import and mount the actual router using dynamic import
    const fileUploadSettingModule = await import('./file-upload-setting');
    const fileUploadSettingRouterFactory = (fileUploadSettingModule as any).default || fileUploadSettingModule;
    const fileUploadSettingRouter = fileUploadSettingRouterFactory(crowiMock);
    app.use('/', fileUploadSettingRouter);
  });

  afterAll(() => {
    mockRequire.stopAll();
  });

  it('should update file upload type to local', async() => {
    const response = await request(app)
      .put('/')
      .send({
        fileUploadType: 'local',
      })
      .expect(200);

    expect(response.body.responseParams).toBeDefined();
    expect(response.body.responseParams.fileUploadType).toBe('local');
    expect(crowiMock.setUpFileUpload).toHaveBeenCalledWith(true);
  });
});

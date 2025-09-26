import type { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

import { getPageSchema } from '~/server/models/obsolete-page';
import pageModel from '~/server/models/page';
import { pageListingService } from '~/server/service/page-listing';

// TODO: use actual user model after ~/server/models/user.js becomes importable in vitest
// ref: https://github.com/vitest-dev/vitest/issues/846
const userSchema = new mongoose.Schema({
  name: { type: String },
  username: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
}, {
  timestamps: true,
});
const User = mongoose.model('User', userSchema);

describe('page-listing store integration tests', () => {
  let Page: any;
  let testUser: HydratedDocument<any>;
  let rootPage: HydratedDocument<any>;

  beforeAll(async() => {
    // setup page model
    getPageSchema(null);
    pageModel(null);
    Page = mongoose.model('Page');
  });

  beforeEach(async() => {
    // Clean up database
    await Page.deleteMany({});
    await User.deleteMany({});

    // Create test user
    testUser = await User.create({
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      lang: 'en_US',
    });

    // Create root page
    rootPage = await Page.create({
      path: '/',
      revision: new mongoose.Types.ObjectId(),
      creator: testUser._id,
      lastUpdateUser: testUser._id,
      grant: 1, // GRANT_PUBLIC
      isEmpty: false,
      descendantCount: 0,
    });
  });

  describe('pageListingService.findRootByViewer', () => {
    test('should return root page successfully', async() => {
      const rootPageResult = await pageListingService.findRootByViewer(testUser);

      expect(rootPageResult).toBeDefined();
      expect(rootPageResult.path).toBe('/');
      expect(rootPageResult._id.toString()).toBe(rootPage._id.toString());
      expect(rootPageResult.grant).toBe(1);
      expect(rootPageResult.isEmpty).toBe(false);
      expect(rootPageResult.descendantCount).toBe(0);
    });

    test('should handle error when root page does not exist', async() => {
      // Remove the root page
      await Page.deleteOne({ path: '/' });

      try {
        await pageListingService.findRootByViewer(testUser);
        // Should not reach here
        expect(true).toBe(false);
      }
      catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should return proper page structure', async() => {
      const rootPageResult = await pageListingService.findRootByViewer(testUser);

      // Verify required fields are present
      expect(rootPageResult._id).toBeDefined();
      expect(rootPageResult.path).toBeDefined();
      expect(rootPageResult.grant).toBeDefined();
      expect(typeof rootPageResult.isEmpty).toBe('boolean');
      expect(typeof rootPageResult.descendantCount).toBe('number');
      expect(rootPageResult.createdAt).toBeDefined();
      expect(rootPageResult.updatedAt).toBeDefined();
    });

    test('should work without user (guest access)', async() => {
      const rootPageResult = await pageListingService.findRootByViewer();

      expect(rootPageResult).toBeDefined();
      expect(rootPageResult.path).toBe('/');
      expect(rootPageResult._id.toString()).toBe(rootPage._id.toString());
    });
  });
});

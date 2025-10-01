export class BulkExportJobExpiredError extends Error {
  constructor() {
    super('Bulk export job has expired');
  }
}

export class BulkExportJobStreamDestroyedByCleanupError extends Error {
  constructor() {
    super('Bulk export job stream was destroyed by cleanup');
  }
}

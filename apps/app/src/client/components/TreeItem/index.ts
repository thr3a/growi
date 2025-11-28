// Re-export from features/page-tree (new implementation)
export {
  TreeItemLayout,
  SimpleItemContent,
  type TreeItemProps,
  type TreeItemToolProps,
} from '~/features/page-tree';

// Legacy exports (for old implementation - will be deprecated)
export * from './NewPageInput';
export * from './ItemNode';

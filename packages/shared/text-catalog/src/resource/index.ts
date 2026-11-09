export { deriveTextContract, parseTextNamespace } from './contracts/dictionary.js';
export { ownTextContracts, textContractSchema } from './contracts/schema.js';
export { TEXT_CONTRACT_VERSION } from './contracts/constants.js';
export type {
  TextContracts,
  TextContractsInput,
  OwnedTextContracts,
  TextNamespaceContract,
  TextKey,
  TextArguments,
  TextReadOptions,
  MissingText,
} from './contracts/types.js';
export type { GeneratedTextContract } from './contracts/schema.js';
export { TextResource, DEFAULT_TEXT_LOCALE_CAPACITY } from './state/text-resource.js';
export { TextInterpolationError } from './state/interpolation.js';
export type {
  TextViewDictionary,
  TextResourceInput,
  TextResourceOptions,
  TextViewOptions,
} from './state/types.js';
export { composeTextViews } from './state/text-view.js';
export type { TextReadView } from './state/text-view.js';
export { textResourceManifestSchema, TEXT_RESOURCE_MANIFEST_VERSION } from './manifest.js';

import { ApiKeysPage } from '../components/api-keys/index.js';

/**
 * `/{role}/api-keys` — thin route wrapper. All logic lives in the
 * `components/api-keys/` feature folder.
 */
export const ApiKeys = () => <ApiKeysPage />;

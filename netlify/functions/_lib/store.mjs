/* Accès aux magasins Netlify Blobs (magasins de site : ils survivent aux redéploiements). */
import { getStore } from '@netlify/blobs';

export const contentStore = () => getStore({ name: 'gapawa-content', consistency: 'strong' });
export const mediaStore = () => getStore({ name: 'gapawa-media', consistency: 'strong' });
export const authStore = () => getStore({ name: 'gapawa-auth', consistency: 'strong' });
export const requestsStore = () => getStore({ name: 'gapawa-requests', consistency: 'strong' });

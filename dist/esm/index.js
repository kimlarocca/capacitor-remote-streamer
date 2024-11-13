import { registerPlugin } from '@capacitor/core';
const RemoteStreamer = registerPlugin('RemoteStreamer', {
    web: () => import('./web').then(m => new m.RemoteStreamerWeb()),
});
export * from './definitions';
export { RemoteStreamer };
//# sourceMappingURL=index.js.map
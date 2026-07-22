import { createTauriViteConfig } from "@pziel/pureui/vite";

export default createTauriViteConfig({
  appUrl: import.meta.url,
  devPort: 1433,
  hmrPort: 1421,
});

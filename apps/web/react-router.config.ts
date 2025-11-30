import type { Config } from '@react-router/dev/config';

export default {
	appDirectory: './src/app',
	// Netlify is serving this as a static SPA, so disable SSR rendering.
	ssr: false,
	// Skip prerendering; Netlify will serve the client bundle only.
	prerender: false,
} satisfies Config;

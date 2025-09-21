import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte', '@wxt-dev/auto-icons'],
	manifest: {
		name: 'Quest Schedule Exporter',
		description: `Export your uWaterloo Quest schedule to iCalendar (.ics) since Quest doesn't support it and has a terrible UI. One-click export`,
		category: 'productivity',
		homepage_url: 'https://github.com/fel1x-developer/Quest-Schedule-Exporter-Browser-Extension',
		lang: 'en',
		icons: {
			'16': '/icons/16.png',
			'32': '/icons/32.png',
			'48': '/icons/48.png',
			'128': '/icons/128.png'
		}
	},
	vite: () => ({
		plugins: [tailwindcss()]
	})
});

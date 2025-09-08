import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte', '@wxt-dev/auto-icons'],
	manifest: {
		name: 'Quest Schedule Exporter',
		description:
			'Since uWaterloo Quest does not support exporting your schedule to an iCalendar file and the UI sucks, this extension allows you to export your schedule to an iCalendar file.',
		category: 'productivity',
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

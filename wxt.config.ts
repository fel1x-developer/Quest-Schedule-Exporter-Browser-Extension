import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

const description = `
Quest Schedule Exporter - Never Miss a Class Again

Tired of uWaterloo Quest's outdated interface and lack of basic functionality? You're not alone. Despite being the primary platform for course registration and schedule management at the University of Waterloo, Quest frustratingly lacks the ability to export your class schedule to standard calendar formats like iCalendar (.ics files). This means students are stuck manually transcribing their course schedules into their preferred calendar applications - a tedious, error-prone process that wastes valuable time.

This browser extension solves that problem once and for all. With just one click, you can export your entire Quest schedule directly to an iCalendar file that's compatible with virtually every calendar application, including Google Calendar, Apple Calendar, Outlook, and more. No more squinting at Quest's clunky interface trying to remember when your next lecture starts, and no more missing important classes because you forgot to manually add them to your calendar.

Key Features:

• One-click export: Generate a complete iCalendar file of your current term schedule in seconds
• Universal compatibility: Works with Google Calendar, Apple Calendar, Outlook, and any application that supports .ics files
• Automatic updates: Re-export your schedule whenever you make changes to your course registration
• Clean formatting: Includes course codes, titles, locations, and instructor information in a readable format
• Time zone accuracy: Properly handles Eastern Time scheduling to prevent confusion

Perfect for:

• Students who want their class schedule in their phone's native calendar app
• Anyone who uses calendar blocking for time management and productivity
• Students sharing schedules with family, friends, or study groups
• Those who integrate their academic schedule with work, extracurricular, and personal commitments

Stop fighting with Quest's terrible user interface and start managing your academic schedule like it's 2025. Install this extension and reclaim control over your time management.
`;

// See https://wxt.dev/api/config.html
export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte', '@wxt-dev/auto-icons'],
	manifest: {
		name: 'Quest Schedule Exporter',
		description: description,
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

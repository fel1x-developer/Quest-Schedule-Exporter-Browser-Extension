<script lang="ts">
	import { CalendarExporter } from '../../lib/CalendarExporter';

	let scheduleData = '';
	let summaryTemplate = '@code @type in @location';
	let descriptionTemplate = '@code-@section: @name (@type) in @location with @prof';
	let isProcessing = false;
	let errorMessage = '';
	let dateFormat = 'MM/DD/YYYY';

	const placeholders = ['@code', '@section', '@name', '@type', '@location', '@prof'];

	async function exportSchedule() {
		if (!scheduleData.trim()) {
			errorMessage = 'Please paste your Quest schedule data in the text area below';
			return;
		}

		isProcessing = true;
		errorMessage = '';

		try {
			const exporter = new CalendarExporter(
				dateFormat,
				scheduleData,
				summaryTemplate,
				descriptionTemplate
			);

			exporter.run();
			isProcessing = false;
		} catch (error) {
			errorMessage = 'Error processing schedule data: ' + (error as Error).message;
			isProcessing = false;
		}
	}
</script>

<main class="w-[600px] p-6 bg-white dark:bg-gray-900 min-h-screen">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">Quest Schedule Exporter</h1>
	<p class="text-sm text-gray-600 dark:text-gray-400 mb-5">
		Export your uWaterloo schedule from Quest to iCalendar format!
	</p>

	<div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-5">
		<h2 class="text-base font-semibold text-gray-900 dark:text-white mt-0 mb-2">How to use:</h2>
		<ol class="list-decimal list-inside m-0 pl-0 space-y-1">
			<li class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
				Login at <a
					href="https://quest.pecs.uwaterloo.ca/psp/SS/?cmd=login"
					target="_blank"
					rel="noopener"
					class="text-blue-600 dark:text-blue-400 hover:underline">Quest</a
				>
			</li>
			<li class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
				Go to Enroll → Choose your term → Continue
			</li>
			<li class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
				Make sure your schedule is in "list view"
			</li>
			<li class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
				Copy all the schedule data from the page (Ctrl+A, then Ctrl+C)
			</li>
			<li class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
				Paste the data into the text area below and click "Export Schedule"
			</li>
			<li class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
				Your schedule.ics file will download automatically
			</li>
		</ol>
	</div>

	<div class="flex flex-col space-y-4">
		<div class="flex flex-col space-y-1">
			<label for="schedule-data" class="text-sm font-medium text-gray-900 dark:text-white"
				>Quest schedule data:</label
			>
			<textarea
				id="schedule-data"
				bind:value={scheduleData}
				placeholder="Paste your Quest schedule data here (copy from the Quest page using Ctrl+A, then Ctrl+C)..."
				rows="8"
				class="min-h-[120px] p-2.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
			></textarea>
		</div>

		<div class="flex flex-col space-y-1">
			<label for="summary" class="text-sm font-medium text-gray-900 dark:text-white"
				>Event Summary Template:</label
			>
			<input
				id="summary"
				type="text"
				bind:value={summaryTemplate}
				placeholder="@code @type in @location"
				class="p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
			/>
		</div>

		<div class="flex flex-col space-y-1">
			<label for="description" class="text-sm font-medium text-gray-900 dark:text-white"
				>Event Description Template:</label
			>
			<input
				id="description"
				type="text"
				bind:value={descriptionTemplate}
				placeholder="@code-@section: @name (@type) in @location with @prof"
				class="p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
			/>
		</div>

		<div class="flex flex-col space-y-1">
			<label for="dateformat" class="text-sm font-medium text-gray-900 dark:text-white"
				>Date Format:</label
			>
			<select
				id="dateformat"
				bind:value={dateFormat}
				class="p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			>
				<option value="MM/DD/YYYY">MM/DD/YYYY</option>
				<option value="DD/MM/YYYY">DD/MM/YYYY</option>
				<option value="YYYY/MM/DD">YYYY/MM/DD</option>
				<option value="YYYY/DD/MM">YYYY/DD/MM</option>
				<option value="MM/YYYY/DD">MM/YYYY/DD</option>
				<option value="DD/YYYY/MM">DD/YYYY/MM</option>
			</select>
		</div>

		<div class="text-xs text-gray-600 dark:text-gray-400 p-2.5 bg-gray-50 dark:bg-gray-800 rounded">
			<strong>Available placeholders:</strong>
			{placeholders.join(', ')}
		</div>

		{#if errorMessage}
			<div
				class="text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-900/20 p-2.5 rounded text-sm border border-red-200 dark:border-red-800"
			>
				{errorMessage}
			</div>
		{/if}

		<button
			on:click={exportSchedule}
			disabled={isProcessing}
			class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-medium py-3 px-5 rounded text-base cursor-pointer transition-colors duration-200 disabled:cursor-not-allowed"
		>
			{isProcessing ? 'Processing...' : 'Export Schedule'}
		</button>
	</div>
</main>

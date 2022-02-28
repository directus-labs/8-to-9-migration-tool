import Listr from "listr";
import { apiV8, apiV9 } from "../api.js";
import { writeContext } from "../index.js";

export async function migrateFiles(context) {
	return new Listr([
		{
			title: "Getting File Count",
			task: getCount,
		},
		{
			title: "Uploading Files",
			task: uploadFiles,
		},
		{
			title: "Saving context",
			task: () => writeContext(context, "files"),
		},
	]);
}

async function getCount(context) {
	const count = await apiV8.get("/files", {
		params: {
			limit: 1,
			meta: "total_count",
		},
	});

	context.fileCount = count.data.meta.total_count;
	context.fileMap = {};
}

async function uploadFiles(context) {
	const pages = Math.ceil(context.fileCount / 100);

	const tasks = [];

	for (let i = 0; i < pages; i++) {
		tasks.push({
			title: `Uploading files ${i * 100 + 1}—${(i + 1) * 100}`,
			task: uploadBatch(i),
		});
	}

	return new Listr(tasks, { concurrent: Math.ceil(tasks.length / 10) });
}

function uploadBatch(page) {
	return async (context, task) => {
		const records = await apiV8.get("/files", {
			params: {
				offset: page * 100,
				limit: 100,
			},
		});

		for (const fileRecord of records.data.data) {
			task.output = fileRecord.filename_download;
			let url;
			if (fileRecord.data.asset_url) {
				url =
					process.env.V8_URL +
					"/" +
					process.env.V8_PROJECT_NAME +
					"/" +
					fileRecord.data.asset_url.split("/").slice(2).join("/");
			} else {
				url = fileRecord.data.full_url;
			}

			try {
				const savedFile = await apiV9.post("/files/import", {
					url,
					data: {
						filename_download: fileRecord.filename_download,
						title: fileRecord.title,
						description: fileRecord.description,
					},
				});

				context.fileMap[fileRecord.id] = savedFile.data.data.id;
			} catch (err) {
				console.error(
					`Error migrating file with id [${
						fileRecord.id
					}], response: ${JSON.stringify(err.response?.data, null, 2)}`
				);
				if (!context.allowFailures) {
					throw Error(
						"File migration failed. Check directus logs for most insight."
					);
				}
			}
		}
	};
}

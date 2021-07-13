import Listr from "listr";
import { apiV8, apiV9 } from "../api.js";

export async function migrateData(context) {
	return new Listr([
		{
			title: "Getting Counts",
			task: async () => await getCounts(context),
		},
		{
			title: "Inserting Data",
			task: async () => await insertData(context),
		},
	]);
}

async function getCounts(context) {
	context.counts = {};

	for (const collection of context.collections) {
		const count = await apiV8.get(`/items/${collection.collection}`, {
			params: {
				limit: 1,
				meta: "total_count",
			},
		});

		context.counts[collection.collection] = count.data.meta.total_count;
	}
}

async function insertData(context) {
	return new Listr(
		context.collections.map((collection) => ({
			title: collection.collection,
			task: insertCollection(collection),
		}))
	);
}

function insertCollection(collection) {
	return async (context, task) => {
		const pages = Math.ceil(context.counts[collection.collection] / 100);

		for (let i = 0; i < pages; i++) {
			task.output = `Inserting items ${i * 100 + 1}—${(i + 1) * 100}/${
				context.counts[collection.collection]
			}`;
			await insertBatch(collection, i, context, task);
		}
	};
}

async function insertBatch(collection, page, context, task) {
	const getRecordsResponse = () =>
		apiV8.get(`/items/${collection.collection}`, {
			params: {
				offset: page * 100,
				limit: 100,
			},
		});

	let recordsResponse;

	try {
		recordsResponse = await getRecordsResponse();
	} catch {
		// try again hacky hacky. We'll let it crash and burn on a second failure
		await sleep(500);
		recordsResponse = await getRecordsResponse();
	}

	const systemRelationsForCollection = context.relations.filter((relation) => {
		return (
			relation?.meta?.many_collection === collection.collection &&
			relation?.meta?.one_collection.startsWith("directus_")
		);
	});

	const itemRecords =
		systemRelationsForCollection.length === 0
			? recordsResponse.data.data
			: recordsResponse.data.data.map((item) => {
					for (const systemRelation of systemRelationsForCollection) {
						if (systemRelation?.meta?.one_collection === "directus_users") {
							item[systemRelation?.meta?.many_field] =
								context.userMap[item[systemRelation?.meta?.many_field]];
						} else if (systemRelation?.meta?.one_collection === "directus_files") {
							item[systemRelation?.meta?.many_field] =
								context.fileMap[item[systemRelation?.meta?.many_field]];
						}
					}

					return item;
			  });

	try {
		if (collection.single === true) {
			await apiV9.patch(`/items/${collection.collection}`, itemRecords[0]);
		} else {
			await apiV9.post(`/items/${collection.collection}`, itemRecords);
		}
	} catch (err) {
		console.log(err.response.data);
	}
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

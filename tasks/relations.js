import Listr from "listr";
import { apiV8, apiV9 } from "../api.js";
import { writeContext } from "../index.js";

export async function migrateRelations(context) {
  return new Listr([
    {
      title: "Migrating Relations",
      task: () => migrateRelationsData(context),
    },
    {
      title: "Saving Relations context",
      task: () => writeContext(context, "relations"),
    },
  ]);
}

async function migrateRelationsData(context) {
  const relations = await apiV8.get("/relations", { params: { limit: -1 } });
  const relationsV9 = relations.data.data
    .filter((relation) => {
      return (
        (relation.collection_many.startsWith("directus_") &&
          relation.collection_one.startsWith("directus_")) === false
      );
    })
    .map((relation) => ({
      meta: {
        many_collection: relation.collection_many,
        many_field: relation.field_many,
        one_collection: relation.collection_one,
        one_field: relation.field_one,
        junction_field: relation.junction_field,
      },
      field: relation.field_many,
      collection: relation.collection_many,
      related_collection: relation.collection_one,
      schema: null,
    }));

  const systemFields = context.collections
    .map((collection) =>
      Object.values(collection.fields)
        .filter((details) => {
          return details.type === "file" || details.type.startsWith("user");
        })
        .map((field) => ({
          meta: {
            many_field: field.field,
            many_collection: collection.collection,
            one_collection:
              field.type === "file" ? "directus_files" : "directus_users",
          },
          field: field.field,
          collection: collection.collection,
          related_collection:  field.type === "file" ? "directus_files" : "directus_users",
          schema: null,
        }))
    )
    .flat();

  for (const relation of [...relationsV9, ...systemFields]) {
    await apiV9.post("/relations", relation);
  }

  context.relations = [...relationsV9, ...systemFields];
}

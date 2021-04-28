import Listr from "listr";
import { apiV8, apiV9 } from "../api.js";
import { typeMap } from "../constants/type-map.js";
import { interfaceMap } from "../constants/interface-map.js";

export async function migrateSchema(context) {
  return new Listr([
    {
      title: "Downloading Schema",
      task: () => downloadSchema(context),
    },
    {
      title: "Creating Collections",
      task: () => migrateCollections(context),
    },
    {
      title: "Migrating Relations",
      task: () => migrateRelations(context),
    },
  ]);
}

async function downloadSchema(context) {
  const response = await apiV8.get("/collections");
  context.collections = response.data.data.filter(
    (collection) => collection.collection.startsWith("directus_") === false
  ).filter(
    (collection) => !context.skipCollections.includes(collection.collection)
  );
}

async function migrateCollections(context) {
  return new Listr(
    context.collections.map((collection) => ({
      title: collection.collection,
      task: migrateCollection(collection),
    }))
  );
}

function migrateCollection(collection) {
  return async () => {

    const statusField = Object.values(collection.fields).find((field) => field.interface === "status")

    const collectionV9 = {
      collection: collection.collection,
      meta: {
        note: collection.note,
        hidden: collection.hidden,
        singleton: collection.single,
        icon: collection.icon,
        translations: collection.translation?.map(({locale, translation}) => ({
          language: locale,
          translation
        })),
        sort_field:
          Object.entries(collection.fields).find(([field, details]) => {
            return (details.type || "").toLowerCase() === "sort";
          })?.field || null,
        ...(statusField ? {
          archive_field: statusField.field,
          archive_value: Object.values(statusField.options.status_mapping).find((option) => option.soft_delete).value,
          unarchive_value: Object.values(statusField.options.status_mapping).find((option) => !option.soft_delete && !option.published).value
        } : {})
      },
      schema: {},
      fields: Object.entries(collection.fields).map(([field, details]) => {
        return {
          field: field,
          type:
            details.datatype?.toLowerCase() === "text"
              ? "text"
              : typeMap[details.type.toLowerCase()],
          meta: {
            note: details.note,
            interface: interfaceMap[(details.interface || "").toLowerCase()],
            translations: details.translation?.map(({locale, translation}) => ({
              language: locale,
              translation
            })),
            readonly: details.readonly,
            hidden: details.hidden_detail,
            width: details.width,
            special: extractSpecial(details),
            options:
              details.interface === "repeater"
                ? {
                    fields: details.options.fields.map((field) => ({
                      name: field.field,
                      type: field.type,
                      field: field.field,
                      meta: {
                        name: field.field,
                        type: field.type,
                        field: field.field,
                        width: field.width,
                        interface: field.interface,
                      },
                    })),
                  }
                : details.interface === "status"
                ? {
                  "choices": Object.values(details.options.status_mapping).map(({name, value}) => (
                    {
                      "text": name,
                      "value": value
                    }
                  ))
                }
                : null,
          },
          schema:
            ["alias", "o2m"].includes(typeMap[details.type.toLowerCase()]) ===
            false
              ? {
                  has_auto_increment: details.auto_increment,
                  default_value: extractValue(details),
                  is_primary_key: details.primary_key,
                  is_nullable: details.required === false,
                  max_length: details.length,
                  numeric_precision:
                    (details.length || "").split(",")[0] || null,
                  numeric_scale: (details.length || "").split(",")[1] || null,
                }
              : undefined,
        };
      }),
    };

    await apiV9.post("/collections", collectionV9);
  };

  function extractValue(details) {
    if (typeMap[details.type.toLowerCase()] === "json") {
      try {
        JSON.parse(details.default_value);
      } catch(ex) {
        return JSON.stringify(details.default_value);
      }
    }

    return details.default_value;
  }

  function extractSpecial(details) {
    if (details.type === "alias") {
      return ["alias", "no-data"];
    }

    if (details.type === "boolean") {
      return ["boolean"];
    }

    if (details.type === "hash") {
      return ["hash"];
    }

    if (details.type === "json") {
      return ["json"];
    }

    if (details.type === "uuid") {
      return ["uuid"];
    }

    if (details.type === "owner") {
      return ["user-created"];
    }

    if (details.type === "user_updated") {
      return ["user-updated"];
    }

    if (details.type === "datetime_created") {
      return ["date-created"];
    }

    if (details.type === "datetime_updated") {
      return ["date-updated"];
    }

    if (details.type === "csv") {
      return ["csv"];
    }

    if (details.type === "o2m") {
      return ["o2m"];
    }

    if (details.type === "m2o") {
      return ["m2o"];
    }
  }
}

async function migrateRelations(context) {
  const relations = await apiV8.get("/relations", { params: { limit: -1 } });

  const relationsV9 = relations.data.data
    .filter((relation) => {
      return (
        (relation.collection_many.startsWith("directus_") &&
          relation.collection_one.startsWith("directus_")) === false
      );
    })
    .map((relation) => ({
      // @NOTE: one_primary will be removed from Directus soon, so i'm not too worried about it here
      many_collection: relation.collection_many,
      many_field: relation.field_many,
      many_primary: "id",
      one_collection: relation.collection_one,
      one_field: relation.field_one,
      one_primary: "id",
    }));

  const systemFields = context.collections
    .map((collection) =>
      Object.values(collection.fields)
        .filter((details) => {
          return details.type === "file" || details.type.startsWith("user");
        })
        .map((field) => ({
          many_field: field.field,
          many_collection: collection.collection,
          many_primary: "id",
          one_collection:
            field.type === "file" ? "directus_files" : "directus_users",
          one_primary: "id",
        }))
    )
    .flat();

  await apiV9.post("/relations", [...relationsV9, ...systemFields]);

  context.relations = [...relationsV9, ...systemFields];
}

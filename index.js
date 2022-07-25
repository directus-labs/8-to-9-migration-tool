import Listr from "listr";

import commandLineArgs from "command-line-args";
import * as fs from "fs";
import { migrateSchema } from "./tasks/schema.js";
import { migrateFiles } from "./tasks/files.js";
import { migrateUsers } from "./tasks/users.js";
import { migrateData } from "./tasks/data.js";
import { fetchRelations, migrateRelations } from "./tasks/relations.js";

const commandLineOptions = commandLineArgs([
  {
    name: "skipCollections",
    alias: "s",
    type: String,
    multiple: true,
    defaultValue: [],
  },
  {
    name: "useContext",
    alias: "c",
    type: String,
    multiple: false,
    defaultValue: "./context/start.json",
  },
  {
    name: "allowFailures",
    alias: "l",
    type: Boolean,
    multiple: false,
    defaultValue: false,
  },
]);

const tasks = new Listr([
  {
    title: "Loading context",
    task: setupContext,
  },
  {
    title: "Fetch Relations",
    skipt: (context) =>
      context.completedSteps.relationsv8 === true &&
      context.completedSteps.schema === true &&
      context.completedSteps.relations === true,
    task: fetchRelations,
  },
  {
    title: "Migrating Schema",
    skip: (context) =>
      context.completedSteps.schema === true &&
      context.completedSteps.collections === true,
    task: (context) => {
      context.skipCollections = commandLineOptions.skipCollections;
      return migrateSchema(context);
    },
  },
  {
    title: "Migrating Users",
    skip: (context) =>
      context.completedSteps.roles === true &&
      context.completedSteps.users === true,
    task: migrateUsers,
  },
  {
    title: "Migrating Relations",
    skip: (context) =>
      context.completedSteps.relationsv8 === true &&
      context.completedSteps.relations === true,
    task: migrateRelations,
  },
  {
    title: "Migration Files",
    skip: (context) => context.completedSteps.files === true,
    task: migrateFiles,
  },
  {
    title: "Migrating Data",
    skip: (context) => context.completedSteps.data === true,
    task: migrateData,
  },

  {
    title: "Save final context",
    task: (context) => {
      context.section = "completed";
      writeContext(context);
    },
  },
]);

let ctx = {};

export async function writeContext(context, completed = true) {
  context.completedSteps[context.section] = completed;
  await fs.promises.writeFile(
    `./context/state/${context.section}.json`,
    JSON.stringify(context)
  );
}

async function setupContext(context) {
  ctx = context;
  context.allowFailures = commandLineOptions.allowFailures;
  const contextJSON = await fs.promises.readFile(
    commandLineOptions.useContext,
    "utf8"
  );
  console.log("Loading context");
  const fetchedContext = JSON.parse(contextJSON);
  Object.entries(fetchedContext).forEach(([key, value]) => {
    context[key] = value;
  });
  console.log(`✨ Loaded context succesfully`);
}

console.log(
  `✨ Migrating ${process.env.V8_URL} (v8) to ${process.env.V9_URL} (v9)...`
);

try {
  await tasks.run();

  console.log("✨ All set! Migration successful.");
} catch (err) {
  console.error(err);
  await writeContext(ctx, false);
}

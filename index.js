import Listr from 'listr';

import { migrateSchema } from './tasks/schema.js';
import { migrateUsers } from './tasks/users.js';

const tasks = new Listr([
   {
      title: 'Migrating Schema',
      task: migrateSchema
   },
   {
      title: 'Migrating Users',
      task: migrateUsers
   },
]);

tasks.run().catch(err => {
	console.error(err);
});
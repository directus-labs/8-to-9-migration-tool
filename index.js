import Listr from 'listr';

import { downloadMigrations } from './tasks/collections.js';

const tasks = new Listr([
   {
      title: 'Migrating Collections...',
      task: () => new Listr([
         {
            title: 'Downloading migrations',
            task: downloadMigrations
         }
      ])
   }
]);

tasks.run().catch(err => {
	console.error(err);
});

async function migrateCollections() {

}


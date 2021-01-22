import Listr from 'listr';
import { apiV8, apiV9 } from '../api.js';
import { typeMap } from '../constants/type-map.js';
import { interfaceMap } from '../constants/interface-map.js';

export async function migrateSchema(context) {
   return new Listr([
      {
         title: 'Downloading Schema',
         task: downloadSchema
      },
      {
         title: 'Creating Collections',
         task: migrateCollections,
      }
   ]);
}

async function downloadSchema(context) {
   const response = await apiV8.get('/collections');
   context.collections = response.data.data;
}

async function migrateCollections(context) {
   return new Listr(
      context.collections
         .filter(collection => collection.collection.startsWith('directus_') === false)
         .map((collection) => ({
            title: collection.collection,
            task: migrateCollection(collection)
         }))
   )
}

function migrateCollection(collection) {
   return async () => {
      const collectionV9 = {
         collection: collection.collection,
         meta: {
            note: collection.note,
            hidden: collection.hidden,
            singleton: collection.single,
            translations: collection.translation,
            sort_field: Object.entries(collection.fields).find(([field, details]) => {
               return (details.type || '').toLowerCase() === 'sort';
            })?.field || null,
         },
         schema: {},
         fields: Object.entries(collection.fields).map(([field, details]) => {
            return {
               field: field,
               type: typeMap[details.type.toLowerCase()],
               meta: {
                  note: details.note,
                  interface: interfaceMap[(details.interface || '').toLowerCase()],
                  translation: details.translation,
                  readonly: details.readonly,
                  hidden: details.hidden_detail,
                  width: details.width,
                  special: extractSpecial(details),
               },
               schema: ['alias', 'o2m'].includes(typeMap[details.type.toLowerCase()]) === false ? {
                  has_auto_increment: details.auto_increment,
                  default_value: details.default_value,
                  is_primary_key: details.primary_key,
                  is_nullable: details.required === false,
                  max_length: details.length,
                  numeric_precision: (details.length || '').split(',')[0] || null,
                  numeric_scale: (details.length || '').split(',')[1] || null,
               } : undefined,
            }
         })
      };

      await apiV9.post('/collections', collectionV9);
   }

   function extractSpecial(details) {
      if (details.type === 'alias') {
         return ['alias', 'no-data'];
      }

      if (details.type === 'boolean') {
         return ['boolean'];
      }

      if (details.type === 'hash') {
         return ['hash'];
      }

      if (details.type === 'json') {
         return ['json']
      }

      if (details.type === 'uuid') {
         return ['uuid']
      }

      if (details.type === 'owner') {
         return ['user-created']
      }

      if (details.type === 'user_updated') {
         return ['user-updated']
      }

      if (details.type === 'datetime_created') {
         return ['date-created'];
      }
      
      if (details.type === 'datetime_updated') {
         return ['date-updated'];
      }

      if (details.type === 'csv') {
         return ['csv']
      }

      if (details.type === 'o2m') {
         return ['o2m']
      }
      
      if (details.type === 'm2o') {
         return ['m2o']
      }
   }
}
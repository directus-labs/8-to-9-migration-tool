# Migration Tool

Migrate from a v8 instance to v9 instance.

This tool will copy over:

- Schema (collections / fields)
- Files (including file contents)
- User data (eg all items in all collections)
- Roles
- Users

**Note:** This tool will NOT copy over:

- Interface/display configurations
- Permissions
- Activity / revisions

## Usage

1. Clone this repo
2. Add a .env file with the following values:

---

You SHOULD use either Cookie or JWT authentication (leaving one or the other empty).

Using `Cookie Authentication` provides you with more time to migrate large amounts of data like the [project files](https://v8.docs.directus.io/guides/files.html#files-thumbnails).

See [documentation](https://v8.docs.directus.io/api/authentication.html#tokens) for more details on obtaining
authentication tokens on Directus v8.

---

```
V8_URL="https://v8.example.com"
V8_PROJECT_NAME="project"
V8_TOKEN="admin"
V8_COOKIE_TOKEN="cookie_value"

V9_URL="https://v9.example.com"
V9_TOKEN="admin"
```

3. Run `npm install`
4. Run the `index.js` file: `node index.js`

Note: If you want to save the error logs to a folder, you can redirect the error output `node index.js 2> errors.txt`

### Commandline Options

---

You can exclude collections/database tables from being migrated by using the `-s` or `--skipCollections` flag:

```
node index.js -s <table_name> <another_table_name>
```

---

You can pass a context file to resume from a specific point or to modify the data manually that you want to use for the migration by using the `-c` or `--useContext` flag:

```
node index.js -c <path_to_context>
```

---

You can allow errors to occur during the migration by using the `-l` or `--allowFailures` flag:

```
node index.js -l
```

---

### Specifying collection dependencies

If the default detection of the dependencies between collections doesn't work in your case, you can manually specify it with the env variable `COLLECTION_ORDER`. Just supply a comma separated list in which order you'd need the data of your collections to be imported.

```
COLLECTION_ORDER="first_collection,second_collection,third_collection"
```

---

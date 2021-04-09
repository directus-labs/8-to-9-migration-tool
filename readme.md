# Migration Tool

Migrate from a v8 instance to v9 instance. 

This tool will copy over:

* Schema (collections / fields)
* Files (including file contents)
* User data (eg all items in all collections)
* Roles
* Users

**Note:** This tool will NOT copy over:

* Interface/display configurations
* Permissions
* Activity / revisions

## Usage

1) Clone this repo
2) Add a .env file with the following values:
***
You SHOULD use either Cookie or JWT authentication (leaving one or the other empty).

Using `Cookie Authentication` provides you with more time to migrate large amounts of data like the [project files](https://v8.docs.directus.io/guides/files.html#files-thumbnails).

See [documentation](https://v8.docs.directus.io/api/authentication.html#tokens) for more details on obtaining
authentication tokens on Directus v8.
***
```
V8_URL="https://v8.example.com"
V8_PROJECT_NAME="project"
V8_TOKEN="admin"
V8_COOKIE_TOKEN="cookie_value"

V9_URL="https://v9.example.com"
V9_TOKEN="admin"
```
3) Run `npm install`
4) Run the `index.js` file: `node index.js`
***
You can exclude collections/database tables from being migrated by using:
```
node index.js -s <table_name> <another_table_name>
```
***

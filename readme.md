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
```
V8_URL="https://v8.example.com/project"
V8_TOKEN="admin"

V9_URL="https://v9.example.com"
V9_TOKEN="admin"
```
3) Run the `index.js` file: `node index.js`
   
### NOTE
You can exclude collections/database tables from being migrated by using:
```
node index.js -s <table_name> <another_table_name>
```

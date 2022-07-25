import Listr from "listr";
import { apiV8, apiV9 } from "../api.js";
import { writeContext } from "../index.js";

export async function migrateUsers(context) {
  return new Listr([
    {
      title: "Downloading Roles",
      skip: (context) => context.completedSteps.roles === true,
      task: downloadRoles,
    },
    {
      title: "Creating Roles",
      skip: (context) => context.completedSteps.roles === true,
      task: createRoles,
    },
    {
      title: "Saving Roles context",
      skip: (context) => context.completedSteps.roles === true,
      task: () => {
        context.section = "roles";
        writeContext(context);
      },
    },
    {
      title: "Downloading Users",
      skip: (context) => context.completedSteps.users === true,
      task: downloadUsers,
    },
    {
      title: "Creating Users",
      skip: (context) => context.completedSteps.users === true,
      task: createUsers,
    },
    {
      title: "Saving users context",
      skip: (context) => context.completedSteps.users === true,
      task: () => {
        context.section = "users";
        writeContext(context);
      },
    },
  ]);
}

async function downloadRoles(context) {
  const response = await apiV8.get("/roles");
  context.roles = response.data.data.filter((role) => {
    return role.id !== 2; // Role 2 was the hardcoded public role
  });
}

async function createRoles(context) {
  const rolesV9 = context.roles.map((role) => ({
    name: role.name,
    icon: "supervised_user_circle",
    description: role.description,
    ip_access: role.ip_whitelist,
    enforce_tfa: !!role.enforce_2fa,
    admin_access: role.id === 1, // 1 was hardcoded admin role
    app_access: true,
  }));

  const createdRoles = await apiV9.post("/roles", rolesV9, {
    params: { limit: -1 },
  });

  context.roleMap = {};

  let createdRolesAsArray = createdRoles.data.data;

  if (Array.isArray(createdRolesAsArray) === false)
    createdRolesAsArray = [createdRolesAsArray];

  context.roles.forEach((role, index) => {
    context.roleMap[role.id] = createdRolesAsArray.find(
      (r) => r.name == role.name
    ).id;
  });

  context.roles = createdRolesAsArray;
}

async function downloadUsers(context) {
  const response = await apiV8.get("/users", {
    params: {
      limit: -1,
      status: "*",
    },
  });
  context.users = response.data.data;
  context.userMap = context.userMap || {};
}

async function createUsers(context) {
  let createdUsersAsArray = [];
  let chunk = [];
  let offset = 0;
  const size = 10;

  do {
    chunk = context.users.slice(offset * size, (offset + 1) * size);

    const usersV9 = chunk.flatMap((user) => {
      if (context.userMap[user.id]) return [];

      return [
        {
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          title: user.title,
          description: user.description,
          // avatar: user.avatar, @TODO: files first
          language: user.locale,
          theme: user.theme,
          role: context.roleMap[user.role],
          token: user.token,
        },
      ];
    });

    offset++;

    if (!usersV9.length) continue;

    try {
      const response = await apiV9.post("/users", usersV9, {
        params: { limit: -1 },
      });

      const createdUsers = response.data.data;

      for (const userV8 of chunk) {
        context.userMap[userV8.id] = createdUsers.find(
          (u) => u.email == userV8.email
        ).id;
      }

      createdUsersAsArray = createdUsersAsArray.concat(createdUsers);
      await writeContext(context, false);
    } catch (error) {
      console.error(error.response);
    }
  } while (chunk.length === 10);

  context.users.forEach((user, index) => {
    context.userMap[user.id] = createdUsersAsArray.find(
      (u) => u.email == user.email
    ).id;
  });

  context.users = createdUsersAsArray;
}

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const apiV8 = axios.create({
  baseURL: process.env.V8_URL + "/" + process.env.V8_PROJECT_NAME,
  headers: {
    Authorization: `Bearer ${process.env.V8_TOKEN}`,
    Cookie: `directus-${process.env.V8_PROJECT_NAME}-session=${process.env.V8_COOKIE_TOKEN}`,
  },
});

apiV8.interceptors.response.use(
  (response) => response,
  (error) => {
    const err = /**@type {import('axios').AxiosError}*/ (error);
    throw Error(`
    V8 =>
    ${err.config.url}
    ${err.config.params}
    ${JSON.stringify(err.config.params, null, 4)}
    V8 <=
    ${err.response.status}
    ${JSON.stringify(err.response.data, null, 4)}
    `);
  }
);

const apiV9 = axios.create({
  baseURL: process.env.V9_URL,
  headers: {
    Authorization: `Bearer ${process.env.V9_TOKEN}`,
  },
});

apiV9.interceptors.response.use(
  (response) => response,
  (error) => {
    const err = /**@type {import('axios').AxiosError}*/ (error);
    throw Error(`
    V9 =>
    ${err.config.url}
    ${err.config.params}
    ${JSON.stringify(err.config.params, null, 4)}
    V9 <=
    ${err.response.status}
    ${JSON.stringify(err.response.data, null, 4)}
    `);
  }
);

export { apiV8, apiV9 };

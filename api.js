import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiV8 = axios.create({
   baseURL: process.env.V8_URL,
   headers: {
      Authorization: `Bearer ${process.env.V8_TOKEN}`
   }
});

const apiV9 = axios.create({
   baseURL: process.env.V9_URL,
   headers: {
      Authorization: `Bearer ${process.env.V9_TOKEN}`
   }
});

export { apiV8, apiV9 };

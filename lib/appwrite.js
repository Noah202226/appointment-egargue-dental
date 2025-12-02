import { Client, Account, Databases, Storage } from "appwrite";

const client = new Client();

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) // e.g., 'http://localhost/v1' or your Appwrite Cloud endpoint
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID); // Your Appwrite project ID

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID } from "appwrite";
export default client;

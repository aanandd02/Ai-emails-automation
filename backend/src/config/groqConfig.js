import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.GROQ_API_KEY) {
  throw new Error("Missing required env var: GROQ_API_KEY");
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

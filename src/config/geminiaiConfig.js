import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load .env before using it
dotenv.config();

console.log("🔑 GEMINI_API_KEY loaded:", process.env.GEMINI_API_KEY ? "✅ Found" : "❌ Missing");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default genAI;

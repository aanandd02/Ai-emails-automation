import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

console.log("🔑 GEMINI_API_KEY loaded:", process.env.GEMINI_API_KEY ? "✅ Found" : "❌ Missing");

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch user's watch history context
async function fetchUserWatchlistContext(userId) {
  if (!userId) return "No prior watchlist on record.";
  try {
    const watchlistSnap = await getDocs(collection(db, 'users', userId, 'watchlist'));
    const titles = watchlistSnap.docs.map(doc => doc.data().title);
    if (titles.length === 0) return "User's Vault is currently empty.";
    return `Operative's Vault Favorites: ${titles.slice(-5).join(', ')}.`;
  } catch (error) {
    console.error("Failed to fetch watchlist memory:", error);
    return "Vault query offline.";
  }
}

export async function POST(req) {
  try {
    const { mood, userId, newMessage } = await req.json();
    const queryText = newMessage || mood;

    if (queryText?.toLowerCase().includes("mock")) {
      return NextResponse.json({
        profile: "Simulated operative profile engaged.",
        recommendedTitle: "Blade Runner 2049",
        reasoning: "Simulated Oracle transmission engaged. Visual interface is fully operational.",
        faction: "Cyberpunk"
      });
    }
    
    const userMemory = await fetchUserWatchlistContext(userId);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are The Oracle, a highly advanced, cynical cinematic AI in a cyberpunk universe.
      The operative's current emotional state/query: "${queryText}".
      Their watch history memory: ${userMemory}
      
      Based on this state and history, recommend ONE specific movie they should watch next, create a short classified profile, and assign them a cyberpunk Faction (e.g., Noir, Cyberpunk, Auteur, Blockbuster).
      
      You must respond strictly in the following JSON format without any markdown blocks or extra text:
      {
        "profile": "1-2 sentences analyzing their psychological state.",
        "recommendedTitle": "Exact Movie Title",
        "reasoning": "Your badass, in-character explanation of why this fits their mood and history.",
        "faction": "Assigned Faction Name"
      }
    `;

    let retries = 3;
    let result;

    while (retries > 0) {
      try {
        result = await model.generateContent(prompt);
        break; 
      } catch (apiError) {
        if (apiError.status === 503 && retries > 1) {
          await delay(2000); 
          retries--;
        } else {
          throw apiError; 
        }
      }
    }

    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return NextResponse.json(JSON.parse(cleanJson));

  } catch (error) {
    console.error("Oracle Connection Failed:", error.message);
    
    return NextResponse.json({
      profile: "Mainframe telemetry failure detected.",
      recommendedTitle: "The Matrix",
      reasoning: "The central mainframe rejected our uplink due to exhausted quota limits, but the Oracle always has a backup plan for you.",
      faction: "Resistance"
    });
  }
}
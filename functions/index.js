// Firebase Cloud Functions - functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Claude } = require("claude-api");

admin.initializeApp();

// Initialize Google's Generative AI with your API key
const genAI = new GoogleGenerativeAI(functions.config().gemini.key);
const claude = new Claude({ apiKey: functions.config().claude.key });

exports.analyzeImage = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to analyze images."
    );
  }

  const { imageUrl } = data;
  if (!imageUrl) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Image URL is required."
    );
  }

  try {
    // Fetch the image from the URL
    const fetch = require("node-fetch");
    const response = await fetch(imageUrl);
    const imageBuffer = await response.buffer();

    // Convert to base64 for Gemini
    const base64Image = imageBuffer.toString("base64");

    // Use Google's Gemini model for image analysis
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg", // Adjust based on actual image type
        },
      },
      {
        text: "Analyze this image in detail. Describe what you see, identify objects, people, settings, text, and any other notable elements. Focus on providing factual descriptions rather than interpretations.",
      },
    ]);

    const geminiResponse = await result.response;
    const geminiText = geminiResponse.text();

    // Extract labels (key elements) from the image
    const labels = extractLabels(geminiText);

    // Also use Claude to get a different perspective on the image
    const claudeResponse = await claudeAnalyzeImage(base64Image);

    // Combine results for a more comprehensive analysis
    return {
      description: geminiText,
      claudeDescription: claudeResponse,
      labels: labels,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
  } catch (error) {
    console.error("Image analysis error:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to analyze image: " + error.message
    );
  }
});

// Helper function to extract labels from the description
function extractLabels(description) {
  // Simple extraction of key nouns from the description
  // In a real implementation, you might use NLP or another model for this
  const words = description.toLowerCase().split(/\W+/);
  const commonWords = new Set([
    "the", "and", "a", "of", "in", "is", "it", "to", "that", "this",
    "with", "for", "on", "at", "by", "an", "are", "be", "as", "was",
    "were", "being", "been", "have", "has", "had", "do", "does", "did",
    "but", "or", "if", "because", "as", "until", "while"
  ]);
  
  const uniqueWords = new Set();
  words.forEach(word => {
    if (word.length > 3 && !commonWords.has(word)) {
      uniqueWords.add(word);
    }
  });
  
  return Array.from(uniqueWords).slice(0, 20); // Return top 20 unique words
}

// Function to analyze image with Claude
async function claudeAnalyzeImage(base64Image) {
  try {
    const conversation = claude.createConversation();
    const response = await conversation.sendMessage({
      message: "Please describe what you see in this image with as much detail as possible.",
      files: [{
        file_data: {
          data: base64Image,
          mime_type: "image/jpeg"
        }
      }]
    });
    
    return response.text;
  } catch (error) {
    console.error("Claude image analysis error:", error);
    return "Claude analysis unavailable";
  }
}
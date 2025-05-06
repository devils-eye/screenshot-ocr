// Gemini API integration for Screenshot OCR extension

/**
 * Generate a title for the extracted text using Google Gemini API
 * @param {string} extractedText - The text extracted from the screenshot
 * @param {string} apiKey - The Google Gemini API key
 * @returns {Promise<string>} - A promise that resolves to the generated title
 */
async function generateTitle(extractedText, apiKey) {
  try {
    if (!apiKey) {
      throw new Error(
        "Gemini API key not set. Please set your Gemini API key in the options page."
      );
    }

    if (!extractedText || extractedText.trim() === "") {
      return "Untitled Screenshot";
    }

    console.log("Generating title using Gemini API...");

    // Prepare the request to Gemini API
    const requestBody = {
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Generate a concise, descriptive title (maximum 50 characters) for the following extracted text from a screenshot. Only respond with the title, nothing else:

${extractedText.substring(0, 1500)}`, // Limit text length to avoid token limits
            },
          ],
        },
      ],
    };

    // Make the request
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Check if the response is OK
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API Error: ${errorData.error?.message || response.statusText}`
      );
    }

    // Parse the successful response
    const data = await response.json();

    // Extract the title from the response
    if (
      data.candidates &&
      data.candidates.length > 0 &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts.length > 0
    ) {
      const title = data.candidates[0].content.parts[0].text.trim();
      console.log("Generated title:", title);

      // Return the title, or a default if empty
      return title || "Untitled Screenshot";
    } else {
      console.warn("Unexpected Gemini API response format:", data);
      return "Untitled Screenshot";
    }
  } catch (error) {
    console.error("Title generation error:", error);
    return "Untitled Screenshot"; // Default title in case of error
  }
}

/**
 * Test the Gemini API connection
 * @param {string} apiKey - The Google Gemini API key
 * @returns {Promise<Object>} - A promise that resolves to the test result
 */
async function testGeminiConnection(apiKey) {
  try {
    if (!apiKey) {
      return {
        success: false,
        error: "API key not set. Please set your Gemini API key first.",
      };
    }

    // Create a simple test prompt
    const requestBody = {
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Hello, please respond with the word 'Connected' if you can read this message.",
            },
          ],
        },
      ],
    };

    // Send a test request to Gemini API
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Check if the response is OK
    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: `API Error: ${errorData.error?.message || response.statusText}`,
        status: response.status,
        statusText: response.statusText,
      };
    }

    // If we got here, the API key is valid
    return {
      success: true,
      message:
        "Connection to Google Gemini API successful! Your API key is working.",
    };
  } catch (error) {
    console.error("Test connection error:", error);
    return {
      success: false,
      error: `Connection error: ${error.message}`,
    };
  }
}

// Make functions available globally
try {
  // In Firefox extensions, 'self' refers to the global scope
  self.generateTitle = generateTitle;
  self.testGeminiConnection = testGeminiConnection;
  console.log("Gemini API functions exported to global scope");
} catch (error) {
  console.error("Failed to export Gemini API functions:", error);
}

// Export functions for Node.js environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = { generateTitle, testGeminiConnection };
}

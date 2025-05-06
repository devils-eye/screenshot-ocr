// Background script for Screenshot OCR extension

// Debug logging utility
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) {
    console.log("[BACKGROUND]", ...args);
  }
}

// Log all unhandled errors
window.addEventListener("error", function (event) {
  debugLog("UNHANDLED ERROR:", event.error);
});

// Import Gemini API functions
let generateTitle;
let testGeminiConnection;

// Store API keys (in a real extension, these should be securely stored or requested from user)
let mistralApiKey = "";
let geminiApiKey = "";
let autoGenerateTitles = false;

// Listen for messages from popup or content scripts
browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "captureScreenshot") {
    // Inject the screenshot content script
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      browser.scripting
        .executeScript({
          target: { tabId: tabs[0].id },
          files: ["content_scripts/screenshot.js"],
        })
        .then(() => {
          // After script is injected, send message to start capture
          browser.tabs.sendMessage(tabs[0].id, { action: "startCapture" });
        })
        .catch((error) => {
          console.error("Error injecting screenshot script:", error);
          sendResponse({ success: false, error: error.message });
        });
    });
    return true; // Keep the message channel open for async response
  }

  if (message.action === "captureVisibleTab") {
    browser.tabs
      .captureVisibleTab()
      .then((dataUrl) => {
        sendResponse(dataUrl);
      })
      .catch((error) => {
        console.error("Error capturing tab:", error);
        sendResponse(null);
      });
    return true; // Keep the message channel open for async response
  }

  if (message.action === "processOCR") {
    processOCR(message.imageData)
      .then((result) => {
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        console.error("OCR processing error:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }

  if (message.action === "saveOCRData") {
    saveToStorage(message.ocrData)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Storage error:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }

  if (message.action === "getApiKey") {
    browser.storage.local.get("apiKey").then((result) => {
      sendResponse({ apiKey: result.apiKey || "" });
    });
    return true; // Keep the message channel open for async response
  }

  if (message.action === "setApiKey") {
    browser.storage.local.set({ apiKey: message.apiKey }).then(() => {
      mistralApiKey = message.apiKey;
      sendResponse({ success: true });
    });
    return true; // Keep the message channel open for async response
  }

  if (message.action === "getGeminiApiKey") {
    browser.storage.local.get("geminiApiKey").then((result) => {
      sendResponse({ apiKey: result.geminiApiKey || "" });
    });
    return true; // Keep the message channel open for async response
  }

  if (message.action === "setGeminiApiKey") {
    browser.storage.local.set({ geminiApiKey: message.apiKey }).then(() => {
      geminiApiKey = message.apiKey;
      sendResponse({ success: true });
    });
    return true; // Keep the message channel open for async response
  }

  if (message.action === "getAutoGenerateTitles") {
    browser.storage.local.get("autoGenerateTitles").then((result) => {
      sendResponse({ enabled: result.autoGenerateTitles || false });
    });
    return true; // Keep the message channel open for async response
  }

  if (message.action === "setAutoGenerateTitles") {
    browser.storage.local
      .set({ autoGenerateTitles: message.enabled })
      .then(() => {
        autoGenerateTitles = message.enabled;
        sendResponse({ success: true });
      });
    return true; // Keep the message channel open for async response
  }
});

// Process OCR using Mistral AI API
async function processOCR(imageData) {
  try {
    // Get API key from storage
    const result = await browser.storage.local.get("apiKey");
    if (!result.apiKey) {
      throw new Error(
        "API key not set. Please set your Mistral AI API key in the options page."
      );
    }

    console.log("Sending OCR request to Mistral AI...");

    // Prepare the request to Mistral OCR API
    const requestBody = {
      model: "mistral-ocr-latest",
      document: {
        type: "image_url",
        image_url: `data:image/jpeg;base64,${imageData}`,
      },
    };

    // Make the request
    const response = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${result.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("OCR API response status:", response.status);

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;

      try {
        const errorData = await response.json();
        console.error("OCR API error response:", errorData);

        if (errorData.error) {
          errorMessage = `OCR API error: ${
            errorData.error.message ||
            errorData.error.type ||
            JSON.stringify(errorData.error)
          }`;
        }
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError);
        // Use the default error message
      }

      throw new Error(errorMessage);
    }

    // Parse the successful response
    const data = await response.json();
    console.log("OCR API response data:", data);

    // Check if the response contains the expected data
    if (!data.text && !data.pages) {
      console.warn("OCR response doesn't contain expected text data:", data);
      return {
        text: "No text was extracted from the image. The OCR API returned an unexpected response format.",
        raw_response: data,
      };
    }

    // Extract text from the response
    let extractedText = "";
    if (data.text) {
      // Direct text field
      extractedText = data.text;
    } else if (data.pages && Array.isArray(data.pages)) {
      // Pages array format - check for different text fields
      extractedText = data.pages
        .map((page) => {
          // First check for markdown field (which contains formatted text)
          if (page.markdown) {
            return page.markdown;
          }
          // Then check for text field
          else if (page.text) {
            return page.text;
          }
          // If neither exists, return empty string
          return "";
        })
        .join("\n\n");
    }

    console.log("Extracted text:", extractedText);

    return {
      text: extractedText || "No text extracted",
      raw_response: data,
    };
  } catch (error) {
    console.error("OCR processing error:", error);
    throw error;
  }
}

// Save OCR data to storage
async function saveToStorage(ocrData) {
  try {
    // Get existing OCR data and settings
    const result = await browser.storage.local.get([
      "ocrData",
      "autoGenerateTitles",
      "geminiApiKey",
    ]);
    const existingData = result.ocrData || [];
    const autoGenerate = result.autoGenerateTitles || false;
    const geminiKey = result.geminiApiKey || "";

    // Add new OCR data with timestamp and ID
    const newData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      title: "Untitled Screenshot", // Default title
      ...ocrData,
    };

    // Save updated data first (without waiting for title generation)
    const savedData = [...existingData, newData];
    await browser.storage.local.set({
      ocrData: savedData,
    });

    // Generate title in background if enabled
    if (autoGenerate && geminiKey && ocrData.text) {
      debugLog("Auto-generating title using Gemini API...");

      // Generate title asynchronously
      generateTitle(ocrData.text, geminiKey)
        .then(async (title) => {
          debugLog("Title generated:", title);

          // Find the item we just added
          const updatedData = await browser.storage.local.get("ocrData");
          const allData = updatedData.ocrData || [];

          // Find the item by ID and update its title
          const itemIndex = allData.findIndex((item) => item.id === newData.id);

          if (itemIndex !== -1) {
            allData[itemIndex].title = title;

            // Save the updated data
            await browser.storage.local.set({ ocrData: allData });
            debugLog("Title updated for item:", newData.id);
          }
        })
        .catch((error) => {
          debugLog("Error generating title:", error);
        });
    }

    return newData;
  } catch (error) {
    console.error("Error in saveToStorage:", error);
    throw error;
  }
}

// Test Mistral AI API connection
async function testMistralConnection() {
  try {
    // Get API key from storage
    const result = await browser.storage.local.get("apiKey");
    if (!result.apiKey) {
      return {
        success: false,
        error: "API key not set. Please set your Mistral AI API key first.",
      };
    }

    // Create a simple test image (1x1 pixel black image)
    const testImageData =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAJ5jYI7iwAAAABJRU5ErkJggg==";

    // Send a test request to Mistral OCR API
    const response = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${result.apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: {
          type: "image_url",
          image_url: `data:image/png;base64,${testImageData}`,
        },
      }),
    });

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
        "Connection to Mistral AI API successful! Your API key is working.",
    };
  } catch (error) {
    console.error("Test connection error:", error);
    return {
      success: false,
      error: `Connection error: ${error.message}`,
    };
  }
}

// Add test connection message handlers
browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "testMistralConnection") {
    testMistralConnection()
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: `Unexpected error: ${error.message}`,
        });
      });
    return true; // Keep the message channel open for async response
  }

  if (message.action === "testGeminiConnection") {
    try {
      // Check if the Gemini API functions are loaded
      if (typeof testGeminiConnection !== "function") {
        console.error("testGeminiConnection function is not available");
        sendResponse({
          success: false,
          error:
            "Gemini API service is not available. Please reload the extension.",
        });
        return true;
      }

      browser.storage.local
        .get("geminiApiKey")
        .then((result) => {
          const apiKey = result.geminiApiKey || "";
          console.log(
            "Testing Gemini connection with API key:",
            apiKey ? "API key set (not shown)" : "No API key"
          );

          testGeminiConnection(apiKey)
            .then((result) => {
              console.log("Gemini connection test result:", result);
              sendResponse(result);
            })
            .catch((error) => {
              console.error("Error in testGeminiConnection:", error);
              sendResponse({
                success: false,
                error: `Unexpected error: ${error.message}`,
              });
            });
        })
        .catch((error) => {
          console.error("Error getting geminiApiKey from storage:", error);
          sendResponse({
            success: false,
            error: `Storage error: ${error.message}`,
          });
        });

      return true; // Keep the message channel open for async response
    } catch (error) {
      console.error("Unexpected error in testGeminiConnection handler:", error);
      sendResponse({
        success: false,
        error: `Unexpected error: ${error.message}`,
      });
      return true;
    }
  }

  if (message.action === "generateTitle") {
    try {
      // Check if the Gemini API functions are loaded
      if (typeof generateTitle !== "function") {
        console.error("generateTitle function is not available");
        sendResponse({
          success: false,
          error:
            "Title generation service is not available. Please reload the extension.",
        });
        return true;
      }

      browser.storage.local
        .get("geminiApiKey")
        .then((result) => {
          const apiKey = result.geminiApiKey || "";
          if (!apiKey) {
            sendResponse({
              success: false,
              error:
                "Gemini API key not set. Please set your Gemini API key first.",
            });
            return;
          }

          console.log(
            "Calling generateTitle with text length:",
            message.text?.length || 0
          );

          generateTitle(message.text, apiKey)
            .then((title) => {
              console.log("Title generated successfully:", title);
              sendResponse({
                success: true,
                title: title,
              });
            })
            .catch((error) => {
              console.error("Error in generateTitle:", error);
              sendResponse({
                success: false,
                error: `Error generating title: ${error.message}`,
              });
            });
        })
        .catch((error) => {
          console.error("Error getting geminiApiKey from storage:", error);
          sendResponse({
            success: false,
            error: `Storage error: ${error.message}`,
          });
        });

      return true; // Keep the message channel open for async response
    } catch (error) {
      console.error("Unexpected error in generateTitle handler:", error);
      sendResponse({
        success: false,
        error: `Unexpected error: ${error.message}`,
      });
      return true;
    }
  }
});

// Initialize extension
function init() {
  debugLog("Initializing extension...");

  try {
    // Define the Gemini API functions directly in the background script
    // This avoids any issues with importing from external files

    // Generate a title for the extracted text using Google Gemini API
    generateTitle = async function (extractedText, apiKey) {
      debugLog(
        "generateTitle called with text length:",
        extractedText?.length || 0
      );

      try {
        if (!apiKey) {
          throw new Error(
            "Gemini API key not set. Please set your Gemini API key in the options page."
          );
        }

        if (!extractedText || extractedText.trim() === "") {
          return "Untitled Screenshot";
        }

        debugLog("Generating title using Gemini API...");

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
        debugLog("Gemini API response:", data);

        // Extract the title from the response
        if (
          data.candidates &&
          data.candidates.length > 0 &&
          data.candidates[0].content &&
          data.candidates[0].content.parts &&
          data.candidates[0].content.parts.length > 0
        ) {
          const title = data.candidates[0].content.parts[0].text.trim();
          debugLog("Generated title:", title);

          // Return the title, or a default if empty
          return title || "Untitled Screenshot";
        } else {
          debugLog("Unexpected Gemini API response format:", data);
          return "Untitled Screenshot";
        }
      } catch (error) {
        debugLog("Title generation error:", error);
        throw error; // Re-throw to allow caller to handle
      }
    };

    // Test the Gemini API connection
    testGeminiConnection = async function (apiKey) {
      debugLog(
        "testGeminiConnection called with API key:",
        apiKey ? "API key set (not shown)" : "No API key"
      );

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
            error: `API Error: ${
              errorData.error?.message || response.statusText
            }`,
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
        debugLog("Test connection error:", error);
        return {
          success: false,
          error: `Connection error: ${error.message}`,
        };
      }
    };

    debugLog("Gemini API functions defined successfully");
  } catch (error) {
    debugLog("Error defining Gemini API functions:", error);
  }

  // Load settings from storage
  browser.storage.local
    .get(["apiKey", "geminiApiKey", "autoGenerateTitles"])
    .then((result) => {
      mistralApiKey = result.apiKey || "";
      geminiApiKey = result.geminiApiKey || "";
      autoGenerateTitles = result.autoGenerateTitles || false;

      debugLog("Extension initialized with settings:", {
        mistralApiKeySet: !!mistralApiKey,
        geminiApiKeySet: !!geminiApiKey,
        autoGenerateTitles: autoGenerateTitles,
      });
    })
    .catch((error) => {
      debugLog("Error loading settings:", error);
    });
}

init();

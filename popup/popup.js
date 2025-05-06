// Popup script for Screenshot OCR extension

// Current OCR result data
let currentOcrResult = null;

// DOM elements
const captureBtn = document.getElementById("capture-btn");
const optionsBtn = document.getElementById("options-btn");
const saveBtn = document.getElementById("save-btn");
const copyBtn = document.getElementById("copy-btn");
const discardBtn = document.getElementById("discard-btn");
const statusContainer = document.getElementById("status-container");
const statusText = document.getElementById("status-text");
const resultContainer = document.getElementById("result-container");
const textPreview = document.getElementById("text-preview");
const errorContainer = document.getElementById("error-container");
const errorText = document.getElementById("error-text");
const errorDismissBtn = document.getElementById("error-dismiss-btn");
const apiKeyLink = document.getElementById("api-key-link");
const apiKeyModal = document.getElementById("api-key-modal");
const apiKeyInput = document.getElementById("api-key-input");
const testApiKeyBtn = document.getElementById("test-api-key-btn");
const saveApiKeyBtn = document.getElementById("save-api-key-btn");
const cancelApiKeyBtn = document.getElementById("cancel-api-key-btn");
const testResult = document.getElementById("test-result");
const testMessage = document.getElementById("test-message");
const debugPanel = document.getElementById("debug-panel");
const debugContent = document.getElementById("debug-content");
const closeDebugBtn = document.getElementById("close-debug-btn");

// Event listeners
captureBtn.addEventListener("click", startScreenshotCapture);
optionsBtn.addEventListener("click", openOptionsPage);
saveBtn.addEventListener("click", saveOcrResult);
copyBtn.addEventListener("click", copyToClipboard);
discardBtn.addEventListener("click", discardResult);
errorDismissBtn.addEventListener("click", dismissError);
apiKeyLink.addEventListener("click", showApiKeyModal);
testApiKeyBtn.addEventListener("click", testApiKey);
saveApiKeyBtn.addEventListener("click", saveApiKey);
cancelApiKeyBtn.addEventListener("click", hideApiKeyModal);
closeDebugBtn.addEventListener("click", hideDebugPanel);

// Add debug shortcut (Shift+D)
document.addEventListener("keydown", (e) => {
  if (e.key === "D" && e.shiftKey) {
    showDebugPanel();
  }
});

// Check if API key is set on popup open
checkApiKey();

// Function to check if API key is set
function checkApiKey() {
  browser.runtime.sendMessage({ action: "getApiKey" }).then((response) => {
    if (!response.apiKey) {
      showError(
        "Mistral AI API key is not set. Please set it to use OCR functionality."
      );
    }
  });
}

// Function to start screenshot capture
function startScreenshotCapture() {
  // Show status
  showStatus("Preparing to capture screenshot...");

  // Send message to background script to initiate capture
  browser.runtime
    .sendMessage({ action: "captureScreenshot" })
    .catch((error) => {
      showError(`Failed to start screenshot capture: ${error.message}`);
    });

  // Close popup to allow user to select area
  window.close();
}

// Function to open options page
function openOptionsPage() {
  browser.runtime.openOptionsPage();
}

// Function to save OCR result
function saveOcrResult() {
  if (!currentOcrResult) {
    showError("No OCR data to save");
    return;
  }

  showStatus("Saving OCR data...");

  browser.runtime
    .sendMessage({
      action: "saveOCRData",
      ocrData: currentOcrResult,
    })
    .then((response) => {
      if (response.success) {
        showStatus("OCR data saved successfully!");
        setTimeout(() => {
          resetUI();
        }, 1500);
      } else {
        showError(`Failed to save OCR data: ${response.error}`);
      }
    })
    .catch((error) => {
      showError(`Error saving OCR data: ${error.message}`);
    });
}

// Function to copy OCR text to clipboard
function copyToClipboard() {
  if (!currentOcrResult || !currentOcrResult.text) {
    showError("No text to copy");
    return;
  }

  navigator.clipboard
    .writeText(currentOcrResult.text)
    .then(() => {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 1500);
    })
    .catch((error) => {
      showError(`Failed to copy text: ${error.message}`);
    });
}

// Function to discard current result
function discardResult() {
  resetUI();
}

// Function to show status
function showStatus(message) {
  statusText.textContent = message;
  statusContainer.classList.remove("hidden");
  resultContainer.classList.add("hidden");
  errorContainer.classList.add("hidden");
}

// Function to show error
function showError(message) {
  errorText.textContent = message;
  errorContainer.classList.remove("hidden");
  statusContainer.classList.add("hidden");
  resultContainer.classList.add("hidden");
}

// Function to dismiss error
function dismissError() {
  errorContainer.classList.add("hidden");
}

// Function to reset UI
function resetUI() {
  currentOcrResult = null;
  textPreview.textContent = "";
  statusContainer.classList.add("hidden");
  resultContainer.classList.add("hidden");
  errorContainer.classList.add("hidden");
}

// Function to show API key modal
function showApiKeyModal(e) {
  e.preventDefault();

  // Get current API key
  browser.runtime.sendMessage({ action: "getApiKey" }).then((response) => {
    apiKeyInput.value = response.apiKey || "";
    apiKeyModal.classList.remove("hidden");
  });
}

// Function to hide API key modal
function hideApiKeyModal() {
  apiKeyModal.classList.add("hidden");
}

// Function to save API key
function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showError("API key cannot be empty");
    return;
  }

  browser.runtime
    .sendMessage({
      action: "setApiKey",
      apiKey: apiKey,
    })
    .then((response) => {
      if (response.success) {
        hideApiKeyModal();
      } else {
        showError(`Failed to save API key: ${response.error}`);
      }
    })
    .catch((error) => {
      showError(`Error saving API key: ${error.message}`);
    });
}

// Function to test API key
function testApiKey() {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showTestResult(false, "API key cannot be empty");
    return;
  }

  // Show loading state
  testApiKeyBtn.textContent = "Testing...";
  testApiKeyBtn.disabled = true;

  // First save the API key
  browser.runtime
    .sendMessage({
      action: "setApiKey",
      apiKey: apiKey,
    })
    .then(() => {
      // Then test connection
      return browser.runtime.sendMessage({
        action: "testMistralConnection",
      });
    })
    .then((response) => {
      if (response.success) {
        showTestResult(true, response.message);
        logDebug("API Test Success", response);
      } else {
        showTestResult(false, response.error);
        logDebug("API Test Error", response);
      }
    })
    .catch((error) => {
      showTestResult(false, `Error testing API key: ${error.message}`);
      logDebug("API Test Exception", error);
    })
    .finally(() => {
      // Reset button
      testApiKeyBtn.textContent = "Test Connection";
      testApiKeyBtn.disabled = false;
    });
}

// Function to show test result
function showTestResult(success, message) {
  testResult.classList.remove("hidden", "success", "error");
  testResult.classList.add(success ? "success" : "error");
  testMessage.textContent = message;
}

// Function to show debug panel
function showDebugPanel() {
  debugPanel.classList.remove("hidden");
}

// Function to hide debug panel
function hideDebugPanel() {
  debugPanel.classList.add("hidden");
}

// Function to log debug information
function logDebug(title, data) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${title}:\n${JSON.stringify(
    data,
    null,
    2
  )}\n\n`;
  debugContent.textContent = entry + debugContent.textContent;
}

// Listen for messages from background script or content scripts
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "ocrResult") {
    // Display OCR result
    currentOcrResult = message.data;
    textPreview.textContent = message.data.text;
    statusContainer.classList.add("hidden");
    resultContainer.classList.remove("hidden");
  }

  if (message.action === "ocrError") {
    showError(`OCR processing error: ${message.error}`);
  }
});

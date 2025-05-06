// Options page script for Screenshot OCR extension

// Debug logging utility
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) {
    console.log("[OPTIONS]", ...args);
  }
}

// Log all unhandled errors
window.addEventListener("error", function (event) {
  debugLog("UNHANDLED ERROR:", event.error);
});

// DOM elements
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const itemsList = document.getElementById("items-list");
const itemCount = document.getElementById("item-count");
const emptyState = document.getElementById("empty-state");
const itemDetails = document.getElementById("item-details");
const itemTitle = document.getElementById("item-title");
const itemDate = document.getElementById("item-date");
const itemDimensions = document.getElementById("item-dimensions");
const itemImage = document.getElementById("item-image");
const itemText = document.getElementById("item-text");
const generateTitleBtn = document.getElementById("generate-title-btn");
const editBtn = document.getElementById("edit-btn");
const deleteBtn = document.getElementById("delete-btn");
const copyTextBtn = document.getElementById("copy-text-btn");
const editForm = document.getElementById("edit-form");
const editTitle = document.getElementById("edit-title");
const editText = document.getElementById("edit-text");
const saveEditBtn = document.getElementById("save-edit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const exportBtn = document.getElementById("export-btn");
const settingsBtn = document.getElementById("settings-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const settingsModal = document.getElementById("settings-modal");
const apiKeyInput = document.getElementById("api-key-input");
const geminiApiKeyInput = document.getElementById("gemini-api-key-input");
const autoTitleToggle = document.getElementById("auto-title-toggle");
const testMistralBtn = document.getElementById("test-mistral-btn");
const testGeminiBtn = document.getElementById("test-gemini-btn");
const mistralTestResult = document.getElementById("mistral-test-result");
const mistralTestMessage = document.getElementById("mistral-test-message");
const geminiTestResult = document.getElementById("gemini-test-result");
const geminiTestMessage = document.getElementById("gemini-test-message");
const clearDataBtn = document.getElementById("clear-data-btn");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const confirmModal = document.getElementById("confirm-modal");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmYesBtn = document.getElementById("confirm-yes-btn");
const confirmNoBtn = document.getElementById("confirm-no-btn");

// State variables
let ocrData = [];
let filteredData = [];
let selectedItemId = null;
let currentAction = null;
let darkThemeEnabled = false;

// Load data on page load
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  loadThemePreference();
});

// Event listeners
searchInput.addEventListener("input", filterData);
sortSelect.addEventListener("change", sortData);
generateTitleBtn.addEventListener("click", generateTitleForSelectedItem);
editBtn.addEventListener("click", startEdit);
deleteBtn.addEventListener("click", confirmDelete);
copyTextBtn.addEventListener("click", copyText);
saveEditBtn.addEventListener("click", saveEdit);
cancelEditBtn.addEventListener("click", cancelEdit);
exportBtn.addEventListener("click", exportData);
settingsBtn.addEventListener("click", openSettings);
themeToggleBtn.addEventListener("click", toggleTheme);
clearDataBtn.addEventListener("click", confirmClearData);
saveSettingsBtn.addEventListener("click", saveSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
confirmYesBtn.addEventListener("click", handleConfirmation);
confirmNoBtn.addEventListener("click", closeConfirmModal);
testMistralBtn.addEventListener("click", testMistralConnection);
testGeminiBtn.addEventListener("click", testGeminiConnection);

// Function to load data from storage
function loadData() {
  browser.storage.local
    .get(["ocrData", "apiKey", "geminiApiKey", "autoGenerateTitles"])
    .then((result) => {
      // Load OCR data
      ocrData = result.ocrData || [];

      // Update item count
      updateItemCount();

      // Filter and sort data
      filterAndSortData();

      // Load API keys and settings
      apiKeyInput.value = result.apiKey || "";
      geminiApiKeyInput.value = result.geminiApiKey || "";
      autoTitleToggle.checked = result.autoGenerateTitles || false;
    })
    .catch((error) => {
      console.error("Error loading data:", error);
    });
}

// Function to update item count
function updateItemCount() {
  itemCount.textContent = `${ocrData.length} item${
    ocrData.length !== 1 ? "s" : ""
  }`;
}

// Function to filter and sort data
function filterAndSortData() {
  // Filter data
  const searchTerm = searchInput.value.toLowerCase();
  filteredData = ocrData.filter((item) => {
    const title =
      item.title || `OCR ${new Date(item.timestamp).toLocaleDateString()}`;
    const text = item.text || "";
    return (
      title.toLowerCase().includes(searchTerm) ||
      text.toLowerCase().includes(searchTerm)
    );
  });

  // Sort data
  sortData();
}

// Function to filter data
function filterData() {
  filterAndSortData();
}

// Function to sort data
function sortData() {
  const sortOption = sortSelect.value;

  switch (sortOption) {
    case "newest":
      filteredData.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      break;
    case "oldest":
      filteredData.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      break;
    case "az":
      filteredData.sort((a, b) => {
        const titleA =
          a.title || `OCR ${new Date(a.timestamp).toLocaleDateString()}`;
        const titleB =
          b.title || `OCR ${new Date(b.timestamp).toLocaleDateString()}`;
        return titleA.localeCompare(titleB);
      });
      break;
    case "za":
      filteredData.sort((a, b) => {
        const titleA =
          a.title || `OCR ${new Date(a.timestamp).toLocaleDateString()}`;
        const titleB =
          b.title || `OCR ${new Date(b.timestamp).toLocaleDateString()}`;
        return titleB.localeCompare(titleA);
      });
      break;
  }

  // Render items
  renderItems();
}

// Function to render items
function renderItems() {
  // Clear items list
  itemsList.innerHTML = "";

  // Check if there are items
  if (filteredData.length === 0) {
    // Show empty state
    itemsList.innerHTML = `
      <div class="empty-state">
        <p>No OCR data found</p>
        <p>Capture a screenshot to get started</p>
      </div>
    `;

    // Hide item details
    emptyState.classList.remove("hidden");
    itemDetails.classList.add("hidden");
    editForm.classList.add("hidden");

    return;
  }

  // Render each item
  filteredData.forEach((item) => {
    const itemCard = document.createElement("div");
    itemCard.className = `item-card ${
      item.id === selectedItemId ? "selected" : ""
    }`;
    itemCard.dataset.id = item.id;

    const title =
      item.title || `OCR ${new Date(item.timestamp).toLocaleDateString()}`;
    const preview = item.text
      ? item.text.length > 50
        ? item.text.substring(0, 50) + "..."
        : item.text
      : "No text extracted";
    const date = new Date(item.timestamp).toLocaleString();

    itemCard.innerHTML = `
      <div class="item-card-title">${title}</div>
      <div class="item-card-preview">${preview}</div>
      <div class="item-card-date">${date}</div>
    `;

    // Add click event
    itemCard.addEventListener("click", () => {
      selectItem(item.id);
    });

    itemsList.appendChild(itemCard);
  });

  // If an item was selected, show its details
  if (selectedItemId) {
    const item = filteredData.find((item) => item.id === selectedItemId);
    if (item) {
      showItemDetails(item);
    } else {
      // If selected item is not in filtered data, clear selection
      selectedItemId = null;
      emptyState.classList.remove("hidden");
      itemDetails.classList.add("hidden");
      editForm.classList.add("hidden");
    }
  } else {
    // No item selected
    emptyState.classList.remove("hidden");
    itemDetails.classList.add("hidden");
    editForm.classList.add("hidden");
  }
}

// Function to select an item
function selectItem(id) {
  selectedItemId = id;

  // Find the item
  const item = filteredData.find((item) => item.id === id);

  if (item) {
    // Show item details
    showItemDetails(item);
  }

  // Update UI
  renderItems();
}

// Function to show item details
function showItemDetails(item) {
  // Hide empty state and edit form
  emptyState.classList.add("hidden");
  editForm.classList.add("hidden");

  // Show item details
  itemDetails.classList.remove("hidden");

  // Set item details
  itemTitle.textContent =
    item.title || `OCR ${new Date(item.timestamp).toLocaleDateString()}`;
  itemDate.textContent = `Date: ${new Date(item.timestamp).toLocaleString()}`;

  // Set dimensions if available
  if (item.metadata && item.metadata.width && item.metadata.height) {
    itemDimensions.textContent = `Dimensions: ${item.metadata.width} × ${item.metadata.height}`;
  } else {
    itemDimensions.textContent = "Dimensions: Unknown";
  }

  // Set image
  if (item.imageData) {
    itemImage.src = `data:image/jpeg;base64,${item.imageData}`;
  } else {
    itemImage.src = "";
  }

  // Set text
  itemText.textContent = item.text || "No text extracted";

  // Check if Generate Title button should be enabled
  browser.storage.local.get("geminiApiKey").then((result) => {
    const geminiApiKey = result.geminiApiKey || "";

    // Disable the button if no Gemini API key is set or if there's no text
    if (!geminiApiKey || !item.text || item.text.trim() === "") {
      generateTitleBtn.disabled = true;

      // Set tooltip based on the reason
      if (!geminiApiKey) {
        generateTitleBtn.title = "Gemini API key not set. Set it in Settings.";
      } else {
        generateTitleBtn.title = "No text available to generate a title from.";
      }
    } else {
      generateTitleBtn.disabled = false;
      generateTitleBtn.title = "Generate title using Gemini AI";
    }
  });
}

// Function to start editing an item
function startEdit() {
  // Find the item
  const item = filteredData.find((item) => item.id === selectedItemId);

  if (!item) return;

  // Hide item details
  itemDetails.classList.add("hidden");

  // Show edit form
  editForm.classList.remove("hidden");

  // Set form values
  editTitle.value =
    item.title || `OCR ${new Date(item.timestamp).toLocaleDateString()}`;
  editText.value = item.text || "";
}

// Function to save edits
function saveEdit() {
  // Find the item
  const itemIndex = ocrData.findIndex((item) => item.id === selectedItemId);

  if (itemIndex === -1) return;

  // Update item
  ocrData[itemIndex].title = editTitle.value;
  ocrData[itemIndex].text = editText.value;

  // Save to storage
  browser.storage.local
    .set({ ocrData })
    .then(() => {
      // Filter and sort data
      filterAndSortData();

      // Show item details
      showItemDetails(ocrData[itemIndex]);

      // Hide edit form
      editForm.classList.add("hidden");

      // Show item details
      itemDetails.classList.remove("hidden");
    })
    .catch((error) => {
      console.error("Error saving data:", error);
    });
}

// Function to cancel editing
function cancelEdit() {
  // Hide edit form
  editForm.classList.add("hidden");

  // Show item details
  itemDetails.classList.remove("hidden");
}

// Function to confirm delete
function confirmDelete() {
  // Find the item
  const item = filteredData.find((item) => item.id === selectedItemId);

  if (!item) return;

  // Set confirmation details
  confirmTitle.textContent = "Delete Item";
  confirmMessage.textContent = `Are you sure you want to delete "${
    item.title || "this item"
  }"?`;
  currentAction = "delete";

  // Show confirmation modal
  confirmModal.classList.remove("hidden");
}

// Function to delete an item
function deleteItem() {
  // Find the item index
  const itemIndex = ocrData.findIndex((item) => item.id === selectedItemId);

  if (itemIndex === -1) return;

  // Remove item
  ocrData.splice(itemIndex, 1);

  // Save to storage
  browser.storage.local
    .set({ ocrData })
    .then(() => {
      // Clear selection
      selectedItemId = null;

      // Update item count
      updateItemCount();

      // Filter and sort data
      filterAndSortData();
    })
    .catch((error) => {
      console.error("Error saving data:", error);
    });
}

// Function to copy text
function copyText() {
  // Find the item
  const item = filteredData.find((item) => item.id === selectedItemId);

  if (!item || !item.text) return;

  // Copy text to clipboard
  navigator.clipboard
    .writeText(item.text)
    .then(() => {
      // Show feedback
      const originalText = copyTextBtn.textContent;
      copyTextBtn.textContent = "Copied!";
      setTimeout(() => {
        copyTextBtn.textContent = originalText;
      }, 1500);
    })
    .catch((error) => {
      console.error("Error copying text:", error);
    });
}

// Function to export data
function exportData() {
  // Create export data
  const exportData = JSON.stringify(ocrData, null, 2);

  // Create blob
  const blob = new Blob([exportData], { type: "application/json" });

  // Create URL
  const url = URL.createObjectURL(blob);

  // Create download link
  const a = document.createElement("a");
  a.href = url;
  a.download = `screenshot-ocr-export-${
    new Date().toISOString().split("T")[0]
  }.json`;

  // Trigger download
  document.body.appendChild(a);
  a.click();

  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Function to open settings
function openSettings() {
  // Show settings modal
  settingsModal.classList.remove("hidden");
}

// Function to save settings
function saveSettings() {
  // Save API keys and settings
  browser.storage.local
    .set({
      apiKey: apiKeyInput.value,
      geminiApiKey: geminiApiKeyInput.value,
      autoGenerateTitles: autoTitleToggle.checked,
    })
    .then(() => {
      // Close settings modal
      closeSettings();
    })
    .catch((error) => {
      console.error("Error saving settings:", error);
    });
}

// Function to close settings
function closeSettings() {
  // Hide settings modal
  settingsModal.classList.add("hidden");
}

// Function to confirm clear data
function confirmClearData() {
  // Set confirmation details
  confirmTitle.textContent = "Clear All Data";
  confirmMessage.textContent =
    "Are you sure you want to delete all OCR data? This action cannot be undone.";
  currentAction = "clearData";

  // Close settings modal
  closeSettings();

  // Show confirmation modal
  confirmModal.classList.remove("hidden");
}

// Function to clear all data
function clearAllData() {
  // Clear OCR data
  ocrData = [];

  // Save to storage
  browser.storage.local
    .set({ ocrData })
    .then(() => {
      // Clear selection
      selectedItemId = null;

      // Update item count
      updateItemCount();

      // Filter and sort data
      filterAndSortData();
    })
    .catch((error) => {
      console.error("Error clearing data:", error);
    });
}

// Function to handle confirmation
function handleConfirmation() {
  // Close confirmation modal
  closeConfirmModal();

  // Handle action
  switch (currentAction) {
    case "delete":
      deleteItem();
      break;
    case "clearData":
      clearAllData();
      break;
  }

  // Reset current action
  currentAction = null;
}

// Function to close confirmation modal
function closeConfirmModal() {
  // Hide confirmation modal
  confirmModal.classList.add("hidden");
}

// Listen for storage changes
browser.storage.onChanged.addListener((changes) => {
  if (changes.ocrData) {
    // Update OCR data
    ocrData = changes.ocrData.newValue || [];

    // Update item count
    updateItemCount();

    // Filter and sort data
    filterAndSortData();
  }

  if (changes.darkTheme) {
    // Update theme
    darkThemeEnabled = changes.darkTheme.newValue;
    applyTheme();
  }
});

// Function to load theme preference
function loadThemePreference() {
  browser.storage.local
    .get("darkTheme")
    .then((result) => {
      darkThemeEnabled = result.darkTheme || false;
      applyTheme();
    })
    .catch((error) => {
      console.error("Error loading theme preference:", error);
    });
}

// Function to toggle theme
function toggleTheme() {
  darkThemeEnabled = !darkThemeEnabled;

  // Save theme preference
  browser.storage.local
    .set({ darkTheme: darkThemeEnabled })
    .then(() => {
      applyTheme();
    })
    .catch((error) => {
      console.error("Error saving theme preference:", error);
    });
}

// Function to apply theme
function applyTheme() {
  if (darkThemeEnabled) {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }
}

// Function to test Mistral API connection
function testMistralConnection() {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showTestResult(
      mistralTestResult,
      mistralTestMessage,
      false,
      "API key cannot be empty"
    );
    return;
  }

  // Show loading state
  testMistralBtn.textContent = "Testing...";
  testMistralBtn.disabled = true;

  // Test connection
  browser.runtime
    .sendMessage({
      action: "testMistralConnection",
    })
    .then((response) => {
      if (response.success) {
        showTestResult(
          mistralTestResult,
          mistralTestMessage,
          true,
          response.message
        );
      } else {
        showTestResult(
          mistralTestResult,
          mistralTestMessage,
          false,
          response.error
        );
      }
    })
    .catch((error) => {
      showTestResult(
        mistralTestResult,
        mistralTestMessage,
        false,
        `Error testing API key: ${error.message}`
      );
    })
    .finally(() => {
      // Reset button
      testMistralBtn.textContent = "Test Connection";
      testMistralBtn.disabled = false;
    });
}

// Function to test Gemini API connection
function testGeminiConnection() {
  const apiKey = geminiApiKeyInput.value.trim();

  if (!apiKey) {
    showTestResult(
      geminiTestResult,
      geminiTestMessage,
      false,
      "API key cannot be empty"
    );
    return;
  }

  // Show loading state
  testGeminiBtn.textContent = "Testing...";
  testGeminiBtn.disabled = true;

  // Save API key first
  browser.storage.local
    .set({ geminiApiKey: apiKey })
    .then(() => {
      // Then test connection
      return browser.runtime.sendMessage({
        action: "testGeminiConnection",
      });
    })
    .then((response) => {
      if (response.success) {
        showTestResult(
          geminiTestResult,
          geminiTestMessage,
          true,
          response.message
        );
      } else {
        showTestResult(
          geminiTestResult,
          geminiTestMessage,
          false,
          response.error
        );
      }
    })
    .catch((error) => {
      showTestResult(
        geminiTestResult,
        geminiTestMessage,
        false,
        `Error testing API key: ${error.message}`
      );
    })
    .finally(() => {
      // Reset button
      testGeminiBtn.textContent = "Test Connection";
      testGeminiBtn.disabled = false;
    });
}

// Function to show test result
function showTestResult(resultElement, messageElement, success, message) {
  resultElement.classList.remove("hidden", "success", "error");
  resultElement.classList.add(success ? "success" : "error");
  messageElement.textContent = message;
}

// Function to generate title for the selected item
function generateTitleForSelectedItem() {
  debugLog("generateTitleForSelectedItem called");

  // Check if an item is selected
  if (!selectedItemId) {
    alert("No item selected");
    return;
  }

  // Find the item
  const item = ocrData.find((item) => item.id === selectedItemId);
  if (!item) {
    alert("Selected item not found");
    return;
  }

  // Check if the item has text
  if (!item.text || item.text.trim() === "") {
    alert("The selected item has no text to generate a title from");
    return;
  }

  // Show loading state
  const originalText = generateTitleBtn.textContent;
  generateTitleBtn.textContent = "Generating...";
  generateTitleBtn.disabled = true;

  // Check if Gemini API key is set
  browser.storage.local
    .get("geminiApiKey")
    .then((result) => {
      const geminiApiKey = result.geminiApiKey || "";

      if (!geminiApiKey) {
        alert("Gemini API key is not set. Please set it in the settings.");
        generateTitleBtn.textContent = originalText;
        generateTitleBtn.disabled = false;
        return;
      }

      debugLog("Gemini API key found, text length:", item.text.length);

      // First approach: Try using runtime.sendMessage
      const generateTitleWithMessage = () => {
        debugLog("Attempting to generate title using runtime.sendMessage");

        return new Promise((resolve, reject) => {
          try {
            browser.runtime
              .sendMessage({
                action: "generateTitle",
                text: item.text,
              })
              .then((response) => {
                debugLog("Received response from generateTitle:", response);
                resolve(response);
              })
              .catch((error) => {
                debugLog("Error in sendMessage:", error);
                reject(error);
              });
          } catch (error) {
            debugLog("Exception in sendMessage:", error);
            reject(error);
          }
        });
      };

      // Second approach: Direct API call as fallback
      const generateTitleDirectly = async () => {
        debugLog("Attempting to generate title directly with API call");

        try {
          // Prepare the request to Gemini API
          const requestBody = {
            model: "gemini-2.0-flash",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Generate a concise, descriptive title (maximum 50 characters) for the following extracted text from a screenshot. Only respond with the title, nothing else:

${item.text.substring(0, 1500)}`, // Limit text length to avoid token limits
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
                "x-goog-api-key": geminiApiKey,
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
          debugLog("Direct Gemini API response:", data);

          // Extract the title from the response
          if (
            data.candidates &&
            data.candidates.length > 0 &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts.length > 0
          ) {
            const title = data.candidates[0].content.parts[0].text.trim();
            debugLog("Generated title directly:", title);

            // Return success response
            return {
              success: true,
              title: title || "Untitled Screenshot",
            };
          } else {
            debugLog("Unexpected Gemini API response format:", data);
            throw new Error("Unexpected API response format");
          }
        } catch (error) {
          debugLog("Direct title generation error:", error);
          throw error;
        }
      };

      // Try the first approach, fall back to the second if it fails
      generateTitleWithMessage()
        .catch((error) => {
          debugLog("First approach failed, trying direct API call:", error);
          return generateTitleDirectly();
        })
        .then((response) => {
          if (!response || !response.success) {
            throw new Error(response?.error || "Failed to generate title");
          }

          // Update the item with the new title
          const itemIndex = ocrData.findIndex((i) => i.id === selectedItemId);
          if (itemIndex !== -1) {
            // Update the title
            ocrData[itemIndex].title = response.title;

            // Save to storage
            return browser.storage.local.set({ ocrData });
          }
        })
        .then(() => {
          // Refresh the UI
          filterAndSortData();

          // Show the updated item details
          const updatedItem = ocrData.find((i) => i.id === selectedItemId);
          if (updatedItem) {
            showItemDetails(updatedItem);
          }

          // Log success but don't show popup
          debugLog("Title generated successfully");
        })
        .catch((error) => {
          debugLog("Error generating title:", error);
          // Only show alert for actual errors, not for cancellations
          if (error.message !== "Failed to generate title") {
            alert(`Error generating title: ${error.message}`);
          }
        })
        .finally(() => {
          // Reset button
          generateTitleBtn.textContent = originalText;
          generateTitleBtn.disabled = false;
        });
    })
    .catch((error) => {
      debugLog("Error getting Gemini API key:", error);
      alert(`Error: ${error.message}`);
      generateTitleBtn.textContent = originalText;
      generateTitleBtn.disabled = false;
    });
}

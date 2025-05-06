// Screenshot content script for Screenshot OCR extension

// Variables to track selection
let isSelecting = false;
let startX = 0;
let startY = 0;
let endX = 0;
let endY = 0;

// Elements
let overlay = null;
let selectionBox = null;
let instructions = null;
let confirmDialog = null;
let resultDialog = null;
let capturedImageData = null;

// Flag to prevent multiple captures running simultaneously
let isCapturing = false;

// Listen for messages from background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "startCapture") {
    // Prevent multiple captures from running at the same time
    if (isCapturing) {
      console.log("Screenshot capture already in progress, ignoring request");
      return;
    }

    // Set capturing flag
    isCapturing = true;

    // Start capture
    startScreenshotMode();
  }
});

// Function to start screenshot selection mode
function startScreenshotMode() {
  // Create overlay
  createOverlay();

  // Add event listeners
  document.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("keydown", handleKeyDown);
}

// Function to create overlay
function createOverlay() {
  // Create overlay element
  overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
  overlay.style.zIndex = "2147483647"; // Max z-index
  overlay.style.cursor = "crosshair";

  // Create selection box
  selectionBox = document.createElement("div");
  selectionBox.style.position = "fixed";
  selectionBox.style.border = "2px dashed #ffffff";
  selectionBox.style.backgroundColor = "rgba(0, 96, 223, 0.2)";
  selectionBox.style.display = "none";
  selectionBox.style.zIndex = "2147483647";

  // Create instructions
  instructions = document.createElement("div");
  instructions.style.position = "fixed";
  instructions.style.top = "20px";
  instructions.style.left = "50%";
  instructions.style.transform = "translateX(-50%)";
  instructions.style.padding = "10px 20px";
  instructions.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  instructions.style.color = "white";
  instructions.style.borderRadius = "4px";
  instructions.style.fontFamily = "Arial, sans-serif";
  instructions.style.fontSize = "14px";
  instructions.style.zIndex = "2147483647";
  instructions.textContent =
    "Click and drag to select an area for OCR. Press Esc to cancel.";

  // Append elements to body
  document.body.appendChild(overlay);
  document.body.appendChild(selectionBox);
  document.body.appendChild(instructions);
}

// Function to handle mouse down
function handleMouseDown(e) {
  // Start selection
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;

  // Update selection box
  selectionBox.style.display = "block";
  selectionBox.style.left = startX + "px";
  selectionBox.style.top = startY + "px";
  selectionBox.style.width = "0";
  selectionBox.style.height = "0";
}

// Function to handle mouse move
function handleMouseMove(e) {
  if (!isSelecting) return;

  // Update end coordinates
  endX = e.clientX;
  endY = e.clientY;

  // Calculate dimensions
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  // Calculate position
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);

  // Update selection box
  selectionBox.style.left = left + "px";
  selectionBox.style.top = top + "px";
  selectionBox.style.width = width + "px";
  selectionBox.style.height = height + "px";
}

// Function to handle mouse up
function handleMouseUp() {
  if (!isSelecting) return;

  // End selection
  isSelecting = false;

  // Capture the selected area
  captureSelectedArea();
}

// Function to handle key down
function handleKeyDown(e) {
  // Cancel on Escape key
  if (e.key === "Escape") {
    cleanup();
  }
}

// Function to capture selected area
function captureSelectedArea() {
  // Calculate dimensions
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  // Check if selection is too small
  if (width < 10 || height < 10) {
    cleanup();
    return;
  }

  // Calculate position
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);

  // Hide overlay and instructions for clean screenshot
  overlay.style.display = "none";
  instructions.style.display = "none";

  // Use browser's screenshot API to capture the visible tab
  browser.runtime
    .sendMessage({ action: "captureVisibleTab" })
    .then((screenshotUrl) => {
      // Create an image from the screenshot
      const img = new Image();
      img.onload = function () {
        // Create canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set canvas dimensions to selection size
        canvas.width = width;
        canvas.height = height;

        // Calculate device pixel ratio for high-DPI displays
        const devicePixelRatio = window.devicePixelRatio || 1;

        // Draw the selected portion of the screenshot to the canvas
        ctx.drawImage(
          img,
          left * devicePixelRatio,
          top * devicePixelRatio,
          width * devicePixelRatio,
          height * devicePixelRatio,
          0,
          0,
          width,
          height
        );

        // Convert canvas to base64 image data
        const imageData = canvas.toDataURL("image/jpeg", 0.95).split(",")[1];

        // Store the image data
        capturedImageData = imageData;

        // Show confirmation dialog
        showConfirmDialog(left, top, width, height, imageData);
      };

      img.src = screenshotUrl;
    })
    .catch((error) => {
      console.error("Screenshot capture error:", error);

      // Show error message
      showErrorMessage("Failed to capture screenshot: " + error.message);

      // Clean up
      setTimeout(cleanup, 3000);
    });
}

// Function to show confirmation dialog
function showConfirmDialog(left, top, width, height, imageData) {
  // Create confirmation dialog
  confirmDialog = document.createElement("div");
  confirmDialog.style.position = "fixed";
  confirmDialog.style.left = left + "px";
  confirmDialog.style.top = top + "px";
  confirmDialog.style.width = width + "px";
  confirmDialog.style.padding = "15px";
  confirmDialog.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  confirmDialog.style.color = "white";
  confirmDialog.style.borderRadius = "4px";
  confirmDialog.style.fontFamily = "Arial, sans-serif";
  confirmDialog.style.fontSize = "14px";
  confirmDialog.style.zIndex = "2147483647";
  confirmDialog.style.display = "flex";
  confirmDialog.style.flexDirection = "column";
  confirmDialog.style.alignItems = "center";
  confirmDialog.style.gap = "10px";

  // Create image preview
  const imgPreview = document.createElement("img");
  imgPreview.src = `data:image/jpeg;base64,${imageData}`;
  imgPreview.style.maxWidth = "100%";
  imgPreview.style.maxHeight = "200px";
  imgPreview.style.border = "1px solid white";

  // Create message
  const message = document.createElement("div");
  message.textContent =
    "Send this screenshot to Mistral OCR for text extraction?";

  // Create buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.style.display = "flex";
  buttonsContainer.style.gap = "10px";
  buttonsContainer.style.marginTop = "10px";

  // Create process button
  const processBtn = document.createElement("button");
  processBtn.textContent = "Extract Text";
  processBtn.style.padding = "8px 16px";
  processBtn.style.backgroundColor = "#0060df";
  processBtn.style.color = "white";
  processBtn.style.border = "none";
  processBtn.style.borderRadius = "4px";
  processBtn.style.cursor = "pointer";
  processBtn.addEventListener("click", () => {
    console.log("Process button clicked");

    // Disable the button to prevent multiple clicks
    processBtn.disabled = true;
    cancelBtn.disabled = true;

    // Remove confirmation dialog completely instead of just hiding it
    if (confirmDialog && confirmDialog.parentNode) {
      try {
        confirmDialog.parentNode.removeChild(confirmDialog);
        confirmDialog = null;
        console.log("Confirmation dialog removed");
      } catch (e) {
        console.error("Error removing confirmation dialog:", e);
      }
    }

    // Show loading message
    showLoadingMessage(left, top, width, height);

    // Process OCR
    processOCR(imageData, left, top, width, height);
  });

  // Create cancel button
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.padding = "8px 16px";
  cancelBtn.style.backgroundColor = "#e0e0e6";
  cancelBtn.style.color = "#0c0c0d";
  cancelBtn.style.border = "none";
  cancelBtn.style.borderRadius = "4px";
  cancelBtn.style.cursor = "pointer";
  cancelBtn.addEventListener("click", () => {
    console.log("Cancel button clicked");
    // Make sure we call cleanup to remove all elements and reset flags
    cleanup();
  });

  // Append elements
  buttonsContainer.appendChild(processBtn);
  buttonsContainer.appendChild(cancelBtn);
  confirmDialog.appendChild(imgPreview);
  confirmDialog.appendChild(message);
  confirmDialog.appendChild(buttonsContainer);
  document.body.appendChild(confirmDialog);
}

// Function to show loading message
function showLoadingMessage(left, top, width, height) {
  // Create loading message
  const loadingMessage = document.createElement("div");
  loadingMessage.style.position = "fixed";
  loadingMessage.style.left = left + "px";
  loadingMessage.style.top = top + "px";
  loadingMessage.style.width = width + "px";
  loadingMessage.style.padding = "15px";
  loadingMessage.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  loadingMessage.style.color = "white";
  loadingMessage.style.borderRadius = "4px";
  loadingMessage.style.fontFamily = "Arial, sans-serif";
  loadingMessage.style.fontSize = "14px";
  loadingMessage.style.zIndex = "2147483647";
  loadingMessage.style.display = "flex";
  loadingMessage.style.flexDirection = "column";
  loadingMessage.style.alignItems = "center";
  loadingMessage.style.justifyContent = "center";
  loadingMessage.style.gap = "10px";

  // Create spinner
  const spinner = document.createElement("div");
  spinner.style.width = "24px";
  spinner.style.height = "24px";
  spinner.style.border = "3px solid #e0e0e6";
  spinner.style.borderTop = "3px solid #0060df";
  spinner.style.borderRadius = "50%";
  spinner.style.animation = "spin 1s linear infinite";

  // Add keyframes for spinner animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // Create message
  const message = document.createElement("div");
  message.textContent = "Processing OCR...";

  // Append elements
  loadingMessage.appendChild(spinner);
  loadingMessage.appendChild(message);
  document.body.appendChild(loadingMessage);

  // Store loading message
  resultDialog = loadingMessage;
}

// Function to show error message
function showErrorMessage(errorText) {
  // Create error message
  const errorMessage = document.createElement("div");
  errorMessage.style.position = "fixed";
  errorMessage.style.top = "20px";
  errorMessage.style.left = "50%";
  errorMessage.style.transform = "translateX(-50%)";
  errorMessage.style.padding = "15px";
  errorMessage.style.backgroundColor = "rgba(215, 0, 34, 0.9)";
  errorMessage.style.color = "white";
  errorMessage.style.borderRadius = "4px";
  errorMessage.style.fontFamily = "Arial, sans-serif";
  errorMessage.style.fontSize = "14px";
  errorMessage.style.zIndex = "2147483647";
  errorMessage.textContent = errorText;

  // Append to body
  document.body.appendChild(errorMessage);

  // Store error message
  resultDialog = errorMessage;
}

// Function to process OCR
function processOCR(imageData, left, top, width, height) {
  // Send image data to background script for OCR processing
  browser.runtime
    .sendMessage({
      action: "processOCR",
      imageData: imageData,
    })
    .then((response) => {
      if (response.success) {
        // Show OCR result
        showOCRResult(response.data, left, top, width, height, imageData);

        // Send OCR result to popup for storage
        browser.runtime.sendMessage({
          action: "ocrResult",
          data: {
            text: response.data.text || "No text extracted",
            imageData: imageData,
            metadata: {
              width,
              height,
              timestamp: new Date().toISOString(),
            },
          },
        });
      } else {
        // Show error message
        showErrorMessage("OCR processing error: " + response.error);

        // Clean up after delay
        setTimeout(cleanup, 3000);
      }
    })
    .catch((error) => {
      // Show error message
      showErrorMessage("OCR processing error: " + error.message);

      // Clean up after delay
      setTimeout(cleanup, 3000);
    });
}

// Function to show OCR result
function showOCRResult(ocrData, left, top, width, height, imageData) {
  // Remove loading message if exists
  if (resultDialog) {
    document.body.removeChild(resultDialog);
  }

  // Create result dialog
  resultDialog = document.createElement("div");
  resultDialog.style.position = "fixed";
  resultDialog.style.left = left + "px";
  resultDialog.style.top = top + "px";
  resultDialog.style.width = width + "px";
  resultDialog.style.maxHeight = "80vh";
  resultDialog.style.overflowY = "auto";
  resultDialog.style.padding = "15px";
  resultDialog.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  resultDialog.style.color = "white";
  resultDialog.style.borderRadius = "4px";
  resultDialog.style.fontFamily = "Arial, sans-serif";
  resultDialog.style.fontSize = "14px";
  resultDialog.style.zIndex = "2147483647";
  resultDialog.style.display = "flex";
  resultDialog.style.flexDirection = "column";
  resultDialog.style.gap = "10px";

  // Create title
  const title = document.createElement("h3");
  title.textContent = "Extracted Text";
  title.style.margin = "0";
  title.style.fontSize = "16px";
  title.style.fontWeight = "bold";

  // Create text container
  const textContainer = document.createElement("div");
  textContainer.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
  textContainer.style.padding = "10px";
  textContainer.style.borderRadius = "4px";
  textContainer.style.maxHeight = "300px";
  textContainer.style.overflowY = "auto";
  textContainer.style.whiteSpace = "pre-wrap";
  textContainer.style.fontFamily = "monospace";
  textContainer.textContent = ocrData.text || "No text extracted";

  // Create buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.style.display = "flex";
  buttonsContainer.style.gap = "10px";
  buttonsContainer.style.marginTop = "10px";

  // Create save button
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.style.padding = "8px 16px";
  saveBtn.style.backgroundColor = "#0060df";
  saveBtn.style.color = "white";
  saveBtn.style.border = "none";
  saveBtn.style.borderRadius = "4px";
  saveBtn.style.cursor = "pointer";
  saveBtn.addEventListener("click", () => {
    console.log("Save button clicked");

    // Disable all buttons to prevent multiple clicks
    saveBtn.disabled = true;
    copyBtn.disabled = true;
    debugBtn.disabled = true;
    closeBtn.disabled = true;

    // Send save message
    browser.runtime
      .sendMessage({
        action: "saveOCRData",
        ocrData: {
          text: ocrData.text || "No text extracted",
          imageData: imageData,
          metadata: {
            width,
            height,
            timestamp: new Date().toISOString(),
          },
        },
      })
      .then(() => {
        // Show success message
        saveBtn.textContent = "Saved!";

        // Remove the result dialog directly instead of using cleanup
        setTimeout(() => {
          console.log("Removing result dialog after save");
          if (resultDialog && resultDialog.parentNode) {
            try {
              resultDialog.parentNode.removeChild(resultDialog);
              resultDialog = null;

              // Reset capturing flag to allow new captures
              isCapturing = false;
              console.log("Result dialog removed and capture flag reset");
            } catch (e) {
              console.error("Error removing result dialog:", e);
            }
          }
        }, 1000);
      })
      .catch((error) => {
        console.error("Error saving OCR data:", error);
        // Re-enable buttons if there's an error
        saveBtn.disabled = false;
        copyBtn.disabled = false;
        debugBtn.disabled = false;
        closeBtn.disabled = false;
      });
  });

  // Create copy button
  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy Text";
  copyBtn.style.padding = "8px 16px";
  copyBtn.style.backgroundColor = "#e0e0e6";
  copyBtn.style.color = "#0c0c0d";
  copyBtn.style.border = "none";
  copyBtn.style.borderRadius = "4px";
  copyBtn.style.cursor = "pointer";
  copyBtn.addEventListener("click", () => {
    // Copy text to clipboard
    navigator.clipboard
      .writeText(ocrData.text || "")
      .then(() => {
        // Show success message
        const copiedText = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = copiedText;
        }, 1500);
      })
      .catch((error) => {
        console.error("Error copying text:", error);
      });
  });

  // Create debug button
  const debugBtn = document.createElement("button");
  debugBtn.textContent = "Debug Info";
  debugBtn.style.padding = "8px 16px";
  debugBtn.style.backgroundColor = "#e0e0e6";
  debugBtn.style.color = "#0c0c0d";
  debugBtn.style.border = "none";
  debugBtn.style.borderRadius = "4px";
  debugBtn.style.cursor = "pointer";
  debugBtn.addEventListener("click", () => {
    // Show debug info
    showDebugInfo(ocrData, imageData);
  });

  // Create close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.padding = "8px 16px";
  closeBtn.style.backgroundColor = "#e0e0e6";
  closeBtn.style.color = "#0c0c0d";
  closeBtn.style.border = "none";
  closeBtn.style.borderRadius = "4px";
  closeBtn.style.cursor = "pointer";
  closeBtn.addEventListener("click", () => {
    console.log("Close button clicked");

    // Disable all buttons to prevent multiple clicks
    saveBtn.disabled = true;
    copyBtn.disabled = true;
    debugBtn.disabled = true;
    closeBtn.disabled = true;

    // Remove the result dialog directly instead of using full cleanup
    if (resultDialog && resultDialog.parentNode) {
      try {
        resultDialog.parentNode.removeChild(resultDialog);
        resultDialog = null;

        // Reset capturing flag to allow new captures
        isCapturing = false;
        console.log("Result dialog removed and capture flag reset");
      } catch (e) {
        console.error("Error removing result dialog:", e);
      }
    }
  });

  // Append elements
  buttonsContainer.appendChild(saveBtn);
  buttonsContainer.appendChild(copyBtn);
  buttonsContainer.appendChild(debugBtn);
  buttonsContainer.appendChild(closeBtn);
  resultDialog.appendChild(title);
  resultDialog.appendChild(textContainer);
  resultDialog.appendChild(buttonsContainer);
  document.body.appendChild(resultDialog);
}

// Function to show debug info
function showDebugInfo(ocrData, imageData) {
  // Create debug dialog
  const debugDialog = document.createElement("div");
  debugDialog.style.position = "fixed";
  debugDialog.style.top = "50%";
  debugDialog.style.left = "50%";
  debugDialog.style.transform = "translate(-50%, -50%)";
  debugDialog.style.width = "80%";
  debugDialog.style.maxWidth = "800px";
  debugDialog.style.maxHeight = "80vh";
  debugDialog.style.overflowY = "auto";
  debugDialog.style.padding = "20px";
  debugDialog.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
  debugDialog.style.color = "#00ff00";
  debugDialog.style.borderRadius = "4px";
  debugDialog.style.fontFamily = "monospace";
  debugDialog.style.fontSize = "14px";
  debugDialog.style.zIndex = "2147483647";
  debugDialog.style.display = "flex";
  debugDialog.style.flexDirection = "column";
  debugDialog.style.gap = "15px";

  // Create title
  const title = document.createElement("h3");
  title.textContent = "OCR Debug Information";
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.style.fontWeight = "bold";
  title.style.color = "white";

  // Create API response section
  const responseSection = document.createElement("div");
  responseSection.style.display = "flex";
  responseSection.style.flexDirection = "column";
  responseSection.style.gap = "5px";

  const responseTitle = document.createElement("h4");
  responseTitle.textContent = "API Response:";
  responseTitle.style.margin = "0";
  responseTitle.style.fontSize = "16px";
  responseTitle.style.color = "white";

  const responseContent = document.createElement("pre");
  responseContent.style.backgroundColor = "#1a1a1a";
  responseContent.style.padding = "10px";
  responseContent.style.borderRadius = "4px";
  responseContent.style.maxHeight = "200px";
  responseContent.style.overflowY = "auto";
  responseContent.style.whiteSpace = "pre-wrap";
  responseContent.style.wordBreak = "break-all";
  responseContent.textContent = JSON.stringify(ocrData, null, 2);

  responseSection.appendChild(responseTitle);
  responseSection.appendChild(responseContent);

  // Create image data section
  const imageSection = document.createElement("div");
  imageSection.style.display = "flex";
  imageSection.style.flexDirection = "column";
  imageSection.style.gap = "5px";

  const imageTitle = document.createElement("h4");
  imageTitle.textContent = "Image Preview:";
  imageTitle.style.margin = "0";
  imageTitle.style.fontSize = "16px";
  imageTitle.style.color = "white";

  const imagePreview = document.createElement("img");
  imagePreview.src = `data:image/jpeg;base64,${imageData}`;
  imagePreview.style.maxWidth = "100%";
  imagePreview.style.maxHeight = "200px";
  imagePreview.style.border = "1px solid #333";
  imagePreview.style.borderRadius = "4px";

  imageSection.appendChild(imageTitle);
  imageSection.appendChild(imagePreview);

  // Create close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close Debug Info";
  closeBtn.style.padding = "8px 16px";
  closeBtn.style.backgroundColor = "#e0e0e6";
  closeBtn.style.color = "#0c0c0d";
  closeBtn.style.border = "none";
  closeBtn.style.borderRadius = "4px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.alignSelf = "flex-end";
  closeBtn.addEventListener("click", () => {
    document.body.removeChild(debugDialog);
  });

  // Append elements
  debugDialog.appendChild(title);
  debugDialog.appendChild(responseSection);
  debugDialog.appendChild(imageSection);
  debugDialog.appendChild(closeBtn);
  document.body.appendChild(debugDialog);
}

// Function to clean up
function cleanup() {
  console.log("Cleaning up screenshot capture...");

  try {
    // Remove event listeners
    document.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("keydown", handleKeyDown);

    // Safely remove elements
    function safeRemove(element) {
      if (element && element.parentNode) {
        try {
          element.parentNode.removeChild(element);
        } catch (e) {
          console.error("Error removing element:", e);
        }
      }
    }

    safeRemove(overlay);
    safeRemove(selectionBox);
    safeRemove(instructions);
    safeRemove(confirmDialog);
    safeRemove(resultDialog);

    // Reset variables
    overlay = null;
    selectionBox = null;
    instructions = null;
    confirmDialog = null;
    resultDialog = null;
    isSelecting = false;

    // Reset capturing flag to allow new captures
    isCapturing = false;

    console.log("Cleanup complete");
  } catch (error) {
    console.error("Error during cleanup:", error);
    // Make sure capturing flag is reset even if there's an error
    isCapturing = false;
  }
}

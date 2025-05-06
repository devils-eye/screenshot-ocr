# Screenshot OCR Firefox Extension

A Firefox extension that allows you to capture screenshots of specific areas on your screen and extract text using Mistral AI's OCR capabilities.

## Features

- Capture screenshots of selected areas on any webpage
- Extract text from screenshots using Mistral AI's OCR
- Store and manage extracted text and images
- Edit, organize, and search through your OCR data
- Export your data for backup or further processing

## Installation

### Development Installation

1. Clone this repository or download the source code
2. Open Firefox and navigate to `about:debugging`
3. Click on "This Firefox"
4. Click on "Load Temporary Add-on..."
5. Select any file in the extension directory (e.g., `manifest.json`)

### Production Installation

Once the extension is published to the Firefox Add-ons store, you can install it directly from there.

## Usage

### Setting up

1. After installing the extension, click on the extension icon in the toolbar
2. Click on "Set API Key" and enter your Mistral AI API key
   - You can obtain an API key from [Mistral AI's website](https://mistral.ai/)

### Capturing Screenshots and Extracting Text

1. Navigate to any webpage
2. Click on the extension icon in the toolbar
3. Click on "Capture Screenshot"
4. Click and drag to select the area you want to capture
5. The extension will automatically extract text from the selected area
6. Review the extracted text and click "Save" to store it

### Managing OCR Data

1. Click on the extension icon in the toolbar
2. Click on "Manage OCR Data"
3. Use the management page to:
   - View all your saved OCR data
   - Search through your data
   - Edit titles and extracted text
   - Delete unwanted items
   - Export your data

## Privacy and Security

- Your API key and OCR data are stored locally in your browser
- Screenshots and extracted text are not sent to any server other than Mistral AI's OCR API
- The extension requires minimal permissions to function

## Development

### Project Structure

```
screenshot_ocr/
├── manifest.json           # Extension manifest
├── background.js           # Background script for handling API calls
├── popup/                  # Popup UI files
├── content_scripts/        # Content scripts for capturing screenshots
├── options/                # Options/management page files
└── icons/                  # Extension icons
```

### Building and Testing

1. Make your changes to the source code
2. Load the extension in Firefox using the development installation steps
3. Test your changes
4. Package the extension for distribution

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Mistral AI](https://mistral.ai/) for providing the OCR API
- [Mozilla Firefox](https://www.mozilla.org/firefox/) for the WebExtensions API

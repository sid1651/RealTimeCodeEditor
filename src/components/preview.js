import React from "react";

const Preview = ({ htmlCode, cssCode, jsCode }) => {
  const openPreview = () => {
    // Combine all 3 codes into a single HTML template
    const previewWindow = window.open("", "_blank"); // open in new tab
    previewWindow.document.open();
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Live Preview</title>
        <style>
          ${cssCode || ""}
        </style>
      </head>
      <body>
        ${htmlCode || ""}
        <script>
          ${jsCode || ""}
        </script>
      </body>
      </html>
    `);
    previewWindow.document.close();
  };

  return (
    <button 
      onClick={openPreview} 
      className="preview"
      
    >Preview
      
    </button>
  );
};

export default Preview;

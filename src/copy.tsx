import { Form, ActionPanel, Action, showToast, Toast, open } from "@raycast/api";
import fs from "fs";
import path from "path";
import { useState } from "react";

interface FormValues {
  sourceDir: string;
  destDir: string;
  filePattern: string;
}

export default function Command() {
  const [sourceDir, setSourceDir] = useState<string>("");
  const [destDir, setDestDir] = useState<string>("");

  async function handleSubmit(values: FormValues) {
    if (!sourceDir || !destDir) {
      showToast(Toast.Style.Failure, "Please select both source and destination directories");
      return;
    }

    try {
      // Get files matching pattern or copy all if no pattern
      const filePattern = values.filePattern.trim();
      const sourceFiles = fs.readdirSync(sourceDir);

      let filesToCopy = sourceFiles;
      if (filePattern) {
        const regex = new RegExp(filePattern);
        filesToCopy = sourceFiles.filter(file => regex.test(file));
      }

      if (filesToCopy.length === 0) {
        showToast(Toast.Style.Failure, "No files match the pattern");
        return;
      }

      // Copy files
      let copyCount = 0;
      for (const fileName of filesToCopy) {
        const sourcePath = path.join(sourceDir, fileName);
        const destPath = path.join(destDir, fileName);

        // Skip if it's a directory
        if (fs.statSync(sourcePath).isDirectory()) continue;

        fs.copyFileSync(sourcePath, destPath);
        copyCount++;
      }

      showToast(Toast.Style.Success, `${copyCount} files copied successfully`);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to copy files", String(error));
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Copy files from source directory to destination directory." />

      <Form.TextField
        id="sourceDir"
        title="Source Directory"
        placeholder="Select source directory"
        value={sourceDir}
        onChange={setSourceDir}
      />
      <Form.TextField
        id="destDir"
        title="Destination Directory"
        placeholder="Select destination directory"
        value={destDir}
        onChange={setDestDir}
      />
      <Form.TextField
        id="filePattern"
        title="File Pattern (RegExp)"
        placeholder="Leave blank to copy all files"
      />
    </Form>
  );
}

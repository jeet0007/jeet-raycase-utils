import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { useState } from "react";
import { homedir } from "node:os";

interface FilePattern {
  id: string;
  pattern: string;
}

interface FormValues {
  sourceDir: string;
  destDir: string;
}

export default function Command() {
  const [sourceDir, setSourceDir] = useState<string>(homedir());
  const [destDir, setDestDir] = useState<string>(homedir());
  const [filePatterns, setFilePatterns] = useState<FilePattern[]>([{ id: "1", pattern: "" }]);
  const [sourceDirError, setSourceDirError] = useState<string | undefined>();
  const [destDirError, setDestDirError] = useState<string | undefined>();

  const updateFilePattern = (id: string, newPattern: string) => {
    setFilePatterns(
      filePatterns.map(pattern =>
        pattern.id === id ? { ...pattern, pattern: newPattern } : pattern
      )
    );
  };

  const validateDirectory = (path: string): boolean => {
    try {
      return fs.existsSync(path) && fs.statSync(path).isDirectory();
    } catch (error) {
      return false;
    }
  };

  const handleSourceDirChange = (value: string) => {
    setSourceDir(value);
    if (!validateDirectory(value)) {
      setSourceDirError("Directory doesn't exist");
    } else {
      setSourceDirError(undefined);
    }
  };

  const handleDestDirChange = (value: string) => {
    setDestDir(value);
    if (!validateDirectory(value)) {
      setDestDirError("Directory doesn't exist");
    } else {
      setDestDirError(undefined);
    }
  };

  async function handleSubmit(values: FormValues) {
    // Validate both directories exist
    if (!validateDirectory(sourceDir)) {
      showToast(Toast.Style.Failure, "Source directory doesn't exist or is invalid");
      return;
    }

    if (!validateDirectory(destDir)) {
      showToast(Toast.Style.Failure, "Destination directory doesn't exist or is invalid");
      return;
    }

    try {
      // Get all files from source directory
      const sourceFiles = fs.readdirSync(sourceDir);

      // Create a set to track unique files to copy (avoid duplicates)
      const uniqueFilesToCopy = new Set<string>();

      // Process each pattern
      const activePatterns = filePatterns.filter(p => p.pattern.trim() !== "");

      if (activePatterns.length === 0) {
        // If no patterns specified, copy all files
        sourceFiles.forEach(file => {
          if (!fs.statSync(path.join(sourceDir, file)).isDirectory()) {
            uniqueFilesToCopy.add(file);
          }
        });
      } else {
        // For each pattern, find matching files
        for (const patternObj of activePatterns) {
          try {
            const regex = new RegExp(patternObj.pattern);
            const matchingFiles = sourceFiles.filter(file => regex.test(file));

            // Add matching files to the set
            matchingFiles.forEach(file => {
              if (!fs.statSync(path.join(sourceDir, file)).isDirectory()) {
                uniqueFilesToCopy.add(file);
              }
            });
          } catch (regexError) {
            showToast(Toast.Style.Failure, `Invalid regular expression: ${patternObj.pattern}`);
            return;
          }
        }
      }

      if (uniqueFilesToCopy.size === 0) {
        showToast(Toast.Style.Failure, "No files match the patterns");
        return;
      }

      // Copy files
      let copyCount = 0;
      const failedFiles: string[] = [];

      for (const fileName of uniqueFilesToCopy) {
        try {
          const sourcePath = path.join(sourceDir, fileName);
          const destPath = path.join(destDir, fileName);

          fs.copyFileSync(sourcePath, destPath);
          copyCount++;
        } catch (fileError) {
          failedFiles.push(fileName);
        }
      }

      if (failedFiles.length > 0) {
        showToast(
          Toast.Style.Warning,
          `Copied ${copyCount} files, but ${failedFiles.length} files failed`,
          `Failed files: ${failedFiles.slice(0, 3).join(", ")}${failedFiles.length > 3 ? "..." : ""}`
        );
      } else {
        showToast(Toast.Style.Success, `${copyCount} files copied successfully`);
      }
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to copy files", String(error));
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
          <Action title="Add Another File" onAction={() => setFilePatterns([...filePatterns, { id: String(filePatterns.length + 1), pattern: "" }])} />
        </ActionPanel>
      }
    >
      <Form.Description text="Copy files from source directory to destination directory using multiple patterns." />

      <Form.TextField
        id="sourceDir"
        title="Source Directory"
        placeholder="Enter source directory path"
        value={sourceDir}
        onChange={handleSourceDirChange}
        error={sourceDirError}
      />

      <Form.TextField
        id="destDir"
        title="Destination Directory"
        placeholder="Enter destination directory path"
        value={destDir}
        onChange={handleDestDirChange}
        error={destDirError}
      />

      <Form.Separator />

      <Form.Description text="Enter regular expressions to match files (leave blank to copy all files)" />

      {filePatterns.map((pattern, index) => (
        <Form.TextField
          key={pattern.id}
          id={`filePattern-${pattern.id}`}
          title={`File Pattern ${index + 1}`}
          placeholder="Regular expression (e.g., \.js$)"
          value={pattern.pattern}
          onChange={(newValue) => updateFilePattern(pattern.id, newValue)}
          info="Regular expression to match file names"
          error={pattern.pattern ? undefined : undefined}
        />
      ))}

      <Form.Separator />
    </Form>
  );
}

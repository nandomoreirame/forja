use serde::Serialize;
use std::fs;
use std::path::Path;

/// Response structure for read_file_command
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    /// Absolute path to the file
    pub path: String,
    /// File contents as UTF-8 string
    pub content: String,
    /// File size in bytes
    pub size: u64,
}

/// Tauri command to read file contents with size validation
///
/// # Arguments
/// * `path` - Absolute or relative path to the file
/// * `max_size_mb` - Optional maximum file size in MB (default: 10MB)
///
/// # Returns
/// * `Ok(FileContent)` - File was read successfully
/// * `Err(String)` - Error message describing the failure
#[tauri::command]
pub fn read_file_command(path: String, max_size_mb: Option<u64>) -> Result<FileContent, String> {
    let max_size_bytes = max_size_mb.unwrap_or(10) * 1024 * 1024;
    let file_path = Path::new(&path);

    // Check if path exists
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    // Check if path is a file (not a directory)
    if !file_path.is_file() {
        return Err(format!("Path is not a file: {}", path));
    }

    // Get file metadata for size check
    let metadata = fs::metadata(file_path)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;

    let file_size = metadata.len();

    // Validate file size
    if file_size > max_size_bytes {
        return Err(format!(
            "File size ({} bytes) exceeds maximum allowed size ({} MB)",
            file_size,
            max_size_mb.unwrap_or(10)
        ));
    }

    // Read file contents
    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    Ok(FileContent {
        path: file_path
            .canonicalize()
            .unwrap_or_else(|_| file_path.to_path_buf())
            .to_string_lossy()
            .to_string(),
        content,
        size: file_size,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::{NamedTempFile, TempDir};

    #[test]
    fn test_read_file_success() {
        // Create a temporary file with known content
        let mut temp_file = NamedTempFile::new().expect("Failed to create temp file");
        let test_content = "Hello, Forja!\nThis is a test file.";
        temp_file
            .write_all(test_content.as_bytes())
            .expect("Failed to write to temp file");

        let file_path = temp_file.path().to_string_lossy().to_string();

        // Read the file
        let result = read_file_command(file_path.clone(), None);

        assert!(result.is_ok());
        let file_content = result.unwrap();
        assert_eq!(file_content.content, test_content);
        assert_eq!(file_content.size, test_content.len() as u64);
        assert!(file_content.path.contains(&temp_file.path().file_name().unwrap().to_string_lossy().to_string()));
    }

    #[test]
    fn test_read_file_not_found() {
        let result = read_file_command("/nonexistent/file.txt".to_string(), None);

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("File not found"));
    }

    #[test]
    fn test_read_directory_instead_of_file() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let dir_path = temp_dir.path().to_string_lossy().to_string();

        let result = read_file_command(dir_path, None);

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Path is not a file"));
    }

    #[test]
    fn test_read_file_size_exceeded_default() {
        // Create a file larger than 10MB
        let mut temp_file = NamedTempFile::new().expect("Failed to create temp file");

        // Write 11MB of data (10MB default + 1MB)
        let chunk_size = 1024 * 1024; // 1MB
        let chunk = vec![b'A'; chunk_size];

        for _ in 0..11 {
            temp_file
                .write_all(&chunk)
                .expect("Failed to write to temp file");
        }
        temp_file.flush().expect("Failed to flush temp file");

        let file_path = temp_file.path().to_string_lossy().to_string();

        let result = read_file_command(file_path, None);

        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("exceeds maximum allowed size"));
        assert!(error_msg.contains("10 MB"));
    }

    #[test]
    fn test_read_file_size_exceeded_custom_limit() {
        // Create a file with 2MB of data
        let mut temp_file = NamedTempFile::new().expect("Failed to create temp file");

        let chunk_size = 1024 * 1024; // 1MB
        let chunk = vec![b'B'; chunk_size];

        for _ in 0..2 {
            temp_file
                .write_all(&chunk)
                .expect("Failed to write to temp file");
        }
        temp_file.flush().expect("Failed to flush temp file");

        let file_path = temp_file.path().to_string_lossy().to_string();

        // Set limit to 1MB - should fail
        let result = read_file_command(file_path, Some(1));

        assert!(result.is_err());
        let error_msg = result.unwrap_err();
        assert!(error_msg.contains("exceeds maximum allowed size"));
        assert!(error_msg.contains("1 MB"));
    }

    #[test]
    fn test_read_file_within_custom_limit() {
        // Create a file with 1MB of data
        let mut temp_file = NamedTempFile::new().expect("Failed to create temp file");

        let chunk = vec![b'C'; 1024 * 1024]; // 1MB
        temp_file
            .write_all(&chunk)
            .expect("Failed to write to temp file");
        temp_file.flush().expect("Failed to flush temp file");

        let file_path = temp_file.path().to_string_lossy().to_string();

        // Set limit to 2MB - should succeed
        let result = read_file_command(file_path, Some(2));

        assert!(result.is_ok());
        let file_content = result.unwrap();
        assert_eq!(file_content.size, 1024 * 1024);
    }

    #[test]
    fn test_read_empty_file() {
        let temp_file = NamedTempFile::new().expect("Failed to create temp file");
        let file_path = temp_file.path().to_string_lossy().to_string();

        let result = read_file_command(file_path, None);

        assert!(result.is_ok());
        let file_content = result.unwrap();
        assert_eq!(file_content.content, "");
        assert_eq!(file_content.size, 0);
    }

    #[test]
    fn test_read_file_with_unicode() {
        let mut temp_file = NamedTempFile::new().expect("Failed to create temp file");
        let test_content = "Hello, Mundo! 你好世界 🚀";
        temp_file
            .write_all(test_content.as_bytes())
            .expect("Failed to write to temp file");

        let file_path = temp_file.path().to_string_lossy().to_string();

        let result = read_file_command(file_path, None);

        assert!(result.is_ok());
        let file_content = result.unwrap();
        assert_eq!(file_content.content, test_content);
    }
}

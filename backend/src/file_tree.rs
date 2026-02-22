use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
    pub extension: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryTree {
    pub root: FileNode,
}

pub fn read_directory_tree(path: &str, max_depth: usize) -> Result<DirectoryTree, String> {
    let root_path = Path::new(path);

    if !root_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if !root_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let root_node = build_tree_node(root_path, max_depth, 0)?;
    Ok(DirectoryTree { root: root_node })
}

fn should_skip(name: &str) -> bool {
    matches!(name, "node_modules" | "target" | ".git")
        || name.starts_with('.')
}

fn build_tree_node(path: &Path, max_depth: usize, current_depth: usize) -> Result<FileNode, String> {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let path_str = path.to_str().unwrap_or("").to_string();
    let is_dir = path.is_dir();
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_string());

    let children = if is_dir && current_depth < max_depth {
        let mut child_nodes = Vec::new();

        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();

                if let Some(file_name) = entry_path.file_name().and_then(|n| n.to_str()) {
                    if should_skip(file_name) {
                        continue;
                    }
                }

                if let Ok(child_node) = build_tree_node(&entry_path, max_depth, current_depth + 1) {
                    child_nodes.push(child_node);
                }
            }
        }

        // Sort: directories first, then alphabetically
        child_nodes.sort_by(|a, b| {
            match (a.is_dir, b.is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            }
        });

        Some(child_nodes)
    } else {
        None
    };

    Ok(FileNode {
        name,
        path: path_str,
        is_dir,
        children,
        extension,
    })
}

#[tauri::command]
pub fn read_directory_tree_command(path: String, max_depth: Option<usize>) -> Result<DirectoryTree, String> {
    let depth = max_depth.unwrap_or(3);
    read_directory_tree(&path, depth)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_read_directory_tree() {
        let temp = tempfile::TempDir::new().unwrap();
        let root = temp.path();

        fs::create_dir(root.join("src")).unwrap();
        fs::write(root.join("src/main.rs"), "fn main() {}").unwrap();
        fs::write(root.join("README.md"), "# Test").unwrap();

        let tree = read_directory_tree(root.to_str().unwrap(), 2).unwrap();

        assert!(tree.root.is_dir);
        assert!(tree.root.children.is_some());

        let children = tree.root.children.unwrap();
        assert!(children.iter().any(|n| n.name == "src"));
        assert!(children.iter().any(|n| n.name == "README.md"));
    }

    #[test]
    fn test_skips_hidden_and_node_modules() {
        let temp = tempfile::TempDir::new().unwrap();
        let root = temp.path();

        fs::create_dir(root.join("src")).unwrap();
        fs::create_dir(root.join(".git")).unwrap();
        fs::create_dir(root.join("node_modules")).unwrap();
        fs::write(root.join(".hidden"), "secret").unwrap();

        let tree = read_directory_tree(root.to_str().unwrap(), 2).unwrap();
        let children = tree.root.children.unwrap();

        assert!(children.iter().any(|n| n.name == "src"));
        assert!(!children.iter().any(|n| n.name == ".git"));
        assert!(!children.iter().any(|n| n.name == "node_modules"));
        assert!(!children.iter().any(|n| n.name == ".hidden"));
    }

    #[test]
    fn test_sorts_dirs_first() {
        let temp = tempfile::TempDir::new().unwrap();
        let root = temp.path();

        fs::write(root.join("z_file.txt"), "").unwrap();
        fs::create_dir(root.join("a_dir")).unwrap();
        fs::write(root.join("a_file.txt"), "").unwrap();

        let tree = read_directory_tree(root.to_str().unwrap(), 2).unwrap();
        let children = tree.root.children.unwrap();

        assert_eq!(children[0].name, "a_dir");
        assert!(children[0].is_dir);
    }

    #[test]
    fn test_nonexistent_path() {
        let result = read_directory_tree("/nonexistent/path", 2);
        assert!(result.is_err());
    }
}

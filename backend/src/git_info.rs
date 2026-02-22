use serde::Serialize;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitInfo {
    pub is_git_repo: bool,
    pub branch: Option<String>,
    pub file_status: Option<String>,
    pub changed_files: u32,
}

#[tauri::command]
pub fn get_git_info_command(file_path: String) -> Result<GitInfo, String> {
    let path = Path::new(&file_path);
    let dir = if path.is_file() {
        path.parent().unwrap_or(path)
    } else {
        path
    };

    // Check if inside a git repository
    let is_git = Command::new("git")
        .args(["rev-parse", "--is-inside-work-tree"])
        .current_dir(dir)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !is_git {
        return Ok(GitInfo {
            is_git_repo: false,
            branch: None,
            file_status: None,
            changed_files: 0,
        });
    }

    let branch = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(dir)
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8(o.stdout)
                    .ok()
                    .map(|s| s.trim().to_string())
            } else {
                None
            }
        })
        .filter(|s| !s.is_empty());

    let file_status = Command::new("git")
        .args(["status", "--porcelain", "--", &file_path])
        .current_dir(dir)
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                let output = String::from_utf8(o.stdout).ok()?;
                let line = output.trim();
                if line.is_empty() {
                    None
                } else {
                    Some(line[..2].trim().to_string())
                }
            } else {
                None
            }
        });

    let changed_files = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(dir)
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8(o.stdout)
                    .ok()
                    .map(|s| s.lines().filter(|l| !l.is_empty()).count() as u32)
            } else {
                Some(0)
            }
        })
        .unwrap_or(0);

    Ok(GitInfo {
        is_git_repo: true,
        branch,
        file_status,
        changed_files,
    })
}

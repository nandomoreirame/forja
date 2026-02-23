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

    // Single combined command: --branch gives us branch info + porcelain status
    let output = Command::new("git")
        .args(["status", "--porcelain", "--branch"])
        .current_dir(dir)
        .output();

    let output = match output {
        Ok(o) if o.status.success() => {
            String::from_utf8(o.stdout).unwrap_or_default()
        }
        _ => {
            return Ok(GitInfo {
                is_git_repo: false,
                branch: None,
                file_status: None,
                changed_files: 0,
            });
        }
    };

    let mut lines = output.lines();

    // First line: ## branch...tracking or ## HEAD (detached)
    let branch = lines
        .next()
        .and_then(|l| l.strip_prefix("## "))
        .map(|b| {
            // Split on "..." to remove tracking info
            b.split("...").next().unwrap_or(b).to_string()
        })
        .filter(|s| !s.is_empty() && s != "HEAD (no branch)");

    let status_lines: Vec<&str> = lines.filter(|l| !l.is_empty()).collect();
    let changed_files = status_lines.len() as u32;

    // Find status for the specific file
    let file_status = status_lines
        .iter()
        .find(|line| {
            let file_part = if line.len() > 3 { &line[3..] } else { "" };
            file_part == file_path || file_path.ends_with(file_part)
        })
        .map(|line| line[..2].trim().to_string());

    Ok(GitInfo {
        is_git_repo: true,
        branch,
        file_status,
        changed_files,
    })
}

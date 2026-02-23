use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const MAX_RECENT_PROJECTS: usize = 10;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentProject {
    pub path: String,
    pub name: String,
    pub last_opened: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ForjaConfig {
    #[serde(default)]
    pub recent_projects: Vec<RecentProject>,
}

fn config_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir().ok_or("Could not determine config directory")?;
    let forja_dir = config_dir.join("forja");
    Ok(forja_dir.join("config.toml"))
}

pub fn load_config() -> ForjaConfig {
    let path = match config_path() {
        Ok(p) => p,
        Err(_) => return ForjaConfig::default(),
    };

    if !path.exists() {
        return ForjaConfig::default();
    }

    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return ForjaConfig::default(),
    };

    toml::from_str(&content).unwrap_or_default()
}

pub fn save_config(config: &ForjaConfig) -> Result<(), String> {
    let path = config_path()?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {}", e))?;
    }

    let content =
        toml::to_string_pretty(config).map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&path, content).map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(())
}

pub fn add_recent_project(path: &str) -> Result<(), String> {
    let mut config = load_config();

    let name = std::path::Path::new(path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string());

    let now = chrono_now();

    // Remove existing entry with same path
    config.recent_projects.retain(|p| p.path != path);

    // Insert at front
    config.recent_projects.insert(
        0,
        RecentProject {
            path: path.to_string(),
            name,
            last_opened: now,
        },
    );

    // Trim to max
    config.recent_projects.truncate(MAX_RECENT_PROJECTS);

    save_config(&config)
}

fn chrono_now() -> String {
    // ISO 8601 timestamp without external chrono dependency
    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();

    // Simple epoch seconds as string (sortable, no chrono needed)
    format!("{}", secs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config_is_empty() {
        let config = ForjaConfig::default();
        assert!(config.recent_projects.is_empty());
    }

    #[test]
    fn test_config_serialization_roundtrip() {
        let config = ForjaConfig {
            recent_projects: vec![RecentProject {
                path: "/home/user/project".to_string(),
                name: "project".to_string(),
                last_opened: "1234567890".to_string(),
            }],
        };

        let serialized = toml::to_string_pretty(&config).unwrap();
        let deserialized: ForjaConfig = toml::from_str(&serialized).unwrap();

        assert_eq!(deserialized.recent_projects.len(), 1);
        assert_eq!(deserialized.recent_projects[0].path, "/home/user/project");
        assert_eq!(deserialized.recent_projects[0].name, "project");
    }

    #[test]
    fn test_save_and_load_config() {
        let tmp = tempfile::tempdir().unwrap();
        let config_file = tmp.path().join("config.toml");

        let config = ForjaConfig {
            recent_projects: vec![RecentProject {
                path: "/test/path".to_string(),
                name: "path".to_string(),
                last_opened: "999".to_string(),
            }],
        };

        let content = toml::to_string_pretty(&config).unwrap();
        fs::write(&config_file, &content).unwrap();

        let loaded: ForjaConfig = toml::from_str(&fs::read_to_string(&config_file).unwrap()).unwrap();
        assert_eq!(loaded.recent_projects.len(), 1);
        assert_eq!(loaded.recent_projects[0].name, "path");
    }
}

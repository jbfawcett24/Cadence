#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::import_score_file,
            commands::delete_score_file,
            commands::resolve_score_file,
            commands::load_library,
            commands::save_library,
            commands::load_setlists,
            commands::save_setlists,
            commands::load_annotations,
            commands::save_annotations,
            commands::link_audio_file,
            commands::load_audio_link,
            commands::delete_audio_link,
            commands::load_settings,
            commands::save_settings,
            commands::check_audio_link,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod commands {
    use std::{
        fs,
        path::{Path, PathBuf},
    };

    use infer::get_from_path;
    use serde::{Deserialize, Serialize};
    use tauri::{AppHandle, Manager};
    use uuid::Uuid;

    #[derive(Debug, Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct ManagedScoreFile {
        pub managed_path: String,
        pub original_path: String,
        pub format: String,
    }

    #[derive(Debug, Deserialize, Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct AudioLink {
        pub score_id: String,
        pub path: String,
        pub format: String,
        pub created_at: String,
        pub updated_at: String,
    }

    fn storage_path(app: &AppHandle, filename: &str) -> Result<PathBuf, String> {
        let directory = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?;
        fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
        Ok(directory.join(filename))
    }

    fn load_json(app: &AppHandle, filename: &str) -> Result<Option<String>, String> {
        let path = storage_path(app, filename)?;
        match fs::read_to_string(path) {
            Ok(contents) => Ok(Some(contents)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(error.to_string()),
        }
    }

    fn save_json(app: &AppHandle, filename: &str, contents: String) -> Result<(), String> {
        let path = storage_path(app, filename)?;
        let temporary_path = path.with_extension("json.tmp");
        fs::write(&temporary_path, contents).map_err(|error| error.to_string())?;
        replace_file(temporary_path, path)
    }

    fn replace_file(temporary_path: PathBuf, path: PathBuf) -> Result<(), String> {
        #[cfg(windows)]
        {
            // Windows does not allow rename() to replace an existing file. Move the
            // old file aside first so the replacement remains recoverable if it fails.
            let backup_path = path.with_extension("json.bak");
            if backup_path.exists() {
                fs::remove_file(&backup_path).map_err(|error| error.to_string())?;
            }

            if path.exists() {
                fs::rename(&path, &backup_path).map_err(|error| error.to_string())?;
            }

            match fs::rename(&temporary_path, &path) {
                Ok(()) => {
                    if backup_path.exists() {
                        // The new file is already in place. A cleanup failure must not
                        // turn a successful save into an apparent persistence failure.
                        let _ = fs::remove_file(backup_path);
                    }
                    Ok(())
                }
                Err(error) => {
                    if backup_path.exists() {
                        let _ = fs::rename(&backup_path, &path);
                    }
                    Err(error.to_string())
                }
            }
        }

        #[cfg(not(windows))]
        {
            fs::rename(temporary_path, path).map_err(|error| error.to_string())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::{detect_audio_format, replace_file};
        use std::{
            fs,
            time::{SystemTime, UNIX_EPOCH},
        };

        #[test]
        fn replacement_overwrites_existing_file() {
            let unique = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system clock should be after the Unix epoch")
                .as_nanos();
            let directory = std::env::temp_dir().join(format!("score-library-{unique}"));
            fs::create_dir_all(&directory).expect("temporary directory should be created");

            let path = directory.join("library.json");
            let temporary_path = directory.join("library.json.tmp");
            fs::write(&path, "old").expect("old file should be written");
            fs::write(&temporary_path, "new").expect("temporary file should be written");

            replace_file(temporary_path, path.clone()).expect("replacement should succeed");

            assert_eq!(
                fs::read_to_string(path).expect("replacement should exist"),
                "new"
            );
            fs::remove_dir_all(directory).expect("temporary directory should be removed");
        }

        #[test]
        fn detects_wav_and_mp3_headers() {
            let unique = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system clock should be after the Unix epoch")
                .as_nanos();
            let directory = std::env::temp_dir().join(format!("audio-detection-{unique}"));
            fs::create_dir_all(&directory).expect("temporary directory should be created");

            let wav_path = directory.join("audio.bin");
            let mut wav_header = b"RIFF".to_vec();
            wav_header.extend_from_slice(&[0; 4]);
            wav_header.extend_from_slice(b"WAVE");
            fs::write(&wav_path, wav_header).expect("WAV fixture should be written");
            assert_eq!(
                detect_audio_format(&wav_path).expect("WAV should be readable"),
                Some("wav")
            );

            let mp3_path = directory.join("audio.dat");
            fs::write(&mp3_path, b"ID3\x04\x00\x00").expect("MP3 fixture should be written");
            assert_eq!(
                detect_audio_format(&mp3_path).expect("MP3 should be readable"),
                Some("mp3")
            );

            let invalid_path = directory.join("audio.txt");
            fs::write(&invalid_path, b"not audio").expect("invalid fixture should be written");
            assert_eq!(
                detect_audio_format(&invalid_path).expect("file should be readable"),
                None
            );

            fs::remove_dir_all(directory).expect("temporary directory should be removed");
        }
    }

    fn validate_id(id: &str) -> Result<(), String> {
        if id.is_empty()
            || !id.chars().all(|character| {
                character.is_ascii_alphanumeric() || character == '-' || character == '_'
            })
        {
            return Err("invalid identifier".to_string());
        }
        Ok(())
    }

    fn score_directory(app: &AppHandle) -> Result<PathBuf, String> {
        let directory = storage_path(app, "scores.json")?.with_file_name("scores");
        fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
        Ok(directory)
    }

    fn score_format(extension: &str) -> Option<&'static str> {
        match extension.to_ascii_lowercase().as_str() {
            "pdf" => Some("pdf"),
            "xml" | "musicxml" | "mxl" => Some("musicxml"),
            _ => None,
        }
    }

    fn detect_audio_format(path: &Path) -> Result<Option<&'static str>, String> {
        let kind = get_from_path(path).map_err(|error| error.to_string())?;
        Ok(kind.and_then(|kind| match kind.extension() {
            "mp3" => Some("mp3"),
            "wav" => Some("wav"),
            _ => None,
        }))
    }

    #[tauri::command]
    pub fn import_score_file(
        app: AppHandle,
        source_path: String,
    ) -> Result<ManagedScoreFile, String> {
        let source = Path::new(&source_path);
        if !source.is_file() {
            return Err("score file does not exist".to_string());
        }

        let extension = source
            .extension()
            .and_then(|value| value.to_str())
            .ok_or_else(|| "score file has no supported extension".to_string())?;
        let format =
            score_format(extension).ok_or_else(|| "unsupported score format".to_string())?;
        let score_id = format!("score-{}", Uuid::new_v4().simple());
        let destination = score_directory(&app)?.join(format!("{score_id}.{extension}"));
        fs::copy(source, &destination).map_err(|error| error.to_string())?;

        Ok(ManagedScoreFile {
            managed_path: destination.to_string_lossy().into_owned(),
            original_path: source_path,
            format: format.to_string(),
        })
    }

    #[tauri::command]
    pub fn resolve_score_file(app: AppHandle, score_id: String) -> Result<String, String> {
        validate_id(&score_id)?;
        let directory = score_directory(&app)?;
        for entry in fs::read_dir(directory).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if path.file_stem().and_then(|value| value.to_str()) == Some(score_id.as_str()) {
                return Ok(path.to_string_lossy().into_owned());
            }
        }
        Err("managed score file was not found".to_string())
    }

    #[tauri::command]
    pub fn delete_score_file(app: AppHandle, score_id: String) -> Result<(), String> {
        validate_id(&score_id)?;
        let directory = score_directory(&app)?;
        for entry in fs::read_dir(directory).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if path.file_stem().and_then(|value| value.to_str()) == Some(score_id.as_str()) {
                fs::remove_file(path).map_err(|error| error.to_string())?;
                return Ok(());
            }
        }
        Ok(())
    }

    #[tauri::command]
    pub fn load_library(app: AppHandle) -> Result<Option<String>, String> {
        load_json(&app, "library.json")
    }

    #[tauri::command]
    pub fn save_library(app: AppHandle, contents: String) -> Result<(), String> {
        validate_json_array(&contents, "library")?;
        save_json(&app, "library.json", contents)
    }

    #[tauri::command]
    pub fn load_setlists(app: AppHandle) -> Result<Option<String>, String> {
        load_json(&app, "setlists.json")
    }

    #[tauri::command]
    pub fn save_setlists(app: AppHandle, contents: String) -> Result<(), String> {
        validate_json_array(&contents, "setlists")?;
        save_json(&app, "setlists.json", contents)
    }

    #[tauri::command]
    pub fn load_annotations(app: AppHandle, score_id: String) -> Result<Option<String>, String> {
        validate_id(&score_id)?;
        load_json(&app, &format!("annotations-{score_id}.json"))
    }

    #[tauri::command]
    pub fn save_annotations(
        app: AppHandle,
        score_id: String,
        contents: String,
    ) -> Result<(), String> {
        validate_id(&score_id)?;
        validate_json(&contents, "annotations")?;
        save_json(&app, &format!("annotations-{score_id}.json"), contents)
    }

    #[tauri::command]
    pub fn link_audio_file(
        app: AppHandle,
        score_id: String,
        path: String,
        created_at: String,
        updated_at: String,
    ) -> Result<AudioLink, String> {
        validate_id(&score_id)?;
        let audio_path = Path::new(&path);
        if !audio_path.is_file() {
            return Err("audio file does not exist".to_string());
        }
        let format = detect_audio_format(audio_path)?
            .ok_or_else(|| "unsupported or invalid audio file".to_string())?;
        let link = AudioLink {
            score_id: score_id.clone(),
            path,
            format: format.to_string(),
            created_at,
            updated_at,
        };
        save_json(
            &app,
            &format!("audio-{score_id}.json"),
            serde_json::to_string_pretty(&link).map_err(|error| error.to_string())?,
        )?;
        Ok(link)
    }

    #[tauri::command]
    pub fn load_audio_link(app: AppHandle, score_id: String) -> Result<Option<String>, String> {
        validate_id(&score_id)?;
        load_json(&app, &format!("audio-{score_id}.json"))
    }

    #[tauri::command]
    pub fn delete_audio_link(app: AppHandle, score_id: String) -> Result<(), String> {
        validate_id(&score_id)?;
        let path = storage_path(&app, &format!("audio-{score_id}.json"))?;
        match fs::remove_file(path) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(error.to_string()),
        }
    }

    #[tauri::command]
    pub fn load_settings(app: AppHandle) -> Result<Option<String>, String> {
        load_json(&app, "settings.json")
    }

    #[tauri::command]
    pub fn save_settings(app: AppHandle, contents: String) -> Result<(), String> {
        validate_json(&contents, "settings")?;
        save_json(&app, "settings.json", contents)
    }

    fn validate_json(contents: &str, kind: &str) -> Result<(), String> {
        serde_json::from_str::<serde_json::Value>(contents)
            .map(|_| ())
            .map_err(|error| format!("invalid {kind} JSON: {error}"))
    }

    fn validate_json_array(contents: &str, kind: &str) -> Result<(), String> {
        serde_json::from_str::<serde_json::Value>(contents)
            .map_err(|error| format!("invalid {kind} JSON: {error}"))
            .and_then(|value| {
                if value.is_array() {
                    Ok(())
                } else {
                    Err(format!("{kind} JSON must be an array"))
                }
            })
    }

    #[tauri::command]
    pub fn check_audio_link(path: String) -> Option<String> {
        detect_audio_format(Path::new(&path))
            .ok()
            .flatten()
            .map(str::to_string)
    }
}

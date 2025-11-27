#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::sync::{Arc, Mutex};

struct BackendProcess {
    process: Option<std::process::Child>,
}

impl BackendProcess {
    fn new() -> Self {
        Self { process: None }
    }

    fn start(&mut self) -> Result<(), String> {
        if self.process.is_some() {
            return Ok(());
        }

        let backend_path = if cfg!(debug_assertions) {
            let mut path = std::env::current_dir()
                .map_err(|e| format!("Failed to get current directory: {}", e))?;
            if path.ends_with("src-tauri") {
                path.pop();
            }
            path.push("backend");
            path.push("bin");
            #[cfg(target_os = "windows")]
            {
                path.push("nebula-backend.exe");
            }
            #[cfg(not(target_os = "windows"))]
            {
                path.push("nebula-backend");
            }
            path
        } else {
            // Em produção, o backend está no mesmo diretório do executável
            // (incluído via externalBin no tauri.conf.json)
            // Tauri 2.0 adiciona sufixo de arquitetura: nebula-backend-{target-triple}
            let exe_path = std::env::current_exe()
                .map_err(|e| format!("Failed to get executable path: {}", e))?;
            let exe_dir = exe_path.parent()
                .ok_or_else(|| "Failed to get executable directory".to_string())?;
            
            #[cfg(target_os = "windows")]
            {
                // Windows: nebula-backend-x86_64-pc-windows-msvc.exe
                let with_suffix = exe_dir.join("nebula-backend-x86_64-pc-windows-msvc.exe");
                if with_suffix.exists() {
                    with_suffix
                } else {
                    // Fallback para nome sem sufixo (compatibilidade)
                    exe_dir.join("nebula-backend.exe")
                }
            }
            #[cfg(target_os = "linux")]
            {
                // Linux: nebula-backend-x86_64-unknown-linux-gnu
                let with_suffix = exe_dir.join("nebula-backend-x86_64-unknown-linux-gnu");
                if with_suffix.exists() {
                    with_suffix
                } else {
                    // Fallback para nome sem sufixo (compatibilidade)
                    exe_dir.join("nebula-backend")
                }
            }
            #[cfg(not(any(target_os = "windows", target_os = "linux")))]
            {
                exe_dir.join("nebula-backend")
            }
        };

        if !backend_path.exists() {
            return Err(format!("Backend binary not found at: {:?}", backend_path));
        }

        let mut cmd = Command::new(&backend_path);
        cmd.env("NEBULA_ADDR", "127.0.0.1:8080");
        
        if cfg!(debug_assertions) {
            cmd.env("NEBULA_DEV", "true");
            cmd.stdout(std::process::Stdio::inherit());
            cmd.stderr(std::process::Stdio::inherit());
        } else {
            cmd.stdout(std::process::Stdio::null());
            cmd.stderr(std::process::Stdio::null());
        }

        let child = cmd.spawn().map_err(|e| format!("Failed to start backend: {}", e))?;
        self.process = Some(child);
        Ok(())
    }

    fn stop(&mut self) {
        if let Some(mut child) = self.process.take() {
            // Tentar shutdown graceful primeiro - aguardar até 3 segundos
            let timeout = std::time::Duration::from_secs(3);
            let start = std::time::Instant::now();
            
            // No Windows, child.kill() envia um sinal de término
            // O backend deve receber e fazer shutdown graceful
            let _ = child.kill();
            
            // Aguardar o processo terminar
            while start.elapsed() < timeout {
                match child.try_wait() {
                    Ok(Some(_)) => return, // Processo terminou
                    Ok(None) => {
                        std::thread::sleep(std::time::Duration::from_millis(100));
                        continue;
                    }
                    Err(_) => break, // Erro ao verificar
                }
            }
            
            // Se ainda estiver rodando após timeout, forçar wait
            let _ = child.wait();
        }
    }
}

#[tauri::command]
fn get_backend_url() -> String {
    "http://127.0.0.1:8080".to_string()
}

#[tauri::command]
fn get_api_key() -> Result<String, String> {
    use std::fs;
    use std::path::PathBuf;
    
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME").map(|h| format!("{}/.config", h)))
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let key_path = PathBuf::from(app_data).join("Nebula").join(".api_key");
    
    if !key_path.exists() {
        return Err("API Key not found. Backend may not be running.".to_string());
    }
    
    fs::read_to_string(&key_path)
        .map(|s| s.trim().to_string())
        .map_err(|e| format!("Failed to read API key: {}", e))
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    Ok(())
}

fn main() {
    let backend_state = Arc::new(Mutex::new(BackendProcess::new()));
    let backend_state_clone = backend_state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(move |_app| {
            if let Err(e) = backend_state.lock().unwrap().start() {
                eprintln!("Failed to start backend: {}", e);
            }
            Ok(())
        })
        .on_window_event(move |_app, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                backend_state_clone.lock().unwrap().stop();
            }
        })
        .invoke_handler(tauri::generate_handler![get_backend_url, get_api_key, open_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

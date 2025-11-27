# Nebula

Cross-platform desktop application for downloading files via magnet links.

## About

Nebula is a modern and professional tool for managing torrent downloads, offering an intuitive interface, speed control, file selection, and real-time monitoring.

## Features

- Download torrents via magnet links and .torrent files
- Analyze and select files before downloading
- Real-time progress monitoring
- Download and upload speed control
- Pause and resume downloads
- History and favorites
- Automatic magnet link detection from clipboard

## Technologies

- **Frontend**: React 19, TypeScript 5.7, Vite 6.0, TailwindCSS 4.1
- **Backend**: Go 1.25, Chi Router, anacrolix/torrent
- **Desktop**: Tauri 2.9.3 (Rust)

## Installation

### Windows

Download the `.msi` or `.exe` installer from the [releases](https://github.com/Wesllen-Vinicius/nebula/releases) page.

### Linux

**AppImage:**
```bash
chmod +x nebula.AppImage
./nebula.AppImage
```

**Debian (.deb):**
```bash
sudo dpkg -i nebula.deb
sudo apt install -f
```

## Development

```bash
# Clone repository
git clone https://github.com/Wesllen-Vinicius/nebula.git
cd nebula

# Install dependencies
cd frontend && npm install && cd ..
npm install

# Build backend
cd backend
go build -ldflags="-s -w" -o bin/nebula-backend.exe .  # Windows
# go build -ldflags="-s -w" -o bin/nebula-backend .     # Linux

# Run in development mode
cd .. && npm run tauri:dev
```

### Production Build

```bash
npm run tauri:build
```

Generated files in `src-tauri/target/release/bundle/`:
- Windows: `msi/*.msi`, `nsis/*.exe`
- Linux: `appimage/*.AppImage`, `deb/*.deb`

## Project Structure

```
nebula/
├── backend/          # Go Backend (API and download logic)
├── frontend/         # React Frontend (Interface)
└── src-tauri/        # Tauri Application (Desktop)
```

## Backend API

REST API at `http://127.0.0.1:8080`. OpenAPI documentation in `backend/api/openapi.yaml`.

**Main endpoints:**
- `POST /api/magnet/analyze` - Analyze magnet link
- `POST /api/magnet/download` - Start download
- `GET /api/download` - List downloads
- `POST /api/download/{id}/pause` - Pause download
- `POST /api/download/{id}/resume` - Resume download
- `DELETE /api/download/{id}` - Cancel download
- `GET /api/progress` - SSE for real-time progress

## Configuration

Configuration saved in `%APPDATA%\Nebula\config.json` (Windows) or `~/.config/nebula/config.json` (Linux).

## Security

- API Key automatically generated on first run
- Authentication required in production
- Rate limiting per IP and globally
- Strict input validation (path traversal prevention)

## Legal Notice and Responsibility

**IMPORTANT**: This application is a technical tool for downloading files via the BitTorrent protocol. The use of this application is entirely the user's responsibility.

- The user is solely responsible for the content they download and share through this application
- It is mandatory to respect copyright and intellectual property laws in your country
- Downloading and sharing copyright-protected content without authorization is illegal in many countries
- The developers of this application are not responsible for misuse of the tool
- This application does not promote, encourage, or facilitate piracy or copyright infringement
- Use this tool only to download content that you have legal permission to download

By using this application, you agree to use it legally and ethically, assuming full responsibility for your actions.

## Contributing

1. Fork the project
2. Create a branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

Report issues or suggest features in [Issues](https://github.com/Wesllen-Vinicius/nebula/issues).


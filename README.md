# Nebula

Aplicação desktop multiplataforma para download de arquivos via links magnéticos (magnet links).

> 🇺🇸 [English](README.en.md) | 🇧🇷 Português

## Sobre

Nebula é uma ferramenta moderna e profissional para gerenciar downloads de torrents, oferecendo interface intuitiva, controle de velocidade, seleção de arquivos e monitoramento em tempo real.

## Funcionalidades

- Download de torrents via links magnéticos e arquivos .torrent
- Análise e seleção de arquivos antes do download
- Monitoramento de progresso em tempo real
- Controle de velocidade de download e upload
- Pausar e retomar downloads
- Histórico e favoritos
- Detecção automática de links magnéticos na área de transferência

## Tecnologias

- **Frontend**: React 19, TypeScript 5.7, Vite 6.0, TailwindCSS 4.1
- **Backend**: Go 1.25, Chi Router, anacrolix/torrent
- **Desktop**: Tauri 2.9.3 (Rust)

## Instalação

### Windows

Baixe o instalador `.msi` ou `.exe` na página de [releases](https://github.com/Wesllen-Vinicius/nebula/releases).

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

## Desenvolvimento

```bash
# Clonar repositório
git clone https://github.com/Wesllen-Vinicius/nebula.git
cd nebula

# Instalar dependências
cd frontend && npm install && cd ..
npm install

# Build do backend
cd backend
go build -ldflags="-s -w" -o bin/nebula-backend.exe .  # Windows
# go build -ldflags="-s -w" -o bin/nebula-backend .     # Linux

# Executar em desenvolvimento
cd .. && npm run tauri:dev
```

### Build de Produção

```bash
npm run tauri:build
```

Arquivos gerados em `src-tauri/target/release/bundle/`:
- Windows: `msi/*.msi`, `nsis/*.exe`
- Linux: `appimage/*.AppImage`, `deb/*.deb`

## Estrutura do Projeto

```
nebula/
├── backend/          # Backend Go (API e lógica de download)
├── frontend/         # Frontend React (Interface)
└── src-tauri/        # Aplicação Tauri (Desktop)
```

## API Backend

API REST em `http://127.0.0.1:8080`. Documentação OpenAPI em `backend/api/openapi.yaml`.

**Endpoints principais:**
- `POST /api/magnet/analyze` - Analisar link magnético
- `POST /api/magnet/download` - Iniciar download
- `GET /api/download` - Listar downloads
- `POST /api/download/{id}/pause` - Pausar download
- `POST /api/download/{id}/resume` - Retomar download
- `DELETE /api/download/{id}` - Cancelar download
- `GET /api/progress` - SSE para progresso em tempo real

## Configuração

Configuração salva em `%APPDATA%\Nebula\config.json` (Windows) ou `~/.config/nebula/config.json` (Linux).

## Segurança

- API Key gerada automaticamente na primeira execução
- Autenticação obrigatória em produção
- Rate limiting por IP e global
- Validação rigorosa de inputs (prevenção de path traversal)

## Aviso Legal e Responsabilidade

**IMPORTANTE**: Esta aplicação é uma ferramenta técnica para download de arquivos via protocolo BitTorrent. O uso desta aplicação é de total responsabilidade do usuário.

- O usuário é o único responsável pelo conteúdo que baixa e compartilha através desta aplicação
- É obrigatório respeitar os direitos autorais e as leis de propriedade intelectual do seu país
- O download e compartilhamento de conteúdo protegido por direitos autorais sem autorização é ilegal em muitos países
- Os desenvolvedores desta aplicação não se responsabilizam pelo uso indevido da ferramenta
- Esta aplicação não promove, incentiva ou facilita a pirataria ou violação de direitos autorais
- Use esta ferramenta apenas para baixar conteúdo que você tem permissão legal para baixar

Ao usar esta aplicação, você concorda em utilizá-la de forma legal e ética, assumindo toda a responsabilidade por suas ações.

## Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## Suporte

Reporte problemas ou sugira funcionalidades em [Issues](https://github.com/Wesllen-Vinicius/nebula/issues).

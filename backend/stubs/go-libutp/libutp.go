// Stub para go-libutp - substitui a implementação C original
// Este módulo evita erros de compilação C no Windows e funciona em todas as plataformas
// O uTP está desabilitado no código principal (cfg.DisableUTP = true), então o stub não é usado
package libutp

// Este é um stub vazio que não requer código C
// Funciona tanto com CGO habilitado quanto desabilitado
// As funções são stubs vazios que não fazem nada, já que uTP não será usado

import (
	"io"
	"net"
)

// Socket representa um socket uTP (stub)
type Socket struct{}

// FirewallCallback é um tipo de callback para firewall (stub)
type FirewallCallback func(net.Addr) bool

// Option é um tipo para opções de configuração (stub)
type Option func(*Socket)

// WithLogger retorna uma opção para configurar logger (stub)
func WithLogger(logger io.Writer) Option {
	return func(s *Socket) {}
}

// NewSocket cria um novo socket uTP (stub)
// Compatível com anacrolix/torrent v1.54.0 que chama com (network, address, callback)
// Retorna (*Socket, error) como esperado
func NewSocket(network, address string, callback FirewallCallback) (*Socket, error) {
	// Stub vazio - uTP está desabilitado, então não faz nada
	return &Socket{}, nil
}

// Close fecha o socket (stub)
func (s *Socket) Close() error {
	return nil
}

// Listen retorna um listener uTP (stub)
func (s *Socket) Listen(network, address string) (net.Listener, error) {
	return nil, nil
}

// Dial cria uma conexão uTP (stub)
func (s *Socket) Dial(network, address string) (net.Conn, error) {
	return nil, nil
}

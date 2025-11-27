// Stub para go-libutp - substitui a implementação C original
// Este módulo evita erros de compilação C no Windows e funciona em todas as plataformas
// O uTP está desabilitado no código principal (cfg.DisableUTP = true), então o stub não é usado
package libutp

// Este é um stub vazio que não requer código C
// Funciona tanto com CGO habilitado quanto desabilitado
// As funções são stubs vazios que não fazem nada, já que uTP não será usado

import (
	"net"
)

// Socket representa um socket uTP (stub)
type Socket struct{}

// FirewallCallback é um tipo de callback para firewall (stub)
type FirewallCallback func(net.Addr) bool

// Option é um tipo para opções de configuração (stub)
type Option func(*Socket)

// WithLogger retorna uma opção para configurar logger (stub)
// Aceita interface{} para compatibilidade com diferentes tipos de logger
func WithLogger(logger interface{}) Option {
	return func(s *Socket) {}
}

// NewSocket cria um novo socket uTP (stub)
// Assinatura: NewSocket(network, addr string, opts ...Option)
// Compatível com anacrolix/torrent v1.54.0
func NewSocket(network, addr string, opts ...Option) (*Socket, error) {
	s := &Socket{}
	// Ignora network e addr (stub vazio - uTP desabilitado)
	_ = network
	_ = addr
	
	// Processa opções se houver
	for _, opt := range opts {
		opt(s)
	}
	
	return s, nil
}

// Close fecha o socket (stub)
func (s *Socket) Close() error {
	return nil
}

// Accept aceita uma conexão uTP (stub)
// Necessário para implementar a interface utpSocket
func (s *Socket) Accept() (net.Conn, error) {
	return nil, nil
}

// Addr retorna o endereço do socket (stub)
// Necessário para implementar a interface utpSocket
func (s *Socket) Addr() net.Addr {
	return nil
}

// SetSyncFirewallCallback define o callback de firewall (stub)
// Necessário para implementar a interface utpSocket
func (s *Socket) SetSyncFirewallCallback(callback FirewallCallback) {
	// Stub vazio - não faz nada
}

// Listen retorna um listener uTP (stub)
func (s *Socket) Listen(network, address string) (net.Listener, error) {
	return nil, nil
}

// Dial cria uma conexão uTP (stub)
func (s *Socket) Dial(network, address string) (net.Conn, error) {
	return nil, nil
}

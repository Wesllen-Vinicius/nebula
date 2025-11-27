// Stub para go-libutp - substitui a implementação C original
// Este módulo evita erros de compilação C no Windows e funciona em todas as plataformas
// O uTP está desabilitado no código principal (cfg.DisableUTP = true), então o stub não é usado
package libutp

// Este é um stub vazio que não requer código C
// Funciona tanto com CGO habilitado quanto desabilitado
// As funções são stubs vazios que não fazem nada, já que uTP não será usado

// Socket representa um socket uTP (stub)
type Socket struct{}

// NewSocket cria um novo socket uTP (stub)
func NewSocket() *Socket {
	return &Socket{}
}

// Close fecha o socket (stub)
func (s *Socket) Close() error {
	return nil
}


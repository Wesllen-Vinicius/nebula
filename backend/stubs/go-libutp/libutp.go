// +build !cgo

// Stub para go-libutp quando CGO está desabilitado
// Este módulo substitui o go-libutp original para evitar erros de compilação C
package libutp

// Este é um stub vazio que não requer código C
// O uTP está desabilitado no código principal (cfg.DisableUTP = true)
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


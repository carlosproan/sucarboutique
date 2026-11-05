# Favoritos de looks com IA

## O que será construído
- Permitir guardar cada look recomendado por IA como favorito e retirar o favorito quando desejado.
- Mostrar favoritos já guardados na página Looks, mesmo após sair e voltar, com imagem, detalhes, preço total e ação para copiar novamente a legenda para WhatsApp.

## Como será feito
- Criar uma tabela de favoritos ligada à loja, com snapshot das peças e políticas que limitam leitura, gravação e remoção à dona da loja.
- Usar funções protegidas para guardar, carregar e remover favoritos; ao guardar, validar as peças no stock da própria loja e recalcular o total no servidor.
- Atualizar a tela Looks com controlo de favorito e uma lista persistente de favoritos, mantendo o visual existente.
- Atualizar os tipos do banco e testar as regras de snapshot e total.

## Validação
- Executar os testes existentes e novos, conferir a compilação e verificar a tela no preview.

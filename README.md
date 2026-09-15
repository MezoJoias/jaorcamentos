# JA Orçamentos

Sistema interno de orçamentos da JA Artefatos em Ferro e Alumínio.

## O que esta versão tem
- Login com Supabase Auth.
- Dashboard com total de orçamentos, aprovados, valor proposto, valor aprovado e taxa de aprovação.
- Cadastro, edição e exclusão de materiais.
- Cadastro, edição e exclusão de clientes.
- Histórico de orçamentos por cliente.
- Novo orçamento com multiplicador padrão de 2,2×.
- Regra atual do Portão de correr conforme a fórmula definida pela JA.
- Lista de compra separada do consumo.
- Otimização de cortes das barras de 6 m, mostrando cortes por barra e sobra.
- Aviso quando um material necessário está sem preço.
- Histórico geral com filtros e status.
- WhatsApp.
- Impressão otimizada; no diálogo de impressão do navegador é possível escolher "Salvar como PDF".

## Regra do Portão de correr
- Tubo 30×30: 2 alturas + 2 larguras descontando 6 cm.
- Tubo 20×30: 2 alturas descontando 6 cm.
- Trilho: 2× a largura.
- Tela: 2,5 m de altura × largura.
- Rodinhas: 2 por portão.
- Bate-fecha / bico de papagaio: 1 por portão.
- Tubos são comprados em barras de 6 m e os cortes são organizados automaticamente.
- Preço final = custo dos materiais × multiplicador (padrão 2,2).

## Configuração do Supabase
1. Crie/abra o projeto no Supabase.
2. No SQL Editor, execute o arquivo `supabase.sql` atualizado.
3. Em Authentication > Users, crie o usuário que terá acesso ao sistema.
4. Configure o `.env` local usando `.env.example` como modelo.
5. Rode `npm install` e depois `npm run dev`.

### Importante
As políticas RLS desta versão permitem acesso somente a usuários autenticados. O arquivo `.env` não deve ser colocado no ZIP nem publicado no repositório.

## Vercel
O projeto já possui `vercel.json`, mas esta versão **não foi publicada**. Antes de publicar, configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no painel da Vercel e confirme as configurações de Auth/URLs do Supabase.

# Vi Rotina · GitHub Pages + Google Sheets

Versão preparada para migrar a interface do Vi Rotina para GitHub Pages e usar uma planilha privada do Google como armazenamento. **Não depende do login nem do banco do ChatGPT.**

## Estado desta entrega

- Código da integração e fluxo de publicação preparados.
- Testes automatizados de serialização, preservação de histórico, tipos de células, validação de backups, conflito de versões e resposta incerta da API.
- Site publicado no GitHub Pages. A validação de autenticação e gravação com a conta da proprietária é feita pela interface. Não há dados pessoais reais nesta cópia do código.

## Como o acesso funciona

A página estática pode ser visitada por qualquer pessoa que conheça seu endereço. **Os registros não são incluídos no site nem no repositório.** O aplicativo só busca a planilha após uma autorização Google. Uma pessoa que entre com outra conta usará a própria planilha; não recebe acesso à sua.

A planilha é criada no Google Drive da conta autorizada. Não há chamadas para publicá-la ou compartilhá-la. Mantenha o compartilhamento como **Restrito**. Se compartilhar a planilha manualmente, as pessoas autorizadas também poderão acessar os dados pelo Google.

O aplicativo pede apenas `https://www.googleapis.com/auth/drive.file`, que limita o acesso aos arquivos usados/criados por este aplicativo. Não usa chave de API, client secret ou conta de serviço. O ID público do cliente OAuth não é uma senha. O token temporário fica apenas na memória da página e é descartado ao sair; não é gravado no GitHub ou no armazenamento persistente do navegador.

## 1. Publicar no GitHub

1. Criar um repositório chamado `vi-rotina` na sua conta e enviar esta pasta para a branch `main`.
2. Não enviar backups, planilhas, dados exportados ou credenciais. O código foi separado desses dados.
3. Em **Settings → Pages → Build and deployment**, selecionar **GitHub Actions** como fonte.
4. Executar o workflow **Publicar Vi Rotina**, ou enviar um commit para `main`.
5. Esperar o workflow concluir. Usar o endereço exibido na execução concluída, sem presumir que o endereço já esteja publicado.

O GitHub Pages normalmente publica a interface na internet, mesmo quando o repositório é privado. A disponibilidade de Pages em repositórios privados depende do plano. Não alterar a visibilidade de um repositório existente sem revisar o conteúdo. Nesta arquitetura, a privacidade dos registros é controlada pelo Google, independentemente da visibilidade do código.

## 2. Configurar a autorização Google (uma vez)

1. No [Google Cloud Console](https://console.cloud.google.com/), criar ou selecionar um projeto dedicado ao Vi Rotina.
2. Em **APIs e serviços → Biblioteca**, ativar **Google Sheets API** e **Google Drive API**.
3. Em **Google Auth Platform**, configurar o nome do aplicativo e os dados de contato solicitados. Para uso pessoal, começar em modo de teste e adicionar sua conta como usuária de teste.
4. Em acesso a dados/escopos, incluir `https://www.googleapis.com/auth/drive.file`.
5. Criar um cliente OAuth do tipo **Aplicativo da Web**.
6. Em **Origens JavaScript autorizadas**, cadastrar a origem HTTPS exata do endereço publicado. Por exemplo, se a URL for `https://SEU-USUARIO.github.io/vi-rotina/`, a origem é `https://SEU-USUARIO.github.io`, sem caminho nem barra final. Para domínio personalizado, cadastrar sua origem também.
7. Copiar somente o **ID do cliente**, terminado em `.apps.googleusercontent.com`. Não copiar nem compartilhar o client secret.
8. No Vi Rotina, abrir **Configuração inicial do login**, colar esse ID público e salvar. A opção é pela interface e não exige editar o código. Alternativamente, o responsável técnico pode preencher o mesmo ID público em `config.js` para dispensar a configuração por dispositivo.
9. Tocar em **Conectar com Google**, escolher a conta configurada e autorizar o acesso descrito na tela do Google.
10. Se não houver planilha do aplicativo nessa conta, tocar em **Criar minha planilha privada**.

O app não contorna recusas do Google. Uma origem incorreta, API desativada ou conta fora da lista de teste precisa ser corrigida no projeto Google. As autorizações têm prazo e o Google pode solicitar nova autorização. Usar o botão de reconexão quando necessário.

## 3. Migrar os dados existentes

1. Abrir a versão atual do aplicativo, ainda publicada no ChatGPT.
2. Em **Ajustes → Exportar backup**, baixar o JSON dos registros atuais.
3. Entrar na versão do GitHub com a conta Google e criar/abrir sua planilha.
4. Em **Ajustes → Importar backup**, selecionar o JSON e confirmar a substituição.
5. Aguardar a mensagem **Salvo no Google Sheets · privado**.
6. Abrir a planilha, conferir amostras dos módulos e do histórico, fechar e abrir o site novamente e conferir a persistência.
7. Só encerrar o uso da versão anterior depois dessa verificação. Nenhum registro anterior foi transferido automaticamente nesta entrega.

## Organização dos dados e análises

| Aba | Conteúdo |
| --- | --- |
| Estado | Cópia de recuperação e revisão usadas pelo aplicativo. Não editar. |
| Rotina | Cadastro de tarefas, dias, horários, doses informadas e pausas. |
| Medicamentos | Cadastro dos medicamentos, doses informadas, horários e orientações. |
| Agendamentos | Consultas e exames, datas, locais, profissionais e situação. |
| Conclusoes | Uma linha por tarefa marcada, com data, horário e identificação. |
| Refeicoes | Data, horário, refeição, origem e descrição. |
| Metas | Unidade, objetivo, progresso e prazo. |
| Financas | Receitas, despesas, valores, datas e situação do pagamento. |
| Eventos | Registro de criações, edições, exclusões e marcações feitas nesta versão. |
| Progresso | Previstas, concluídas, pendentes e proporção por dia registrado. |

As abas são atualizadas em conjunto a cada salvamento. Use os registros para tabelas dinâmicas e gráficos em **novas abas**, preservadas pelo app. Edite cadastros pelo site: as abas de saída são espelhos analíticos e alterações manuais nelas serão substituídas na próxima sincronização. O app lê o estado de recuperação para restaurar os módulos.

### O que o progresso mede

No primeiro carregamento de cada dia conectado, o aplicativo registra uma fotografia das tarefas previstas para aquele dia. Essa fotografia é persistida junto ao próximo salvamento. O denominador não muda quando uma tarefa é posteriormente renomeada, excluída ou reagendada. Conclusões de tarefas removidas conservam o nome da fotografia quando ela existe.

Dias em que o aplicativo não foi aberto não têm planejamento registrado e não são tratados como falhas. Os backups antigos não contêm fotografias diárias: não é possível reconstruir com precisão quantas tarefas eram previstas em cada dia anterior. O histórico de conclusões existente continua disponível.

## Limites e recuperação

- Use **um dispositivo de cada vez**. O app verifica a revisão antes de escrever e alerta sobre uma mudança detectada. Sheets não oferece aqui uma transação de comparação e troca; duas gravações perfeitamente simultâneas ainda podem conflitar.
- Sem conexão ou com autorização expirada, o app mantém alterações apenas na memória da página, bloqueia novas edições e oferece reconexão e exportação de backup. Não feche a página antes de salvar/exportar.
- Se uma gravação tiver resposta incerta, o app tenta ler a revisão para confirmar se ela já foi concluída; não repete automaticamente a escrita.
- A sincronização regrava as projeções analíticas do app; há um limite preventivo de tamanho da requisição. Ao atingir esse limite, exporte os dados para ampliar a arquitetura antes de continuar. Nenhum histórico é truncado silenciosamente.
- Alertas continuam sendo avisos na página, com uma repetição após 5 minutos. Não há push com a tela bloqueada.
- A expiração de autorização pode exigir nova interação com o Google. O aplicativo não armazena refresh tokens.

## Validação antes de encerrar a migração

- [ ] Workflow GitHub concluído e URL publicada confirmada.
- [ ] Login com a conta Google autorizada funciona no Safari do iPhone.
- [ ] Planilha criada como restrita e com as dez abas do aplicativo.
- [ ] Uma tarefa marcada aparece em Conclusoes e Progresso.
- [ ] Um registro de refeição e um lançamento financeiro aparecem nas abas correspondentes.
- [ ] Fechar e reabrir o site recupera os dados após nova autorização.
- [ ] Outra conta Google não acessa os registros da conta original.
- [ ] Interrupção de rede oferece recuperação sem informar falso sucesso.
- [ ] Backup da versão anterior importado e conferido.

## Desenvolvimento

Sem instalação de dependências: `npm test` usa Node.js 22 ou superior. Sirva a pasta por HTTP para testes; módulos JavaScript não devem ser abertos por `file://`. A autenticação real exige uma origem cadastrada no cliente OAuth. Não use tokens de teste no código.

Documentação oficial:
- [GitHub Pages e visibilidade](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Google Identity Services: token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Escopos da API Sheets](https://developers.google.com/workspace/sheets/api/scopes)

## Atualização: Rotina e Saúde

A interface usa texto e cores discretas, sem emojis ou mensagens de autocuidado. Medicamentos existentes mantêm seus IDs e histórico, mas aparecem somente na aba **Saúde**, separados da Rotina. Consultas e exames possuem formulário próprio, data, horário, duração, profissional, local, observações e situação.

No primeiro acesso à atualização, o aplicativo inclui Almoço e Jantar diariamente, Academia de segunda a quinta e Missa aos domingos, sem duplicar cadastros com o mesmo nome. Os horários ficam em branco para você definir. As alterações são persistidas na planilha; a atualização não reinsere atividades excluídas posteriormente. O histórico de dias anteriores não é reescrito.

### Google Agenda

Cada consulta ou exame agendado possui o botão **Adicionar ao Google Agenda**. Ele abre o formulário do Google com título, data, horário e local, e você confirma o salvamento. As observações clínicas não são copiadas para a descrição do evento. A duração padrão é de 60 minutos e pode ser editada no cadastro. O horário é interpretado no fuso do dispositivo ao abrir o evento.

Esta etapa não usa a API Calendar e não pede novas permissões Google. Não é uma sincronização automática: editar, cancelar ou excluir no Vi Rotina não altera o evento já salvo no Google, e clicar mais de uma vez pode gerar duplicatas. Uma integração automática futura precisará ativar a Google Calendar API, obter consentimento adicional e conservar o ID de cada evento para atualizações.

### Onde trocar imagens

Envie seus arquivos para **assets/images/** no GitHub e configure os caminhos em **Ajustes → Imagens da interface**. Consulte [assets/images/README.md](assets/images/README.md) para exemplos. O workflow publica essa pasta automaticamente junto do aplicativo.

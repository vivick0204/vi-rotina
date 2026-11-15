# Imagens da interface

Envie aqui seus arquivos pelo GitHub: **Add file → Upload files**. Use nomes simples sem espaços ou acentos, como `logo.png`, `rotina.png` ou `saude.webp`.

No aplicativo, abra **Ajustes → Imagens da interface** e informe o caminho do arquivo no campo correspondente:

- Logo: `assets/images/logo.png`
- Rotina: `assets/images/rotina.png`
- Saúde: `assets/images/saude.webp`

O padrão da interface é texto, sem emojis ou imagens decorativas. Campos vazios mantêm essa apresentação. Os caminhos escolhidos são salvos na sua planilha e recuperados nos outros dispositivos.

Prefira PNG ou WebP, imagens quadradas e fundo transparente para a navegação. O aplicativo aceita também JPG, GIF e SVG. As imagens ficam públicas no repositório e no site.

A alternativa técnica é definir caminhos iniciais em `config.js`, no objeto opcional `images`, usando as chaves `logo`, `hoje`, `rotina`, `saude`, `refeicoes`, `metas`, `financeiro` e `ajustes`. As escolhas salvas pela interface têm prioridade.

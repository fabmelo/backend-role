# Segredos de desenvolvimento (keys)

Este diretório é destinado a armazenar segredos locais de desenvolvimento (ex.: JSON de Service Account do Firebase Admin).

## Importante

- O conteúdo aqui é ignorado pelo Git (.gitignore), exceto este README.
- NÃO comitar segredos.
- Preferir variáveis de ambiente (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) no arquivo backend/.env.
- Alternativamente, definir GOOGLE_APPLICATION_CREDENTIALS com o caminho ABSOLUTO para o JSON de Service Account.

## Exemplo de uso no .env (Windows)

GOOGLE_APPLICATION_CREDENTIALS=G:\ESTUDOS IA TRAE\role\backend\keys\service-account.

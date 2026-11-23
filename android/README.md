# APK Android — Elas+

Este repositório configura uma versão Android (APK) do site Elas+ com Capacitor.

## Como funciona
- O APK é um aplicativo Android que abre a versão web publicada em `https://elas-one.vercel.app`.
- O conteúdo e os recursos continuam sendo atualizados pela publicação web; não é uma cópia offline completa.
- O build é automatizado pelo GitHub Actions.

## Gerar o APK
1. Abra a aba **Actions** deste repositório.
2. Selecione **Build APK Elas+**.
3. Abra a execução mais recente concluída.
4. Na área **Artifacts**, baixe **ElasPlus-Android-APK**.
5. Extraia o arquivo ZIP e instale `app-debug.apk` no Android (talvez seja necessário autorizar instalação de apps de fontes externas).

## Observação
Este é um APK de teste/debug, não uma versão assinada para publicação na Play Store. O app precisa de conexão à internet para carregar o site.

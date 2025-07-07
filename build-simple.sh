#!/bin/bash

# Script simples para buildar APK debug
# Execute: ./build-simple.sh

echo "🔨 Iniciando build do APK debug..."

# Build do projeto
echo "📦 Fazendo build do projeto..."
npm run build

# Sincronizar com Capacitor
echo "🔄 Sincronizando com Capacitor..."
npx cap sync

# Navegar para android e fazer build
echo "🤖 Construindo APK Android..."
cd android
./gradlew clean
./gradlew assembleDebug

# Encontrar APK
APK_PATH=$(find . -name "*.apk" -path "*/debug/*" | head -1)
APK_FULL_PATH=$(realpath "$APK_PATH")

echo "✅ APK construído com sucesso!"
echo "📱 Local do APK: $APK_FULL_PATH"

# Voltar ao diretório original
cd ..

# Perguntar sobre instalação
echo ""
read -p "Instalar no dispositivo? (s/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "📱 Verificando dispositivos..."
    adb devices
    
    echo "🚀 Instalando APK..."
    adb install "$APK_FULL_PATH"
    
    echo "✅ Instalação concluída!"
else
    echo "ℹ️  APK disponível em: $APK_FULL_PATH"
fi

echo "🎉 Script concluído!"

#!/bin/bash

# Script para buildar e instalar APK debug do Ionic
# Autor: Script gerado automaticamente
# Data: $(date)

set -e  # Para no primeiro erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Função para verificar se um comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar dependências
print_info "Verificando dependências..."

if ! command_exists npm; then
    print_error "npm não encontrado. Instale o Node.js primeiro."
    exit 1
fi

if ! command_exists npx; then
    print_error "npx não encontrado. Instale o Node.js primeiro."
    exit 1
fi

print_success "Dependências verificadas"

# Diretório base do projeto
PROJECT_DIR=$(pwd)
print_info "Diretório do projeto: $PROJECT_DIR"

# Verificar se estamos no diretório correto
if [ ! -f "ionic.config.json" ]; then
    print_error "Este script deve ser executado no diretório raiz do projeto Ionic"
    exit 1
fi

# Passo 1: Build do projeto
print_info "Iniciando build do projeto..."
npm run build
print_success "Build concluído"

# Passo 2: Sincronizar com Capacitor
print_info "Sincronizando com Capacitor..."
npx cap sync
print_success "Sincronização concluída"

# Passo 3: Navegar para o diretório android e fazer build
print_info "Navegando para diretório android..."
cd android

# Verificar se o gradlew existe
if [ ! -f "./gradlew" ]; then
    print_error "Arquivo gradlew não encontrado no diretório android"
    exit 1
fi

# Tornar gradlew executável
chmod +x ./gradlew

print_info "Limpando projeto Android..."
./gradlew clean
print_success "Limpeza concluída"

print_info "Construindo APK debug..."
./gradlew assembleDebug
print_success "APK debug construído"

# Encontrar o APK gerado
APK_PATH=$(find . -name "*.apk" -path "*/debug/*" | head -1)

if [ -z "$APK_PATH" ]; then
    print_error "APK não encontrado após o build"
    exit 1
fi

# Converter para caminho absoluto
APK_FULL_PATH=$(realpath "$APK_PATH")
print_success "APK encontrado em: $APK_FULL_PATH"

# Voltar ao diretório do projeto
cd "$PROJECT_DIR"

# Perguntar se deseja instalar no dispositivo
echo ""
print_info "APK construído com sucesso!"
print_info "Local do APK: $APK_FULL_PATH"
echo ""

read -p "Deseja instalar em um dispositivo? (s/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    # Verificar se adb está disponível
    if ! command_exists adb; then
        print_error "ADB não encontrado. Instale o Android SDK primeiro."
        exit 1
    fi

    print_info "Verificando dispositivos conectados..."
    
    # Listar dispositivos
    adb devices
    
    # Verificar se há dispositivos conectados
    DEVICE_COUNT=$(adb devices | grep -c "device$" || true)
    
    if [ "$DEVICE_COUNT" -eq 0 ]; then
        print_warning "Nenhum dispositivo conectado encontrado."
        print_info "Certifique-se de que:"
        print_info "1. O dispositivo está conectado via USB"
        print_info "2. A depuração USB está habilitada"
        print_info "3. O dispositivo está autorizado para depuração"
        echo ""
        
        read -p "Deseja tentar novamente? (s/n): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            print_info "Aguarde a conexão do dispositivo..."
            adb wait-for-device
            print_success "Dispositivo conectado!"
        else
            print_info "Instalação cancelada. APK disponível em: $APK_FULL_PATH"
            exit 0
        fi
    fi
    
    # Instalar APK
    print_info "Instalando APK no dispositivo..."
    
    if adb install "$APK_FULL_PATH"; then
        print_success "APK instalado com sucesso!"
    else
        print_error "Falha na instalação do APK"
        print_info "Você pode instalar manualmente usando:"
        print_info "adb install \"$APK_FULL_PATH\""
        exit 1
    fi
    
    # Opcional: Iniciar o app
    echo ""
    read -p "Deseja iniciar o aplicativo no dispositivo? (s/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        # Extrair package name do AndroidManifest.xml
        PACKAGE_NAME=$(grep -o 'package="[^"]*"' android/app/src/main/AndroidManifest.xml | sed 's/package="//;s/"//')
        
        if [ -n "$PACKAGE_NAME" ]; then
            print_info "Iniciando aplicativo: $PACKAGE_NAME"
            adb shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1
            print_success "Aplicativo iniciado!"
        else
            print_warning "Não foi possível determinar o package name do aplicativo"
        fi
    fi
else
    print_info "Instalação cancelada. APK disponível em: $APK_FULL_PATH"
fi

echo ""
print_success "Script concluído!"
print_info "Resumo:"
print_info "- APK Debug: $APK_FULL_PATH"
print_info "- Para instalar manualmente: adb install \"$APK_FULL_PATH\""

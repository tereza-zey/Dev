cmake_minimum_required(VERSION 3.13)

# Définir la version de C++ à 17 de manière simple
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Définir les flags de compilation pour C++17
if(CMAKE_CXX_COMPILER_ID MATCHES "Clang" OR CMAKE_CXX_COMPILER_ID MATCHES "GNU")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++17")
endif()

# Désactiver les fonctionnalités C++20 problématiques
add_definitions(-DFOLLY_CFG_NO_COROUTINES=1)

# Projet principal
project(appmodules)

# Inclure les fichiers existants
include_directories(${CMAKE_CURRENT_SOURCE_DIR})

# Vous pouvez ajouter d'autres configurations spécifiques à votre projet ici 
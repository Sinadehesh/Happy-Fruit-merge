// Gem Jar for Android. Build with: python3 tools/build_gem_android.py (packs the game, then runs Gradle)
pluginManagement {
    repositories {
        google()
        // Google's mirror of Maven Central first: Maven Central limits busy shared networks (429)
        maven("https://maven-central.storage-download.googleapis.com/maven2/")
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        // Google's mirror of Maven Central first: Maven Central limits busy shared networks (429)
        maven("https://maven-central.storage-download.googleapis.com/maven2/")
        mavenCentral()
    }
}
rootProject.name = "GemJar"
include(":gemjar")

// The Android apps: Gem Jar (build with python3 tools/build_gem_android.py) and Zombie Bomber
// (python3 tools/build_bomber_android.py). Each script packs its game, then runs Gradle.
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
include(":bomber")

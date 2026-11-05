import java.util.Properties

plugins {
    id("com.android.application")
}

// AdMob IDs from admob.properties; Google's test IDs while they are empty (then only a test APK is made)
val admob = Properties().apply {
    val f = file("admob.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
fun admobId(key: String, testId: String): String = admob.getProperty(key)?.trim()?.takeIf { it.isNotEmpty() } ?: testId
val testAds = listOf("app_id", "interstitial_id", "banner_id", "rewarded_id").any { admob.getProperty(it).isNullOrBlank() }

android {
    namespace = "com.sinadehesh.gemjar"
    compileSdk = 36
    buildToolsVersion = "36.1.0"

    defaultConfig {
        applicationId = "com.sinadehesh.gemjar"
        minSdk = 24
        targetSdk = 36   // Google Play: new apps and updates must target Android 16 (API 36)
        versionCode = (findProperty("versionCode") as String?)?.toInt() ?: 1
        versionName = (findProperty("versionName") as String?) ?: "1.0"
        manifestPlaceholders["admobAppId"] = admobId("app_id", "ca-app-pub-3940256099942544~3347511713")
        buildConfigField("String", "INTERSTITIAL_ID", "\"" + admobId("interstitial_id", "ca-app-pub-3940256099942544/1033173712") + "\"")
        buildConfigField("String", "BANNER_ID", "\"" + admobId("banner_id", "ca-app-pub-3940256099942544/9214589741") + "\"")
        buildConfigField("String", "REWARDED_ID", "\"" + admobId("rewarded_id", "ca-app-pub-3940256099942544/5224354917") + "\"")
        buildConfigField("boolean", "TEST_ADS", testAds.toString())
    }

    buildFeatures {
        buildConfig = true
    }

    // the signing key comes from the environment and never lives in the repo
    signingConfigs {
        create("release") {
            storeFile = System.getenv("GEMJAR_KEYSTORE")?.let { file(it) }
            storePassword = System.getenv("GEMJAR_KEYSTORE_PASS")
            keyAlias = "gemjar"
            keyPassword = System.getenv("GEMJAR_KEYSTORE_PASS")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    // sources sit at the top of this folder; the packed game and icons are made by tools/build_gem_android.py
    sourceSets {
        getByName("main") {
            manifest.srcFile("AndroidManifest.xml")
            java.srcDirs("java")
            res.srcDirs("res", "../build/icons")
            assets.srcDirs("../build/assets")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("com.google.android.gms:play-services-ads:25.5.0")          // AdMob
    implementation("com.google.android.ump:user-messaging-platform:4.0.0")     // ad consent (EU/UK and other regions)
    implementation("com.android.billingclient:billing:9.1.0")                  // the "No Ads" purchase
}

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
val admobKeys = listOf("app_id", "banner_id", "interstitial_id", "rewarded_revive_id", "rewarded_double_id", "rewarded_coins_id", "rewarded_boost_id")
val testAds = admobKeys.any { admob.getProperty(it).isNullOrBlank() }
val testRewarded = "ca-app-pub-3940256099942544/5224354917"

android {
    namespace = "com.sinadehesh.zombiebomber"
    compileSdk = 36
    buildToolsVersion = "36.1.0"

    defaultConfig {
        applicationId = "com.sinadehesh.zombiebomber"
        minSdk = 24
        targetSdk = 36   // Google Play: new apps and updates must target Android 16 (API 36)
        versionCode = (findProperty("versionCode") as String?)?.toInt() ?: 1
        versionName = (findProperty("versionName") as String?) ?: "1.0"
        manifestPlaceholders["admobAppId"] = admobId("app_id", "ca-app-pub-3940256099942544~3347511713")
        buildConfigField("String", "BANNER_ID", "\"" + admobId("banner_id", "ca-app-pub-3940256099942544/9214589741") + "\"")
        buildConfigField("String", "INTERSTITIAL_ID", "\"" + admobId("interstitial_id", "ca-app-pub-3940256099942544/1033173712") + "\"")
        buildConfigField("String", "REWARDED_REVIVE_ID", "\"" + admobId("rewarded_revive_id", testRewarded) + "\"")
        buildConfigField("String", "REWARDED_DOUBLE_ID", "\"" + admobId("rewarded_double_id", testRewarded) + "\"")
        buildConfigField("String", "REWARDED_COINS_ID", "\"" + admobId("rewarded_coins_id", testRewarded) + "\"")
        buildConfigField("String", "REWARDED_BOOST_ID", "\"" + admobId("rewarded_boost_id", testRewarded) + "\"")
        buildConfigField("boolean", "TEST_ADS", testAds.toString())
    }

    buildFeatures {
        buildConfig = true
    }

    // The signing key comes from the environment and never lives in the repo. Zombie Bomber can have its
    // own (BOMBER_KEYSTORE, BOMBER_KEYSTORE_PASS, BOMBER_KEY_ALIAS) or share Gem Jar's upload key.
    signingConfigs {
        create("release") {
            val own = System.getenv("BOMBER_KEYSTORE")
            val pass = System.getenv("BOMBER_KEYSTORE_PASS") ?: System.getenv("GEMJAR_KEYSTORE_PASS")
            storeFile = (own ?: System.getenv("GEMJAR_KEYSTORE"))?.let { file(it) }
            storePassword = pass
            keyAlias = System.getenv("BOMBER_KEY_ALIAS") ?: if (own != null) "zombiebomber" else "gemjar"
            keyPassword = pass
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    // sources sit at the top of this folder; the packed game and icons are made by tools/build_bomber_android.py
    sourceSets {
        getByName("main") {
            manifest.srcFile("AndroidManifest.xml")
            java.srcDirs("java")
            res.srcDirs("res", "../build-bomber/icons")
            assets.srcDirs("../build-bomber/assets")
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

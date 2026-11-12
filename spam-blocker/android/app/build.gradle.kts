plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "app.ring.spamblocker"
    compileSdk = 34

    defaultConfig {
        applicationId = "app.ring.spamblocker"
        // ROLE_CALL_SCREENING (the role the screening flow requests) exists
        // since API 29, so 29 is the floor for the native layer.
        minSdk = 29
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

// No third-party dependencies: the app uses only the Android framework and
// the Kotlin standard library. In particular there is no analytics, no ads
// and no networking library — the app never sends data anywhere.
